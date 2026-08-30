import { Router, Response } from 'express';
import { getEmployees, onboardEmployee, sendCustomEmail } from '../controllers/employee';
import { protect, authorizeRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { onboardEmployeeSchema } from '../middleware/schemas';
import Employee from '../models/Employee';
import { advancedResults } from '../middleware/advancedResults';
import { AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Apply authentication security to all employee routes
router.use(protect);

// Allow only Admin and HR Manager roles to onboard and view employee rosters
router.get(
  '/', 
  authorizeRoles('Admin', 'HR Manager'), 
  advancedResults(Employee, [
    { path: 'user', select: 'email role' },
    { path: 'department', select: 'name code' },
    { path: 'manager', select: 'firstName lastName employeeId jobTitle' }
  ]), 
  (req: AuthenticatedRequest, res: Response) => {
    res.status(200).json((res as any).advancedResults);
  }
);

router.post('/', authorizeRoles('Admin', 'HR Manager'), validateRequest(onboardEmployeeSchema), onboardEmployee);
router.post('/:id/email', authorizeRoles('Admin', 'HR Manager'), sendCustomEmail);

export default router;
