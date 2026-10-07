import { Router } from 'express';
import { ManagerController } from '../controllers/manager.controller.js';
import {
  authenticate,
  requireRole,
  requireTenantMembership,
} from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// All manager management routes require authentication, active tenant membership, and administrative role (SHOP_OWNER or ADMIN)
router.use(
  authenticate,
  requireTenantMembership,
  requireRole(Role.SHOP_OWNER, Role.ADMIN)
);

// Endpoints
router.get('/', ManagerController.getAll);
router.post('/', ManagerController.create);
router.get('/:id', ManagerController.getById);
router.patch('/:id', ManagerController.update);
router.patch('/:id/toggle-status', ManagerController.toggleStatus);

export default router;
