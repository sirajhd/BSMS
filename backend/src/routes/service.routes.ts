import { Router } from 'express';
import { ServiceController } from '../controllers/service.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Public: list and view services
router.get('/', ServiceController.getAll);
router.get('/:id', ServiceController.getById);

// Admin-only mutations
router.post('/', authenticate, requireRole(Role.ADMIN), ServiceController.create);
router.patch('/:id', authenticate, requireRole(Role.ADMIN), ServiceController.update);
router.patch('/:id/toggle-status', authenticate, requireRole(Role.ADMIN), ServiceController.toggleStatus);

export default router;
