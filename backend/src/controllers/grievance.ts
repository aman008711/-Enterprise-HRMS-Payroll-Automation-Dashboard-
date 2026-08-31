import { Response, NextFunction } from 'express';
import Grievance from '../models/Grievance';
import Employee from '../models/Employee';
import { AuthenticatedRequest } from '../middleware/auth';
import { ErrorResponse } from '../middleware/error';
import { createAuditLog } from '../utils/audit';

// @desc    Get grievance lists
// @route   GET /api/grievances
// @access  Private
export const getGrievances = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const query: any = {};

    // Standard employees only see their own grievances
    if (req.user?.role === 'Employee') {
      const employee = await Employee.findOne({ user: req.user._id }).lean();
      if (!employee) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      query.employee = employee._id;
    }

    const grievances = await Grievance.find(query)
      .populate('employee', 'firstName lastName employeeId jobTitle')
      .populate('resolvedBy', 'email')
      .sort({ createdAt: -1 })
      .lean();

    // Security scrubbing: For Admin/HR queries, scrub employee info if isAnonymous is true
    const sanitizedData = grievances.map((g) => {
      if (req.user?.role !== 'Employee' && g.isAnonymous) {
        return {
          ...g,
          employee: undefined // Hide submitter credentials from Admins and HR Managers
        };
      }
      return g;
    });

    res.status(200).json({
      success: true,
      count: sanitizedData.length,
      data: sanitizedData
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Submit a new grievance complaint
// @route   POST /api/grievances
// @access  Private (Employee only)
export const submitGrievance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { isAnonymous, title, description } = req.body;

  try {
    if (req.user?.role !== 'Employee') {
      return next(new ErrorResponse('Only employees can submit grievances', 403));
    }

    const employee = await Employee.findOne({ user: req.user._id });
    if (!employee) {
      return next(new ErrorResponse('Employee profile not found', 404));
    }

    const grievance = await Grievance.create({
      employee: employee._id,
      isAnonymous: !!isAnonymous,
      title,
      description
    });

    res.status(201).json({
      success: true,
      data: grievance
    });

    createAuditLog({
      action: 'GRIEVANCE_SUBMIT',
      targetModel: 'Grievance',
      targetId: grievance._id.toString(),
      details: `New grievance filed. Anonymous: ${!!isAnonymous}. Title: "${title}"`,
      req
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Resolve and post response to a grievance (Admin/HR only)
// @route   PUT /api/grievances/:id/resolve
// @access  Private (Admin / HR Manager only)
export const resolveGrievance = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { response } = req.body;

  try {
    if (req.user?.role !== 'Admin' && req.user?.role !== 'HR Manager') {
      return next(new ErrorResponse('Not authorized to resolve grievances', 403));
    }

    const grievance = await Grievance.findById(id);
    if (!grievance) {
      return next(new ErrorResponse('Grievance not found', 404));
    }

    grievance.status = 'Resolved';
    grievance.response = response;
    grievance.resolvedBy = req.user._id;
    grievance.resolvedAt = new Date();
    await grievance.save();

    res.status(200).json({
      success: true,
      data: grievance
    });

    createAuditLog({
      action: 'GRIEVANCE_RESOLVE',
      targetModel: 'Grievance',
      targetId: id,
      details: `Resolved grievance "${grievance.title}" (Processed by: ${req.user.email})`,
      req
    });
  } catch (err) {
    next(err);
  }
};
