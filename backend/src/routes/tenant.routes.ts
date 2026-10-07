import { Router } from 'express';
import { TenantController } from '../controllers/tenant.controller.js';
import { authenticate, requireRole, requireTenantMembership } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Authenticated: get current tenant context and branding
router.get(
  '/current',
  authenticate,
  requireTenantMembership,
  TenantController.getCurrent
);

// Shop Owner / Manager: update settings & branding
router.patch(
  '/settings',
  authenticate,
  requireRole(Role.SHOP_OWNER, Role.ADMIN),
  TenantController.updateSettings
);

// Shop Owner / Manager: view tenant subscription usage
router.get(
  '/usage',
  authenticate,
  requireRole(Role.SHOP_OWNER, Role.MANAGER, Role.ADMIN),
  TenantController.getUsage
);

// Shop Owner / Manager: view tenant audit logs
router.get(
  '/audit-logs',
  authenticate,
  requireRole(Role.SHOP_OWNER, Role.MANAGER, Role.ADMIN),
  TenantController.getAuditLogs
);

export default router;
