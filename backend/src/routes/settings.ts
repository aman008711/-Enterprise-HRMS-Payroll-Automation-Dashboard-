import { Router } from 'express';
import { getSettings, updateSettings, sendTestEmail, sendTestChat } from '../controllers/settings';
import { protect, authorizeRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { updateSettingsSchema } from '../middleware/schemas';

const router = Router();

// Apply auth protection and admin restriction globally to all settings routes
router.use(protect);
router.use(authorizeRoles('Admin'));

router.route('/')
  .get(getSettings)
  .post(validateRequest(updateSettingsSchema), updateSettings);

router.post('/test-email', sendTestEmail);
router.post('/test-chat', sendTestChat);

export default router;
