import { Router } from 'express';
import { getPayrollHistory, getPayrollReport, createPayroll, downloadPayslip, downloadPayrollReport } from '../controllers/payroll';
import { protect, authorizeRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { createPayrollSchema } from '../middleware/schemas';

const router = Router();

// Apply auth protection globally to all payroll routes
router.use(protect);

// GET cost center aggregate reports (Admin / HR Manager access only)
router.get('/report', authorizeRoles('Admin', 'HR Manager'), getPayrollReport);

// GET master financial report PDF download (Admin / HR Manager access only)
router.get('/report/download', authorizeRoles('Admin', 'HR Manager'), downloadPayrollReport);

// GET payroll history records list (Employee reviews own, HR / Admin reviews all)
router.get('/', getPayrollHistory);

// GET specific payroll payslip PDF document
router.get('/:id/download', downloadPayslip);

// POST create payroll record (Admin / HR Manager access only)
router.post('/', authorizeRoles('Admin', 'HR Manager'), validateRequest(createPayrollSchema), createPayroll);

export default router;
