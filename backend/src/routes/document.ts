import { Router } from 'express';
import { 
  getDocuments, 
  createDocument, 
  signDocument, 
  updateDocumentStatus, 
  deleteDocument 
} from '../controllers/document';
import { protect, authorizeRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { createDocumentSchema } from '../middleware/schemas';

const router = Router();

// Apply auth globally to all document cabinet routes
router.use(protect);

router.route('/')
  .get(getDocuments)
  .post(validateRequest(createDocumentSchema), createDocument);

router.post('/:id/sign', authorizeRoles('Employee'), signDocument);

router.put('/:id/status', authorizeRoles('Admin', 'HR Manager'), updateDocumentStatus);

router.delete('/:id', deleteDocument);

export default router;
