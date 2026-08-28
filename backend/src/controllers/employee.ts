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
  const { userId, firstName, lastName, employeeId, phone, jobTitle, departmentId, managerId } = req.body;

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
          manager: managerId || undefined
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

    res.status(201).json({
      success: true,
      data: employee
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    next(err);
  }
};
