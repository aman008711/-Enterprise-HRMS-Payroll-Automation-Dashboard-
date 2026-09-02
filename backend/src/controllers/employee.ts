import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Employee from '../models/Employee';
import User from '../models/User';
import { ErrorResponse } from '../middleware/error';
import { createAuditLog } from '../utils/audit';

// @desc    Get list of all employee profiles with populated relations
// @route   GET /api/employees
// @access  Private (Admin / HR Manager only)
export const getEmployees = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const employees = await Employee.find()
      .populate('user', 'email role')
      .populate('department', 'name code')
      .populate('manager', 'firstName lastName employeeId jobTitle')
      .lean();

    res.status(200).json({
      success: true,
      count: employees.length,
      data: employees
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Onboard a new employee (bind user credentials to employee profile details)
// @route   POST /api/employees
// @access  Private (Admin / HR Manager only)
export const onboardEmployee = async (req: Request, res: Response, next: NextFunction) => {
  const { userId, firstName, lastName, employeeId, phone, jobTitle, departmentId, managerId, baseSalary } = req.body;

  // Start Transaction Session to prevent database inconsistencies
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Verify target credentials account exists
    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return next(new ErrorResponse('Associated User credentials account not found', 404));
    }

    // 2. Prevent duplicate profile mapping
    const existingProfile = await Employee.findOne({ user: userId }).session(session);
    if (existingProfile) {
      await session.abortTransaction();
      session.endSession();
      return next(new ErrorResponse('Employee profile is already mapped to this user account', 400));
    }

    // 3. Create employee profile within the session
    const [employee] = await Employee.create(
      [
        {
          user: userId,
          firstName,
          lastName,
          employeeId,
          phone,
          jobTitle,
          department: departmentId,
          manager: managerId || undefined,
          baseSalary: baseSalary || 0
        }
      ],
      { session }
    );

    if (!employee) {
      await session.abortTransaction();
      session.endSession();
      return next(new ErrorResponse('Failed to create employee profile', 500));
    }

    // Commit all changes
    await session.commitTransaction();
    session.endSession();

    // Log onboarding audit trail
    createAuditLog({
      action: 'EMPLOYEE_ONBOARD',
      targetModel: 'Employee',
      targetId: employee._id.toString(),
      details: `Onboarded employee: ${employee.firstName} ${employee.lastName} (ID: ${employee.employeeId})`,
      req
    });

    return res.status(201).json({
      success: true,
      data: employee
    });
  } catch (err: any) {
    try {
      await session.abortTransaction();
    } catch (abortError) {
      // Suppress abort errors since standalone databases do not support transactions
    }
    try {
      session.endSession();
    } catch (endError) {
      // Suppress session cleanup errors
    }

    // Fallback: If local MongoDB is standalone and doesn't support transactions
    const isStandaloneError = err.message && (
      err.message.toLowerCase().includes('replica set') || 
      err.message.toLowerCase().includes('transaction')
    );

    if (isStandaloneError) {
      try {
        const user = await User.findById(userId);
        if (!user) {
          return next(new ErrorResponse('Associated User credentials account not found', 404));
        }

        const existingProfile = await Employee.findOne({ user: userId });
        if (existingProfile) {
          return next(new ErrorResponse('Employee profile is already mapped to this user account', 400));
        }

        const employee = await Employee.create({
          user: userId,
          firstName,
          lastName,
          employeeId,
          phone,
          jobTitle,
          department: departmentId,
          manager: managerId || undefined,
          baseSalary: baseSalary || 0
        });

        if (!employee) {
          return next(new ErrorResponse('Failed to create employee profile', 500));
        }

        // Log onboarding audit trail
        createAuditLog({
          action: 'EMPLOYEE_ONBOARD',
          targetModel: 'Employee',
          targetId: employee._id.toString(),
          details: `Onboarded employee: ${employee.firstName} ${employee.lastName} (ID: ${employee.employeeId})`,
          req
        });

        return res.status(201).json({
          success: true,
          data: employee
        });
      } catch (fallbackErr) {
        return next(fallbackErr);
      }
    }

    return next(err);
  }
};

// @desc    Send a custom notice email to an employee
// @route   POST /api/employees/:id/email
// @access  Private (Admin / HR Manager only)
export const sendCustomEmail = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { subject, message } = req.body;

  if (!subject || !message) {
    return next(new ErrorResponse('Please provide a subject and message body', 400));
  }

  try {
    const employee = await Employee.findById(id).populate('user', 'email').lean() as any;
    if (!employee) {
      return next(new ErrorResponse('Employee profile not found', 404));
    }

    const recipientEmail = employee.user?.email;
    if (!recipientEmail) {
      return next(new ErrorResponse('This employee does not have a linked user account or email address', 400));
    }

    const { sendEmail } = await import('../utils/notifications');

    // Dispatch email notice using dynamic SMTP utility
    await sendEmail({
      to: recipientEmail,
      subject: subject,
      html: `
        <h3>Employee Notice</h3>
        <p>Dear ${employee.firstName} ${employee.lastName},</p>
        <div style="background-color: #f3f4f6; border-left: 4px solid #7c3aed; padding: 12px; margin: 16px 0; font-family: sans-serif; white-space: pre-line;">
          ${message}
        </div>
        <p>If you have any questions, please contact the HR Department.</p>
        <br/>
        <p>Best regards,<br/>Management Team</p>
      `
    });

    // Log email notice audit trail
    createAuditLog({
      action: 'EMPLOYEE_EMAIL_SENT',
      targetModel: 'Employee',
      targetId: employee._id.toString(),
      details: `Custom notice sent to employee: ${employee.firstName} ${employee.lastName}. Subject: ${subject}`,
      req
    });

    res.status(200).json({
      success: true,
      message: `Notice email sent to ${employee.firstName} ${employee.lastName} successfully!`
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get active logged-in user's own employee profile details
// @route   GET /api/employees/me
// @access  Private (Any authenticated user)
export const getMyProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as any;
    const employee = await Employee.findOne({ user: authReq.user?._id })
      .populate('user', 'email role')
      .populate('department', 'name code')
      .populate('manager', 'firstName lastName employeeId jobTitle')
      .lean();

    if (!employee) {
      return next(new ErrorResponse('Employee profile not found for this account', 404));
    }

    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (err) {
    next(err);
  }
};
