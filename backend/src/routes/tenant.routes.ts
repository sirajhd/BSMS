import { Router } from 'express';
import { TenantController } from '../controllers/tenant.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Public: get current tenant context and branding
router.get('/current', TenantController.getCurrent);

// Shop Owner / Manager: update settings & branding
router.patch(
  '/settings',
  authenticate,
  requireRole(Role.SHOP_OWNER, Role.ADMIN),
  TenantController.updateSettings
);

// Shop Owner / Manager: view tenant audit logs
router.get(
  '/audit-logs',
  authenticate,
  requireRole(Role.SHOP_OWNER, Role.MANAGER, Role.ADMIN),
  TenantController.getAuditLogs
);

export default router;
