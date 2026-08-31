import { Response, NextFunction } from 'express';
import Bulletin from '../models/Bulletin';
import { AuthenticatedRequest } from '../middleware/auth';
import { ErrorResponse } from '../middleware/error';
import { createAuditLog } from '../utils/audit';

// @desc    Get all active bulletins
// @route   GET /api/bulletins
// @access  Private (All roles)
export const getBulletins = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const now = new Date();
    // Fetch bulletins that have not expired yet
    const bulletins = await Bulletin.find({ expiryDate: { $gt: now } })
      .populate('createdBy', 'email')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: bulletins.length,
      data: bulletins
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Publish a new bulletin notice
// @route   POST /api/bulletins
// @access  Private (Admin / HR Manager only)
export const createBulletin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { title, content, priority, expiryDate } = req.body;

  try {
    // Restrict access
    if (req.user?.role !== 'Admin' && req.user?.role !== 'HR Manager') {
      return next(new ErrorResponse('Not authorized to publish bulletin notices', 403));
    }

    const bulletin = await Bulletin.create({
      title,
      content,
      priority: priority || 'Medium',
      expiryDate: new Date(expiryDate),
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: bulletin
    });

    createAuditLog({
      action: 'BULLETIN_PUBLISH',
      targetModel: 'Bulletin',
      targetId: bulletin._id.toString(),
      details: `Published notice "${title}" with priority ${priority} expiring ${expiryDate}`,
      req
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a bulletin notice
// @route   DELETE /api/bulletins/:id
// @access  Private (Admin / HR Manager only)
export const deleteBulletin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    // Restrict access
    if (req.user?.role !== 'Admin' && req.user?.role !== 'HR Manager') {
      return next(new ErrorResponse('Not authorized to delete bulletin notices', 403));
    }

    const bulletin = await Bulletin.findById(id);
    if (!bulletin) {
      return next(new ErrorResponse('Bulletin notice not found', 404));
    }

    await Bulletin.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Bulletin notice deleted successfully'
    });

    createAuditLog({
      action: 'BULLETIN_DELETE',
      targetModel: 'Bulletin',
      targetId: id,
      details: `Deleted notice "${bulletin.title}"`,
      req
    });
  } catch (err) {
    next(err);
  }
};
