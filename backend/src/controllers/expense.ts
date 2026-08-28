import { Response, NextFunction } from 'express';
import Expense from '../models/Expense';
import Employee from '../models/Employee';
import { AuthenticatedRequest } from '../middleware/auth';
import { ErrorResponse } from '../middleware/error';
import { createAuditLog } from '../utils/audit';

// @desc    File a new expense reimbursement request
// @route   POST /api/expenses
// @access  Private (Employee role)
export const createExpense = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { title, category, amount, description } = req.body;

  try {
    const employee = await Employee.findOne({ user: req.user?._id }).lean();
    if (!employee) {
      return next(new ErrorResponse('Employee profile not found', 404));
    }

    const expense = await Expense.create({
      employee: employee._id,
      title,
      category,
      amount,
      description
    });

    res.status(201).json({
      success: true,
      data: expense
    });

    // Log expense creation audit trail
    createAuditLog({
      action: 'EXPENSE_FILED',
      targetModel: 'Expense',
      targetId: expense._id.toString(),
      details: `Claim category: ${expense.category}, amount: $${expense.amount}`,
      req
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get expense reimbursement requests lists (Employee views own, HR / Admin views all)
// @route   GET /api/expenses
// @access  Private (Admin / HR Manager / Employee)
export const getExpenses = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let query: any = {};

    // Standard Employees can only fetch their own claims
    if (req.user?.role === 'Employee') {
      const employee = await Employee.findOne({ user: req.user._id }).lean();
      if (!employee) {
        return next(new ErrorResponse('Employee profile not found', 404));
      }
      query = { employee: employee._id };
    }

    const expenses = await Expense.find(query)
      .populate('employee', 'firstName lastName employeeId jobTitle')
      .populate('approvedBy', 'firstName lastName employeeId jobTitle')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: expenses.length,
      data: expenses
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Approve or Reject a pending expense reimbursement request
// @route   PUT /api/expenses/:id/status
// @access  Private (Admin / HR Manager only)
export const updateExpenseStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { status } = req.body;

  try {
    const manager = await Employee.findOne({ user: req.user?._id }).lean();
    if (!manager) {
      return next(new ErrorResponse('Manager employee profile not found', 404));
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return next(new ErrorResponse('Expense record not found', 404));
    }

    if (expense.status !== 'Pending') {
      return next(new ErrorResponse('Expense request has already been reviewed', 400));
    }

    expense.status = status;
    expense.approvedBy = manager._id as any;
    await expense.save();

    res.status(200).json({
      success: true,
      data: expense
    });

    // Log status alteration audit trail
    createAuditLog({
      action: 'EXPENSE_REVIEWED',
      targetModel: 'Expense',
      targetId: expense._id.toString(),
      details: `Reimbursement status changed to: ${expense.status} by ${manager.firstName} ${manager.lastName}`,
      req
    });
  } catch (err) {
    next(err);
  }
};
