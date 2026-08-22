import { Router } from 'express';
import { register, login } from '../controllers/auth';
import { validateRequest } from '../middleware/validate';
import { registerSchema, loginSchema } from '../middleware/schemas';

const router = Router();

router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);

export default router;
