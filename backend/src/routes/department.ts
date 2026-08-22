import { Router } from 'express';
import { getDepartmentHierarchy, createDepartment } from '../controllers/department';
import { protect, authorizeRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { createDepartmentSchema } from '../middleware/schemas';

const router = Router();

// Apply auth protection middleware globally to all department routes
router.use(protect);

// GET department hierarchy structure (HR Manager / Admin access only)
router.get('/hierarchy', authorizeRoles('Admin', 'HR Manager'), getDepartmentHierarchy);

// POST create department (Admin only)
router.post('/', authorizeRoles('Admin'), validateRequest(createDepartmentSchema), createDepartment);

export default router;
