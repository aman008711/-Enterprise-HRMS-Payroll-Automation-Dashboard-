import { Router } from 'express';
import { clockIn, clockOut, getTodayStatus, getMyAttendanceLogs, getAllAttendanceLogs } from '../controllers/attendance';
import { protect, authorizeRoles } from '../middleware/auth';

const router = Router();

// Apply auth protection globally to all attendance routes
router.use(protect);

router.post('/clock-in', clockIn);
router.post('/clock-out', clockOut);
router.get('/today', getTodayStatus);
router.get('/my-logs', getMyAttendanceLogs);
router.get('/all', authorizeRoles('Admin', 'HR Manager'), getAllAttendanceLogs);

export default router;
