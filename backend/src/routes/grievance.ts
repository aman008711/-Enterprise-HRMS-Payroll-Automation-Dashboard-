import { Router } from 'express';
import { getGrievances, submitGrievance, resolveGrievance } from '../controllers/grievance';
import { protect, authorizeRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { createGrievanceSchema, resolveGrievanceSchema } from '../middleware/schemas';

const router = Router();

router.use(protect);

router.get('/', getGrievances);

// Employees submit grievances
router.post('/', authorizeRoles('Employee'), validateRequest(createGrievanceSchema), submitGrievance);

// Admin/HR Manager resolves grievances
router.put('/:id/resolve', authorizeRoles('Admin', 'HR Manager'), validateRequest(resolveGrievanceSchema), resolveGrievance);

export default router;
