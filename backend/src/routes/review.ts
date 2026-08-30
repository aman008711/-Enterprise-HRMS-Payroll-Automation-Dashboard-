import { Router } from 'express';
import { getReviews, createReview, updateReview, approveReview } from '../controllers/review';
import { protect, authorizeRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { createReviewSchema, updateReviewSchema } from '../middleware/schemas';

const router = Router();

// Apply auth globally to all performance review and appraisal routes
router.use(protect);

router.route('/')
  .get(getReviews)
  .post(authorizeRoles('Employee'), validateRequest(createReviewSchema), createReview);

router.route('/:id')
  .put(validateRequest(updateReviewSchema), updateReview);

router.post('/:id/approve', authorizeRoles('Admin', 'HR Manager'), approveReview);

export default router;
