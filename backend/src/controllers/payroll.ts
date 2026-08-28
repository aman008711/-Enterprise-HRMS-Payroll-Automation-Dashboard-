import { Response, NextFunction } from 'express';
import Payroll from '../models/Payroll';
import Employee from '../models/Employee';
import { AuthenticatedRequest } from '../middleware/auth';
import { ErrorResponse } from '../middleware/error';
import { createAuditLog } from '../utils/audit';
import { generatePayslipPDF } from '../utils/pdf';
import Expense from '../models/Expense';

// @desc    Get payroll history lists with nested employee and department details via aggregation
// @route   GET /api/payroll
// @access  Private (Admin / HR Manager / Employee)
export const getPayrollHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let matchQuery: any = {};

    // Restrict standard Employee users to viewing only their own slips
    if (req.user?.role === 'Employee') {
      const employee = await Employee.findOne({ user: req.user._id }).lean();
      if (!employee) {
        return next(new ErrorResponse('Employee profile not found', 404));
      }
      matchQuery = { employee: employee._id };
    }

    const payrolls = await Payroll.aggregate([
      // 1. Filter match query
      { $match: matchQuery },
      // 2. Join Employee profile
      {
        $lookup: {
          from: 'employees',
          localField: 'employee',
          foreignField: '_id',
          as: 'employeeDetails'
        }
      },
      { $unwind: '$employeeDetails' },
      // 3. Join Department reference
      {
        $lookup: {
          from: 'departments',
          localField: 'employeeDetails.department',
          foreignField: '_id',
          as: 'departmentDetails'
        }
      },
      { $unwind: '$departmentDetails' },
      // 4. Project formatted response details
      {
        $project: {
          _id: 1,
          payPeriodStart: 1,
          payPeriodEnd: 1,
          baseSalary: 1,
          allowances: 1,
          deductions: 1,
          netSalary: 1,
          status: 1,
          paymentDate: 1,
          paymentMethod: 1,
          createdAt: 1,
          employee: {
            _id: '$employeeDetails._id',
            firstName: '$employeeDetails.firstName',
            lastName: '$employeeDetails.lastName',
            employeeId: '$employeeDetails.employeeId',
            jobTitle: '$employeeDetails.jobTitle',
            department: '$departmentDetails.name'
          }
        }
      },
      // Sort by newest periods first
      { $sort: { payPeriodStart: -1 } }
    ]);

    res.status(200).json({
      success: true,
      count: payrolls.length,
      data: payrolls
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get department payroll cost center report using database aggregations
// @route   GET /api/payroll/report
// @access  Private (Admin / HR Manager only)
export const getPayrollReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const report = await Payroll.aggregate([
      // 1. Join Employee details to locate the department reference
      {
        $lookup: {
          from: 'employees',
          localField: 'employee',
          foreignField: '_id',
          as: 'employee'
        }
      },
      { $unwind: '$employee' },
      // 2. Group records by department ID and calculate aggregations
      {
        $group: {
          _id: '$employee.department',
          totalBaseSalary: { $sum: '$baseSalary' },
          totalAllowances: { $sum: '$allowances' },
          totalDeductions: { $sum: '$deductions' },
          totalNetSalary: { $sum: '$netSalary' },
          averageNetSalary: { $avg: '$netSalary' },
          payrollCount: { $sum: 1 }
        }
      },
      // 3. Join Department collection to resolve name and code
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'department'
        }
      },
      { $unwind: '$department' },
      // 4. Project polished metadata format
      {
        $project: {
          _id: 1,
          departmentName: '$department.name',
          departmentCode: '$department.code',
          totalBaseSalary: 1,
          totalAllowances: 1,
          totalDeductions: 1,
          totalNetSalary: 1,
          averageNetSalary: { $round: ['$averageNetSalary', 2] },
          payrollCount: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      count: report.length,
      data: report
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new payroll entry manually
// @route   POST /api/payroll
// @access  Private (Admin / HR Manager only)
export const createPayroll = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const { employeeId, payPeriodStart, payPeriodEnd, baseSalary, allowances, deductions, status, paymentMethod } = req.body;

  try {
    if (!employeeId || !payPeriodStart || !payPeriodEnd || baseSalary === undefined) {
      return next(new ErrorResponse('Please provide employeeId, payPeriodStart, payPeriodEnd, and baseSalary', 400));
    }

    // Verify employee exists before mapping payroll
    const employeeExists = await Employee.findById(employeeId);
    if (!employeeExists) {
      return next(new ErrorResponse('Employee profile not found', 404));
    }

    // Query approved, unpaid expenses for the target employee to integrate as allowances
    const approvedExpenses = await Expense.find({
      employee: employeeId,
      status: 'Approved',
      paymentStatus: 'Unpaid'
    }).lean();

    const totalExpenseReimbursement = approvedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const finalAllowances = (allowances || 0) + totalExpenseReimbursement;

    const payroll = await Payroll.create({
      employee: employeeId,
      payPeriodStart: new Date(payPeriodStart),
      payPeriodEnd: new Date(payPeriodEnd),
      baseSalary,
      allowances: finalAllowances,
      deductions: deductions || 0,
      status: status || 'Unpaid',
      paymentMethod: paymentMethod || 'Bank Transfer'
    });

    // Mark matched expenses as Paid and link them to the newly created payroll slip
    if (approvedExpenses.length > 0) {
      await Expense.updateMany(
        { _id: { $in: approvedExpenses.map(e => e._id) } },
        { 
          $set: { 
            paymentStatus: 'Paid',
            processedInPayroll: payroll._id 
          }
        }
      );
    }

    res.status(201).json({
      success: true,
      data: payroll
    });

    // Log payroll creation audit trail
    createAuditLog({
      action: 'PAYROLL_CREATED',
      targetModel: 'Payroll',
      targetId: payroll._id.toString(),
      details: `Period: ${payPeriodStart} to ${payPeriodEnd}. Net salary: ${payroll.netSalary}`,
      req
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Download PDF payslip for a specific payroll record
// @route   GET /api/payroll/:id/download
// @access  Private (Admin / HR Manager / Employee owning the record)
export const downloadPayslip = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId jobTitle department')
      .populate({
        path: 'employee',
        populate: { path: 'department', select: 'name code' }
      })
      .lean();

    if (!payroll) {
      return next(new ErrorResponse('Payroll record not found', 404));
    }

    const employee = payroll.employee as any;

    // Access control: Employees can only view/download their own payroll records
    if (req.user?.role === 'Employee') {
      const currentEmp = await Employee.findOne({ user: req.user._id }).lean();
      if (!currentEmp || currentEmp._id.toString() !== employee?._id?.toString()) {
        return next(new ErrorResponse('Not authorized to access this payslip', 403));
      }
    }

    // Set Response Headers for PDF downloading/attachment streaming
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=payslip-${employee?.employeeId || 'record'}-${payroll._id}.pdf`
    );

    // Call PDF generation helper (pipes directly to res stream)
    await generatePayslipPDF(payroll, res);

    // Log download action in the security audit trails
    createAuditLog({
      action: 'PAYSLIP_DOWNLOADED',
      targetModel: 'Payroll',
      targetId: payroll._id.toString(),
      details: `Payslip downloaded for Employee ${employee?.employeeId}`,
      req
    });

  } catch (err) {
    next(err);
  }
};

