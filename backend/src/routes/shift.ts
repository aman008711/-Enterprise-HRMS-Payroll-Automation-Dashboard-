import { Router } from 'express';
import { getShifts, createShift, updateShift, deleteShift } from '../controllers/shift';
import { protect, authorizeRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { createShiftSchema, updateShiftSchema } from '../middleware/schemas';

const router = Router();

// Apply authentication globally to all shift scheduling routes
router.use(protect);

router.route('/')
  .get(getShifts)
  .post(authorizeRoles('Admin', 'HR Manager'), validateRequest(createShiftSchema), createShift);

router.route('/:id')
  .put(authorizeRoles('Admin', 'HR Manager'), validateRequest(updateShiftSchema), updateShift)
  .delete(authorizeRoles('Admin', 'HR Manager'), deleteShift);

export default router;
