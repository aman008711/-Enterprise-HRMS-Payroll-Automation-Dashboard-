import { Request, Response, NextFunction } from 'express';
import Review from '../models/Review';
import Employee from '../models/Employee';
import { ErrorResponse } from '../middleware/error';
import { createAuditLog } from '../utils/audit';
import { AuthenticatedRequest } from '../middleware/auth';

// @desc    Get performance reviews roster (scoped by permissions)
// @route   GET /api/reviews
// @access  Private
export const getReviews = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const query: any = {};

    // Standard employees are restricted to reading their own reviews
    if (req.user?.role === 'Employee') {
      const employee = await Employee.findOne({ user: req.user._id });
      if (!employee) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      query.employee = employee._id;
    }

    const reviews = await Review.find(query)
      .populate('employee', 'firstName lastName employeeId jobTitle baseSalary')
      .populate('reviewedBy', 'email')
      .lean();

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Initiate a quarterly self-appraisal draft / submission
// @route   POST /api/reviews
// @access  Private (Employee only)
export const createReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { quarter, selfGoals, selfComments, submitDirectly } = req.body;

  if (!quarter || !selfGoals) {
    return next(new ErrorResponse('Please provide appraisal quarter and career goals text', 400));
  }

  try {
    const employee = await Employee.findOne({ user: req.user?._id });
    if (!employee) {
      return next(new ErrorResponse('Employee profile not found for this credentials account', 404));
    }

    // Verify duplicate checks (one review per employee per quarter)
    const existing = await Review.findOne({ employee: employee._id, quarter });
    if (existing) {
      return next(new ErrorResponse(`An appraisal record already exists for ${quarter}. Please edit the existing draft.`, 400));
    }

    const review = await Review.create({
      employee: employee._id,
      quarter,
      selfGoals,
      selfComments: selfComments || '',
      status: submitDirectly ? 'Self-Submitted' : 'Draft'
    });

    res.status(201).json({
      success: true,
      data: review
    });

    createAuditLog({
      action: 'APPRAISAL_CREATED',
      targetModel: 'Review',
      targetId: review._id.toString(),
      details: `Created self-appraisal for ${quarter}. Status: ${review.status}`,
      req
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update review (Employees update goals/comments; Managers update ratings/comments)
// @route   PUT /api/reviews/:id
// @access  Private
export const updateReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { selfGoals, selfComments, submitDirectly, managerComments, rating, raisePercentage } = req.body;

  try {
    const review = await Review.findById(id);
    if (!review) {
      return next(new ErrorResponse('Appraisal record not found', 404));
    }

    // 1. Employee Self Updates
    if (req.user?.role === 'Employee') {
      const employee = await Employee.findOne({ user: req.user._id });
      if (!employee || review.employee.toString() !== employee._id.toString()) {
        return next(new ErrorResponse('Not authorized to modify this appraisal review', 403));
      }

      if (review.status !== 'Draft') {
        return next(new ErrorResponse('Appraisal has already been submitted and cannot be modified', 400));
      }

      review.selfGoals = selfGoals !== undefined ? selfGoals : review.selfGoals;
      review.selfComments = selfComments !== undefined ? selfComments : review.selfComments;
      if (submitDirectly) {
        review.status = 'Self-Submitted';
      }
    } 
    // 2. Manager / HR Feedback Updates
    else {
      // Must be Admin or HR Manager
      if (req.user?.role !== 'Admin' && req.user?.role !== 'HR Manager') {
        return next(new ErrorResponse('Not authorized to submit review feedback', 403));
      }

      review.managerComments = managerComments !== undefined ? managerComments : review.managerComments;
      review.rating = rating !== undefined ? rating : review.rating;
      review.raisePercentage = raisePercentage !== undefined ? raisePercentage : review.raisePercentage;
      review.reviewedBy = req.user._id;
      
      // Auto-promote status to Manager-Reviewed once comments & ratings are present
      if (review.status === 'Self-Submitted' || review.status === 'Draft') {
        review.status = 'Manager-Reviewed';
      }
    }

    await review.save();

    res.status(200).json({
      success: true,
      data: review
    });

    createAuditLog({
      action: 'APPRAISAL_UPDATED',
      targetModel: 'Review',
      targetId: id,
      details: `Appraisal details updated. Status: ${review.status}`,
      req
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Approve appraisal and execute salary raise trigger
// @route   POST /api/reviews/:id/approve
// @access  Private (Admin / HR Manager only)
export const approveReview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;

  try {
    const review = await Review.findById(id);
    if (!review) {
      return next(new ErrorResponse('Appraisal record not found', 404));
    }

    if (review.status !== 'Manager-Reviewed') {
      return next(new ErrorResponse('Appraisal must be reviewed by manager before approval execution', 400));
    }

    const employee = await Employee.findById(review.employee);
    if (!employee) {
      return next(new ErrorResponse('Linked employee profile not found', 404));
    }

    // 1. Calculate & apply raise to base salary if applicable
    let oldSalary = employee.baseSalary;
    let newSalary = oldSalary;

    if (review.raisePercentage > 0 && !review.raiseApplied) {
      newSalary = oldSalary * (1 + review.raisePercentage / 100);
      employee.baseSalary = parseFloat(newSalary.toFixed(2));
      await employee.save();
      review.raiseApplied = true;

      // Log salary raise in audit trails
      createAuditLog({
        action: 'SALARY_RAISE_APPLIED',
        targetModel: 'Employee',
        targetId: employee._id.toString(),
        details: `Approved QTR Appraisal raise of ${review.raisePercentage}%. Base salary adjusted from $${oldSalary} to $${employee.baseSalary}`,
        req
      });
    }

    // 2. Approve Review
    review.status = 'Approved';
    await review.save();

    res.status(200).json({
      success: true,
      message: `Appraisal approved successfully! Base salary raised by ${review.raisePercentage}% to $${employee.baseSalary}`,
      data: review
    });

    createAuditLog({
      action: 'APPRAISAL_APPROVED',
      targetModel: 'Review',
      targetId: id,
      details: `Approved appraisal review for ${employee.firstName} ${employee.lastName}`,
      req
    });
  } catch (err) {
    next(err);
  }
};
