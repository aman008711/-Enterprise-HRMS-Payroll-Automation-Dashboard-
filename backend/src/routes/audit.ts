import { Router } from 'express';
import { getAuditLogs } from '../controllers/audit';
import { protect, authorizeRoles } from '../middleware/auth';

const router = Router();

router.use(protect);
router.use(authorizeRoles('Admin')); // Dual-layered protection: controller checks and router checks

router.get('/', getAuditLogs);

export default router;
