import { Router } from 'express';
import { UploadController, uploadMiddleware } from '../controllers/upload.controller.js';
import { authenticate, requireTenantMembership } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', authenticate, requireTenantMembership, uploadMiddleware.single('image'), UploadController.handleUpload);

export default router;
