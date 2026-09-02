import { Response, NextFunction } from 'express';
import Payroll from '../models/Payroll';
import Employee from '../models/Employee';
import Department from '../models/Department';
import User from '../models/User';
import { AuthenticatedRequest } from '../middleware/auth';
import { ErrorResponse } from '../middleware/error';
import { createAuditLog } from '../utils/audit';
import { generatePayslipPDF, generatePayslipPDFBuffer, generatePayrollReportPDF } from '../utils/pdf';
import { sendEmail } from '../utils/notifications';
import Expense from '../models/Expense';
import Attendance from '../models/Attendance';
import LeaveRequest from '../models/LeaveRequest';

const getLocalDateString = (d: Date = new Date()): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// @desc    Get payroll history lists with nested employee and department details via aggregation
// @route   GET /api/payroll
// @access  Private (Admin / HR Manager / Employee)
export const getPayrollHistory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const _emp = Employee.modelName;
    const _dept = Department.modelName;
    const _usr = User.modelName;
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

// @desc    Download executive company-wide financial report as PDF
// @route   GET /api/payroll/report/download
// @access  Private (Admin / HR Manager only)
export const downloadPayrollReport = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const _emp = Employee.modelName;
    const _dept = Department.modelName;

    const report = await Payroll.aggregate([
      {
        $lookup: {
          from: 'employees',
          localField: 'employee',
          foreignField: '_id',
          as: 'employee'
        }
      },
      { $unwind: '$employee' },
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
      {
        $lookup: {
          from: 'departments',
          localField: '_id',
          foreignField: '_id',
          as: 'department'
        }
      },
      { $unwind: '$department' },
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

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=master-payroll-report-${new Date().toISOString().slice(0, 10)}.pdf`);

    await generatePayrollReportPDF(report, res);

    createAuditLog({
      action: 'PAYROLL_REPORT_DOWNLOADED',
      targetModel: 'Payroll',
      details: `Executive financial report downloaded by ${req.user?.email}`,
      req
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
    const _emp = Employee.modelName;
    const _dept = Department.modelName;
    const _usr = User.modelName;
    if (!employeeId || !payPeriodStart || !payPeriodEnd || baseSalary === undefined) {
      return next(new ErrorResponse('Please provide employeeId, payPeriodStart, payPeriodEnd, and baseSalary', 400));
    }

    // Verify employee exists before mapping payroll
    const employeeExists = await Employee.findById(employeeId);
    if (!employeeExists) {
      return next(new ErrorResponse('Employee profile not found', 404));
    }

    // Prevent overlapping pay periods for the same employee (double payment prevention)
    const overlappingPayroll = await Payroll.findOne({
      employee: employeeId,
      $or: [
        {
          payPeriodStart: { $lte: new Date(payPeriodEnd) },
          payPeriodEnd: { $gte: new Date(payPeriodStart) }
        }
      ]
    });

    if (overlappingPayroll) {
      const existingStart = new Date(overlappingPayroll.payPeriodStart).toLocaleDateString();
      const existingEnd = new Date(overlappingPayroll.payPeriodEnd).toLocaleDateString();
      return next(
        new ErrorResponse(
          `A payroll ledger already exists that overlaps with this pay run: covers ${existingStart} to ${existingEnd} for this employee.`,
          400
        )
      );
    }

    // Query approved, unpaid expenses for the target employee to integrate as allowances
    const approvedExpenses = await Expense.find({
      employee: employeeId,
      status: 'Approved',
      paymentStatus: 'Unpaid'
    }).lean();

    const totalExpenseReimbursement = approvedExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const finalAllowances = (allowances || 0) + totalExpenseReimbursement;

    // Query employee attendance logs and approved leaves to calculate automated deductions
    const startStr = getLocalDateString(new Date(payPeriodStart));
    const endStr = getLocalDateString(new Date(payPeriodEnd));

    const attendanceLogs = await Attendance.find({
      employee: employeeId,
      dateString: { $gte: startStr, $lte: endStr }
    }).lean();

    const approvedLeaves = await LeaveRequest.find({
      employee: employeeId,
      status: 'Approved',
      startDate: { $lte: new Date(payPeriodEnd) },
      endDate: { $gte: new Date(payPeriodStart) }
    }).lean();

    let computedDeductions = 0;

    const attendanceMap = new Map<string, any>();
    attendanceLogs.forEach((log) => {
      attendanceMap.set(log.dateString, log);
    });

    const isDateOnLeave = (d: Date) => {
      return approvedLeaves.some((leave) => {
        const lStart = new Date(leave.startDate);
        const lEnd = new Date(leave.endDate);
        lStart.setHours(0, 0, 0, 0);
        lEnd.setHours(23, 59, 59, 999);
        return d >= lStart && d <= lEnd;
      });
    };

    let current = new Date(payPeriodStart);
    const periodEnd = new Date(payPeriodEnd);

    while (current <= periodEnd) {
      const dayOfWeek = current.getDay();
      // Skip Saturday (6) and Sunday (0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const dateStr = getLocalDateString(current);
        const log = attendanceMap.get(dateStr);

        if (log) {
          if (log.status === 'Late') {
            computedDeductions += 15.0; // $15 late check-in penalty
          } else if (log.status === 'Absent') {
            computedDeductions += 50.0; // $50 absent day penalty
          }
        } else {
          // No clock-in log. Verify if covered by approved leave request
          if (!isDateOnLeave(current)) {
            computedDeductions += 50.0; // $50 unexcused absence penalty
          }
        }
      }
      current.setDate(current.getDate() + 1);
    }

    const finalDeductions = (deductions || 0) + computedDeductions;

    const payroll = await Payroll.create({
      employee: employeeId,
      payPeriodStart: new Date(payPeriodStart),
      payPeriodEnd: new Date(payPeriodEnd),
      baseSalary,
      allowances: finalAllowances,
      deductions: finalDeductions,
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

    // Fire Email Notification with attached PDF Payslip to the Employee
    try {
      const dbEmployee = await Employee.findById(employeeId).populate('user', 'email').populate('department').lean() as any;
      if (dbEmployee && dbEmployee.user?.email) {
        // Compile populated payroll data matching PDF generator requirements
        const populatedPayroll = {
          ...payroll.toObject(),
          employee: dbEmployee,
          department: dbEmployee.department
        };

        const pdfBuffer = await generatePayslipPDFBuffer(populatedPayroll);
        const periodMonth = new Date(payPeriodStart).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

        await sendEmail({
          to: dbEmployee.user.email,
          subject: `📄 Secure Payslip Ready: ${periodMonth}`,
          html: `
            <h3>Dear ${dbEmployee.firstName} ${dbEmployee.lastName},</h3>
            <p>Your monthly payslip for <strong>${periodMonth}</strong> has been generated and is ready for download.</p>
            <p>We have attached a secure copy of your PDF payslip to this email for your convenience.</p>
            <p>You can also log into the Enterprise HRMS portal at any time to review your salary details, download older slips, or file expense claims.</p>
            <br/>
            <p>Best regards,<br/>Enterprise HRMS Portal</p>
          `,
          attachments: [
            {
              filename: `payslip_${periodMonth.toLowerCase().replace(' ', '_')}.pdf`,
              content: pdfBuffer,
              contentType: 'application/pdf'
            }
          ]
        });
      }
    } catch (notifyErr) {
      console.error('Failed to process payroll notification email:', notifyErr);
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Download PDF payslip for a specific payroll record
// @route   GET /api/payroll/:id/download
// @access  Private (Admin / HR Manager / Employee owning the record)
export const downloadPayslip = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const _emp = Employee.modelName;
    const _dept = Department.modelName;
    const _usr = User.modelName;
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

