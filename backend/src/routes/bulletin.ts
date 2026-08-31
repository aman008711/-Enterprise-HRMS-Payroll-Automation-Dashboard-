import { Router } from 'express';
import { getBulletins, createBulletin, deleteBulletin } from '../controllers/bulletin';
import { protect, authorizeRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { createBulletinSchema } from '../middleware/schemas';

const router = Router();

router.use(protect);

router.get('/', getBulletins);

// Publishing and deleting restricted to Admin / HR Manager
router.post('/', authorizeRoles('Admin', 'HR Manager'), validateRequest(createBulletinSchema), createBulletin);
router.delete('/:id', authorizeRoles('Admin', 'HR Manager'), deleteBulletin);

export default router;
