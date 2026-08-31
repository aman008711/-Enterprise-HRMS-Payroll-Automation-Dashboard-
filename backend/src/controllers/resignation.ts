import { Response, NextFunction } from 'express';
import Resignation from '../models/Resignation';
import Employee from '../models/Employee';
import User from '../models/User';
import { AuthenticatedRequest } from '../middleware/auth';
import { ErrorResponse } from '../middleware/error';
import { createAuditLog } from '../utils/audit';

// @desc    Get resignation requests
// @route   GET /api/resignations
// @access  Private
export const getResignations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const query: any = {};

    // Standard employees only see their own resignation record
    if (req.user?.role === 'Employee') {
      const employee = await Employee.findOne({ user: req.user._id }).lean();
      if (!employee) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      query.employee = employee._id;
    }

    const resignations = await Resignation.find(query)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId jobTitle status department',
        populate: { path: 'department', select: 'name' }
      })
      .populate('processedBy', 'email')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: resignations.length,
      data: resignations
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Submit a resignation request
// @route   POST /api/resignations
// @access  Private (Employee only)
export const submitResignation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { proposedLastWorkingDay, reason } = req.body;

  try {
    if (req.user?.role !== 'Employee') {
      return next(new ErrorResponse('Only standard employees can file resignation requests', 403));
    }

    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return next(new ErrorResponse('Employee profile not found', 404));
    }

    // Check if already submitted
    const existing = await Resignation.findOne({ employee: employee._id });
    if (existing) {
      return next(
        new ErrorResponse(
          `You have already submitted a resignation request (Current status: ${existing.status})`,
          400
        )
      );
    }

    const resignation = await Resignation.create({
      employee: employee._id,
      proposedLastWorkingDay: new Date(proposedLastWorkingDay),
      reason
    });

    res.status(201).json({
      success: true,
      data: resignation
    });

    createAuditLog({
      action: 'RESIGNATION_SUBMIT',
      targetModel: 'Resignation',
      targetId: resignation._id.toString(),
      details: `${employee.firstName} ${employee.lastName} submitted a resignation for last day: ${proposedLastWorkingDay}`,
      req
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Process (Approve/Reject) a resignation request
// @route   PUT /api/resignations/:id/status
// @access  Private (Admin / HR Manager only)
export const processResignation = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { status, feedback } = req.body;

  try {
    if (req.user?.role !== 'Admin' && req.user?.role !== 'HR Manager') {
      return next(new ErrorResponse('Not authorized to process resignations', 403));
    }

    const resignation = await Resignation.findById(id).populate('employee');
    if (!resignation) {
      return next(new ErrorResponse('Resignation record not found', 404));
    }

    resignation.status = status;
    resignation.feedback = feedback || '';
    resignation.processedBy = req.user._id;
    await resignation.save();

    const emp = resignation.employee as any;

    // If approved, update Employee status to 'Terminated'
    if (status === 'Approved' && emp) {
      await Employee.findByIdAndUpdate(emp._id, { status: 'Terminated' });
      // Log account termination
      createAuditLog({
        action: 'EMPLOYEE_TERMINATED',
        targetModel: 'Employee',
        targetId: emp._id.toString(),
        details: `Employee status set to Terminated via approved resignation (processed by ${req.user.email})`,
        req
      });
    }

    res.status(200).json({
      success: true,
      data: resignation
    });

    createAuditLog({
      action: `RESIGNATION_${status.toUpperCase()}`,
      targetModel: 'Resignation',
      targetId: id,
      details: `${status} resignation for ${emp?.firstName} ${emp?.lastName}. Feedback: ${feedback || 'None'}`,
      req
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Directly terminate an employee profile (Admin/HR only)
// @route   POST /api/resignations/terminate
// @access  Private (Admin / HR Manager only)
export const terminateEmployee = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { employeeId, feedback } = req.body;

  try {
    if (req.user?.role !== 'Admin' && req.user?.role !== 'HR Manager') {
      return next(new ErrorResponse('Not authorized to terminate staff', 403));
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return next(new ErrorResponse('Employee profile not found', 404));
    }

    if (employee.status === 'Terminated') {
      return next(new ErrorResponse('Employee is already terminated', 400));
    }

    employee.status = 'Terminated';
    await employee.save();

    res.status(200).json({
      success: true,
      message: `Employee ${employee.firstName} ${employee.lastName} terminated successfully`,
      data: employee
    });

    createAuditLog({
      action: 'EMPLOYEE_TERMINATED_DIRECT',
      targetModel: 'Employee',
      targetId: employeeId,
      details: `Direct termination executed by ${req.user.email}. Reason/Feedback: ${feedback || 'None'}`,
      req
    });
  } catch (err) {
    next(err);
  }
};
