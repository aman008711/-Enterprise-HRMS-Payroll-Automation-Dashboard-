import { Response, NextFunction } from 'express';
import AuditLog from '../models/AuditLog';
import User from '../models/User';
import { AuthenticatedRequest } from '../middleware/auth';
import { ErrorResponse } from '../middleware/error';

// @desc    Get all system audit logs
// @route   GET /api/audit-logs
// @access  Private (Admin only)
export const getAuditLogs = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // Explicitly reference to prevent TypeScript from stripping the import
    const _userModel = User.modelName;

    // Restrict strictly to Admin
    if (req.user?.role !== 'Admin') {
      return next(new ErrorResponse('Not authorized to access operational audit logs', 403));
    }

    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const skip = (page - 1) * limit;

    const query: any = {};
    if (req.query.action) {
      query.action = { $regex: req.query.action as string, $options: 'i' };
    }

    const logs = await AuditLog.find(query)
      .populate('user', 'email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await AuditLog.countDocuments(query);

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: logs
    });
  } catch (err) {
    next(err);
  }
};
