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
  managerId: objectIdSchema.optional(),
  baseSalary: z.number().min(0, { message: 'Base salary cannot be negative' }).optional()
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

// 6. Expense Reimbursement schemas
export const createExpenseSchema = z.object({
  employeeId: objectIdSchema.optional(),
  title: z.string().trim().min(3, { message: 'Title must be at least 3 characters long' }),
  category: z.enum(['Travel', 'Medical', 'Hardware', 'Other'], {
    errorMap: () => ({ message: 'Invalid expense category selection' })
  }),
  amount: z.number().positive({ message: 'Expense amount must be greater than 0' }),
  description: z.string().trim().optional()
});

export const updateExpenseStatusSchema = z.object({
  status: z.enum(['Approved', 'Rejected'], {
    errorMap: () => ({ message: 'Status must be Approved or Rejected' })
  })
});

// 7. Shift validation schemas
export const createShiftSchema = z.object({
  employeeId: objectIdSchema,
  title: z.string().trim().min(1, { message: 'Title is required' }),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start time format' }),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid end time format' }),
  notes: z.string().trim().optional(),
  color: z.string().optional()
}).refine((data) => new Date(data.endTime) > new Date(data.startTime), {
  message: 'Shift end time must be after the start time',
  path: ['endTime']
});

export const updateShiftSchema = z.object({
  title: z.string().trim().min(1).optional(),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid start time' }).optional(),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid end time' }).optional(),
  notes: z.string().trim().optional(),
  color: z.string().optional()
});

// 8. Performance Review schemas
export const createReviewSchema = z.object({
  quarter: z.string().trim().min(2, { message: 'Quarter is required (e.g. Q1 2026)' }),
  selfGoals: z.string().trim().min(5, { message: 'Goals must be at least 5 characters long' }),
  selfComments: z.string().trim().optional(),
  submitDirectly: z.boolean().optional()
});

export const updateReviewSchema = z.object({
  selfGoals: z.string().trim().min(5).optional(),
  selfComments: z.string().trim().optional(),
  submitDirectly: z.boolean().optional(),
  managerComments: z.string().trim().min(3).optional(),
  rating: z.number().min(1).max(5).optional(),
  raisePercentage: z.number().min(0).max(100).optional()
});

// 9. Document Cabinet schemas
export const createDocumentSchema = z.object({
  employeeId: objectIdSchema.optional(),
  title: z.string().trim().min(2, { message: 'Document title is required' }),
  category: z.enum(['NDA', 'Employment Contract', 'Tax Form', 'Identification', 'Other'], {
    errorMap: () => ({ message: 'Invalid document category selection' })
  }),
  content: z.string().optional(),
  fileUrl: z.string().optional(),
  needsSignature: z.boolean().optional()
});

// 10. System Settings schemas
export const updateSettingsSchema = z.object({
  smtpHost: z.string().trim().optional(),
  smtpPort: z.number().optional(),
  smtpUser: z.string().trim().optional(),
  smtpPass: z.string().optional(),
  smtpSecure: z.boolean().optional(),
  smtpFrom: z.string().trim().email({ message: 'Sender email must be valid format' }).optional(),
  slackWebhookUrl: z.string().trim().url({ message: 'Must be a valid URL' }).optional().or(z.literal('')),
  discordWebhookUrl: z.string().trim().url({ message: 'Must be a valid URL' }).optional().or(z.literal(''))
});

// 11. Bulletin board schemas
export const createBulletinSchema = z.object({
  title: z.string().trim().min(3, { message: 'Title must be at least 3 characters long' }),
  content: z.string().trim().min(5, { message: 'Content must be at least 5 characters long' }),
  priority: z.enum(['Low', 'Medium', 'High']).default('Medium'),
  expiryDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid expiry date format' })
});

// 12. Resignation schemas
export const createResignationSchema = z.object({
  proposedLastWorkingDay: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid proposed last working day' }),
  reason: z.string().trim().min(5, { message: 'Reason must be at least 5 characters long' })
});

export const updateResignationSchema = z.object({
  status: z.enum(['Approved', 'Rejected']),
  feedback: z.string().trim().optional()
});

// 13. Grievance schemas
export const createGrievanceSchema = z.object({
  isAnonymous: z.boolean().default(false),
  title: z.string().trim().min(3, { message: 'Title must be at least 3 characters long' }),
  description: z.string().trim().min(5, { message: 'Details must be at least 5 characters long' })
});

export const resolveGrievanceSchema = z.object({
  response: z.string().trim().min(3, { message: 'Resolution message must be at least 3 characters long' })
});

