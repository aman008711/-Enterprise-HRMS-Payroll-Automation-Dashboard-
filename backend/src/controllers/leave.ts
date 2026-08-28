import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import LeaveRequest from '../models/LeaveRequest';
import Employee from '../models/Employee';
import { AuthenticatedRequest } from '../middleware/auth';
import { ErrorResponse } from '../middleware/error';
import { createAuditLog } from '../utils/audit';

// @desc    Get leave requests with joining relations and computed durations via aggregation
// @route   GET /api/leaves
// @access  Private (Admin / HR Manager / Employee)
export const getLeaves = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let matchQuery: any = {};

    // If logged-in user is an Employee, restrict to their leaves only
    if (req.user?.role === 'Employee') {
      const employee = await Employee.findOne({ user: req.user._id }).lean();
      if (!employee) {
        return next(new ErrorResponse('Employee profile not found', 404));
      }
      matchQuery = { employee: employee._id };
    }

    const leaves = await LeaveRequest.aggregate([
      // 1. Filter by target query
      { $match: matchQuery },
      // 2. Join requesting employee profile
      {
        $lookup: {
          from: 'employees',
          localField: 'employee',
          foreignField: '_id',
          as: 'employeeDetails'
        }
      },
      { $unwind: '$employeeDetails' },
      // 3. Join department info
      {
        $lookup: {
          from: 'departments',
          localField: 'employeeDetails.department',
          foreignField: '_id',
          as: 'departmentDetails'
        }
      },
      { $unwind: '$departmentDetails' },
      // 4. Join manager / approver profile
      {
        $lookup: {
          from: 'employees',
          localField: 'approver',
          foreignField: '_id',
          as: 'approverDetails'
        }
      },
      {
        $unwind: {
          path: '$approverDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      // 5. Compute duration and structure the response shape
      {
        $project: {
          _id: 1,
          type: 1,
          startDate: 1,
          endDate: 1,
          reason: 1,
          status: 1,
          comments: 1,
          createdAt: 1,
          durationDays: {
            $add: [
              {
                $divide: [
                  { $subtract: ['$endDate', '$startDate'] },
                  1000 * 60 * 60 * 24
                ]
              },
              1
            ]
          },
          employee: {
            _id: '$employeeDetails._id',
            firstName: '$employeeDetails.firstName',
            lastName: '$employeeDetails.lastName',
            employeeId: '$employeeDetails.employeeId',
            jobTitle: '$employeeDetails.jobTitle',
            department: '$departmentDetails.name'
          },
          approver: {
            $cond: {
              if: { $not: ['$approverDetails._id'] },
              then: '$$REMOVE',
              else: {
                _id: '$approverDetails._id',
                firstName: '$approverDetails.firstName',
                lastName: '$approverDetails.lastName',
                jobTitle: '$approverDetails.jobTitle'
              }
            }
          }
        }
      },
      // Sort by newest requests first
      { $sort: { createdAt: -1 } }
    ]);

    res.status(200).json({
      success: true,
      count: leaves.length,
      data: leaves
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Submit a new leave request
// @route   POST /api/leaves
// @access  Private (Any authenticated user - maps User to Employee)
export const createLeaveRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { type, startDate, endDate, reason } = req.body;

  try {
    if (!type || !startDate || !endDate || !reason) {
      return next(new ErrorResponse('Please provide all leave details', 400));
    }

    const employee = await Employee.findOne({ user: req.user?._id }).lean();
    if (!employee) {
      return next(new ErrorResponse('Employee profile not found', 404));
    }

    const leave = await LeaveRequest.create({
      employee: employee._id,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason
    });

    res.status(201).json({
      success: true,
      data: leave
    });

    // Log leave request creation audit trail
    createAuditLog({
      action: 'LEAVE_REQUEST_SUBMITTED',
      targetModel: 'LeaveRequest',
      targetId: leave._id.toString(),
      details: `Leave type: ${leave.type}, dates: ${startDate} to ${endDate}`,
      req
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Approve or Reject a pending leave request
// @route   PUT /api/leaves/:id/status
// @access  Private (Admin / HR Manager only)
export const updateLeaveStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { status, comments } = req.body;

  try {
    if (!['Approved', 'Rejected'].includes(status)) {
      return next(new ErrorResponse('Invalid status. Choose Approved or Rejected', 400));
    }

    const manager = await Employee.findOne({ user: req.user?._id }).lean();
    if (!manager) {
      return next(new ErrorResponse('Manager employee profile not found', 404));
    }

    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) {
      return next(new ErrorResponse('Leave request not found', 404));
    }

    if (leave.status !== 'Pending') {
      return next(new ErrorResponse('Leave request has already been processed', 400));
    }

    leave.status = status;
    leave.approver = manager._id as mongoose.Types.ObjectId;
    leave.comments = comments;

    await leave.save();

    res.status(200).json({
      success: true,
      data: leave
    });

    // Log leave decision audit trail
    createAuditLog({
      action: `LEAVE_REQUEST_${status.toUpperCase()}`,
      targetModel: 'LeaveRequest',
      targetId: leave._id.toString(),
      details: `Comments: ${comments || 'None'}`,
      req
    });
  } catch (err) {
    next(err);
  }
};
