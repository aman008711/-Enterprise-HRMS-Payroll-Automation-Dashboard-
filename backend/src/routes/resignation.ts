import { Router } from 'express';
import { getResignations, submitResignation, processResignation, terminateEmployee } from '../controllers/resignation';
import { protect, authorizeRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { createResignationSchema, updateResignationSchema } from '../middleware/schemas';

const router = Router();

router.use(protect);

router.get('/', getResignations);

// Employees submit resignation
router.post('/', authorizeRoles('Employee'), validateRequest(createResignationSchema), submitResignation);

// Admin/HR approves resignation or initiates direct termination
router.put('/:id/status', authorizeRoles('Admin', 'HR Manager'), validateRequest(updateResignationSchema), processResignation);
router.post('/terminate', authorizeRoles('Admin', 'HR Manager'), terminateEmployee);

export default router;
