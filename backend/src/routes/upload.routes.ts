import { Router } from 'express';
import { UploadController, uploadMiddleware } from '../controllers/upload.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/', authenticate, uploadMiddleware.single('image'), UploadController.handleUpload);

export default router;
