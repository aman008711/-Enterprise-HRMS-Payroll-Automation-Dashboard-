import { z } from 'zod';

// MongoDB ObjectId validator helper
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, {
  message: 'Invalid Mongo ID format'
});

// 1. Authentication schemas
export const registerSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address format' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters long' }),
  role: z.enum(['Admin', 'HR Manager', 'Employee']).optional()
});

export const loginSchema = z.object({
  email: z.string().trim().email({ message: 'Invalid email address format' }),
  password: z.string().min(1, { message: 'Password is required' })
});

// 2. Department schemas
export const createDepartmentSchema = z.object({
  name: z.string().trim().min(2, { message: 'Department name must be at least 2 characters long' }),
  code: z.string().trim().toUpperCase().min(2, { message: 'Code must be at least 2 characters long' }),
  manager: objectIdSchema.optional()
});

// 3. Employee onboarding schemas
export const onboardEmployeeSchema = z.object({
  userId: objectIdSchema,
  firstName: z.string().trim().min(1, { message: 'First name is required' }),
  lastName: z.string().trim().min(1, { message: 'Last name is required' }),
  employeeId: z.string().trim().toUpperCase().min(3, { message: 'Employee ID must be at least 3 characters long' }),
  phone: z.string().trim().optional(),
  jobTitle: z.string().trim().min(1, { message: 'Job title is required' }),
  departmentId: objectIdSchema,
  managerId: objectIdSchema.optional()
});

// 4. Leave request schemas
export const createLeaveSchema = z.object({
  type: z.enum(['Sick', 'Vacation', 'Personal', 'Maternity', 'Paternity'], {
    errorMap: () => ({ message: 'Invalid leave type selection' })
  }),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid start date format'
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid end date format'
  }),
  reason: z.string().trim().min(5, { message: 'Reason must be at least 5 characters long' })
}).refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
  message: 'End date cannot be earlier than start date',
  path: ['endDate']
});

// 5. Payroll schemas
export const createPayrollSchema = z.object({
  employeeId: objectIdSchema,
  payPeriodStart: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid start date'
  }),
  payPeriodEnd: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid end date'
  }),
  baseSalary: z.number().min(0, { message: 'Base salary cannot be negative' }),
  allowances: z.number().min(0, { message: 'Allowances cannot be negative' }).optional(),
  deductions: z.number().min(0, { message: 'Deductions cannot be negative' }).optional(),
  status: z.enum(['Unpaid', 'Paid']).optional(),
  paymentMethod: z.enum(['Bank Transfer', 'Cheque', 'Cash']).optional()
}).refine((data) => new Date(data.payPeriodEnd) >= new Date(data.payPeriodStart), {
  message: 'Pay period end date cannot be earlier than start date',
  path: ['payPeriodEnd']
});
