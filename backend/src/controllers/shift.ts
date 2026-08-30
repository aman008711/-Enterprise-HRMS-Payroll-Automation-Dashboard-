import { Request, Response, NextFunction } from 'express';
import Shift from '../models/Shift';
import Employee from '../models/Employee';
import { ErrorResponse } from '../middleware/error';
import { createAuditLog } from '../utils/audit';
import { AuthenticatedRequest } from '../middleware/auth';

// @desc    Get scheduled shifts (supports date range and employee filters)
// @route   GET /api/shifts
// @access  Private
export const getShifts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, employeeId } = req.query;
    const query: any = {};

    if (employeeId) {
      query.employee = employeeId;
    }

    if (startDate && endDate) {
      query.startTime = { $gte: new Date(startDate as string) };
      query.endTime = { $lte: new Date(endDate as string) };
    }

    const shifts = await Shift.find(query)
      .populate('employee', 'firstName lastName employeeId jobTitle')
      .lean();

    res.status(200).json({
      success: true,
      data: shifts
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Schedule a new shift for an employee (checks overlaps & daily hour limits)
// @route   POST /api/shifts
// @access  Private (Admin / HR Manager only)
export const createShift = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { employeeId, title, startTime, endTime, notes, color } = req.body;

  if (!employeeId || !title || !startTime || !endTime) {
    return next(new ErrorResponse('Please provide employeeId, title, startTime, and endTime', 400));
  }

  const start = new Date(startTime);
  const end = new Date(endTime);

  if (end <= start) {
    return next(new ErrorResponse('Shift end time must be after the start time', 400));
  }

  try {
    // 1. Verify target employee profile exists
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return next(new ErrorResponse('Employee profile not found', 404));
    }

    // 2. Conflict Check: Overlapping Shifts
    const overlap = await Shift.findOne({
      employee: employeeId,
      startTime: { $lt: end },
      endTime: { $gt: start }
    });

    if (overlap) {
      const overlapStart = new Date(overlap.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const overlapEnd = new Date(overlap.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return next(new ErrorResponse(
        `Scheduling Conflict: This employee is already assigned to a shift (${overlap.title}: ${overlapStart} - ${overlapEnd}) that overlaps this period.`,
        400
      ));
    }

    // 3. Conflict Check: Daily Hours Limit (Max 12 hours)
    const startOfDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endOfDay = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);

    const dailyShifts = await Shift.find({
      employee: employeeId,
      startTime: { $gte: startOfDay, $lt: endOfDay }
    });

    const proposedDurationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    let totalExistingHours = 0;
    dailyShifts.forEach(s => {
      totalExistingHours += (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60);
    });

    const totalScheduledHours = totalExistingHours + proposedDurationHours;
    if (totalScheduledHours > 12) {
      return next(new ErrorResponse(
        `Scheduling Limit Exceeded: Assigning this shift would cause the employee to work ${totalScheduledHours.toFixed(1)} hours today (Maximum limit allowed: 12 hours).`,
        400
      ));
    }

    // 4. Create Shift
    const shift = await Shift.create({
      employee: employeeId,
      title,
      startTime: start,
      endTime: end,
      notes,
      color: color || 'indigo',
      scheduledBy: req.user?._id
    });

    res.status(201).json({
      success: true,
      data: shift
    });

    createAuditLog({
      action: 'SHIFT_SCHEDULED',
      targetModel: 'Shift',
      targetId: shift._id.toString(),
      details: `Scheduled shift "${title}" for ${employee.firstName} ${employee.lastName}. Duration: ${proposedDurationHours.toFixed(1)} hrs`,
      req
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update/Reschedule an existing shift (checks overlaps & daily hour limits)
// @route   PUT /api/shifts/:id
// @access  Private (Admin / HR Manager only)
export const updateShift = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { title, startTime, endTime, notes, color } = req.body;

  try {
    const shift = await Shift.findById(id);
    if (!shift) {
      return next(new ErrorResponse('Shift record not found', 404));
    }

    const employeeId = shift.employee;
    const start = startTime ? new Date(startTime) : new Date(shift.startTime);
    const end = endTime ? new Date(endTime) : new Date(shift.endTime);

    if (end <= start) {
      return next(new ErrorResponse('Shift end time must be after the start time', 400));
    }

    // 1. Conflict Check: Overlapping Shifts (excluding current shift id)
    const overlap = await Shift.findOne({
      _id: { $ne: id },
      employee: employeeId,
      startTime: { $lt: end },
      endTime: { $gt: start }
    });

    if (overlap) {
      const overlapStart = new Date(overlap.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const overlapEnd = new Date(overlap.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return next(new ErrorResponse(
        `Scheduling Conflict: This employee is already assigned to an overlapping shift (${overlap.title}: ${overlapStart} - ${overlapEnd}).`,
        400
      ));
    }

    // 2. Conflict Check: Daily Hours Limit (Max 12 hours) (excluding current shift id)
    const startOfDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endOfDay = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);

    const dailyShifts = await Shift.find({
      _id: { $ne: id },
      employee: employeeId,
      startTime: { $gte: startOfDay, $lt: endOfDay }
    });

    const proposedDurationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    let totalExistingHours = 0;
    dailyShifts.forEach(s => {
      totalExistingHours += (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / (1000 * 60 * 60);
    });

    const totalScheduledHours = totalExistingHours + proposedDurationHours;
    if (totalScheduledHours > 12) {
      return next(new ErrorResponse(
        `Scheduling Limit Exceeded: Assigning this shift would cause the employee to work ${totalScheduledHours.toFixed(1)} hours today (Maximum limit allowed: 12 hours).`,
        400
      ));
    }

    // 3. Update fields
    shift.title = title || shift.title;
    shift.startTime = start;
    shift.endTime = end;
    shift.notes = notes !== undefined ? notes : shift.notes;
    shift.color = color || shift.color;
    shift.scheduledBy = req.user?._id || shift.scheduledBy;

    await shift.save();

    res.status(200).json({
      success: true,
      data: shift
    });

    createAuditLog({
      action: 'SHIFT_UPDATED',
      targetModel: 'Shift',
      targetId: shift._id.toString(),
      details: `Updated shift "${shift.title}". Rescheduled duration: ${proposedDurationHours.toFixed(1)} hrs`,
      req
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel/Delete a scheduled shift
// @route   DELETE /api/shifts/:id
// @access  Private (Admin / HR Manager only)
export const deleteShift = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const shift = await Shift.findById(id).populate('employee', 'firstName lastName');
    if (!shift) {
      return next(new ErrorResponse('Shift record not found', 404));
    }

    await Shift.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Shift successfully cancelled and removed'
    });

    const empName = shift.employee ? `${(shift.employee as any).firstName} ${(shift.employee as any).lastName}` : 'Employee';
    createAuditLog({
      action: 'SHIFT_CANCELLED',
      targetModel: 'Shift',
      targetId: id,
      details: `Cancelled shift "${shift.title}" scheduled for ${empName}`,
      req
    });
  } catch (err) {
    next(err);
  }
};
