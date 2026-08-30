import { Response, NextFunction } from 'express';
import Expense from '../models/Expense';
import Employee from '../models/Employee';
import User from '../models/User';
import { AuthenticatedRequest } from '../middleware/auth';
import { ErrorResponse } from '../middleware/error';
import { createAuditLog } from '../utils/audit';
import { sendEmail, sendChatNotification } from '../utils/notifications';

// @desc    File a new expense reimbursement request
// @route   POST /api/expenses
// @access  Private (Employee role)
export const createExpense = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { employeeId, title, category, amount, description } = req.body;

  try {
    let targetEmployeeId;

    const isAdminOrHR = req.user?.role === 'Admin' || req.user?.role === 'HR Manager';
    if (isAdminOrHR && employeeId) {
      const targetEmployee = await Employee.findById(employeeId).lean();
      if (!targetEmployee) {
        return next(new ErrorResponse('Target employee profile not found', 404));
      }
      targetEmployeeId = targetEmployee._id;
    } else {
      const employee = await Employee.findOne({ user: req.user?._id }).lean();
      if (!employee) {
        return next(new ErrorResponse('Employee profile not found', 404));
      }
      targetEmployeeId = employee._id;
    }

    const expense = await Expense.create({
      employee: targetEmployeeId,
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

    // Fire Email & Chat Webhook Notifications to Reporting Manager
    try {
      const dbEmployee = await Employee.findById(targetEmployeeId).lean();
      if (dbEmployee) {
        const empName = `${dbEmployee.firstName} ${dbEmployee.lastName}`;

        // Discord/Slack Channel Webhook Alert
        await sendChatNotification({
          title: '💸 New Expense Claim Filed',
          description: `An employee has filed a new expense reimbursement claim requiring review.`,
          fields: [
            { name: 'Employee', value: empName, inline: true },
            { name: 'Category', value: category, inline: true },
            { name: 'Amount', value: `$${amount.toFixed(2)}`, inline: true },
            { name: 'Title', value: title, inline: false },
            { name: 'Description', value: description || 'No description provided', inline: false }
          ]
        });

        let recipientEmail = '';
        let recipientName = 'HR Department';

        if (dbEmployee.manager) {
          const managerEmployee = await Employee.findById(dbEmployee.manager).populate('user', 'email').lean() as any;
          if (managerEmployee && managerEmployee.user?.email) {
            recipientEmail = managerEmployee.user.email;
            recipientName = `${managerEmployee.firstName} ${managerEmployee.lastName}`;
          }
        }

        // Fallback: If no direct manager is assigned, find the HR Manager user(s) to notify
        if (!recipientEmail) {
          const hrUser = await User.findOne({ role: 'HR Manager' }).lean();
          if (hrUser) {
            recipientEmail = hrUser.email;
            const hrEmployee = await Employee.findOne({ user: hrUser._id }).lean();
            if (hrEmployee) {
              recipientName = `${hrEmployee.firstName} ${hrEmployee.lastName}`;
            }
          }
        }

        if (recipientEmail) {
          await sendEmail({
            to: recipientEmail,
            subject: `💸 Action Required: Expense Claim Submitted by ${empName}`,
            html: `
              <h3>Dear ${recipientName},</h3>
              <p>An expense reimbursement claim has been submitted by <strong>${empName}</strong> for review.</p>
              <ul>
                <li><strong>Title:</strong> ${title}</li>
                <li><strong>Category:</strong> ${category}</li>
                <li><strong>Amount:</strong> $${amount.toFixed(2)}</li>
                <li><strong>Description:</strong> ${description || 'N/A'}</li>
              </ul>
              <p>Please log into the Enterprise HRMS portal to approve or reject this claim.</p>
              <br/>
              <p>Best regards,<br/>Enterprise HRMS Portal</p>
            `
          });
        }
      }
    } catch (notifyErr) {
      console.error('Failed to process expense notifications:', notifyErr);
    }
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
