import { Router } from 'express';
import { getLeaves, createLeaveRequest, updateLeaveStatus } from '../controllers/leave';
import { protect, authorizeRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { createLeaveSchema } from '../middleware/schemas';

const router = Router();

// Apply auth protection globally to all leave endpoints
router.use(protect);

// GET leave histories / requests list
router.get('/', getLeaves);

// POST submit a new leave request
router.post('/', validateRequest(createLeaveSchema), createLeaveRequest);

// PUT update status of a leave request (Admin / HR Manager only)
router.put('/:id/status', authorizeRoles('Admin', 'HR Manager'), updateLeaveStatus);

export default router;
