import { Router } from 'express';
import { createExpense, getExpenses, updateExpenseStatus } from '../controllers/expense';
import { protect, authorizeRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { createExpenseSchema, updateExpenseStatusSchema } from '../middleware/schemas';

const router = Router();

// Apply auth protection globally to all expense routes
router.use(protect);

// POST file expense claim & GET claims list
router.post('/', validateRequest(createExpenseSchema), createExpense);
router.get('/', getExpenses);

// PUT update expense claim status (HR Manager / Admin only)
router.put('/:id/status', authorizeRoles('Admin', 'HR Manager'), validateRequest(updateExpenseStatusSchema), updateExpenseStatus);

export default router;
