import { Router } from 'express';
import { PlatformController } from '../controllers/platform.controller.js';
import { authenticate, requireSuperAdmin } from '../middleware/auth.middleware.js';

const router = Router();

// All platform routes require authentication and SUPER_ADMIN platform role
router.use(authenticate, requireSuperAdmin);

// Overview metrics
router.get('/overview', PlatformController.getOverview);

// Business Management
router.get('/businesses', PlatformController.getBusinesses);
router.post('/businesses', PlatformController.createBusiness);
router.get('/businesses/:id', PlatformController.getBusinessById);
router.patch('/businesses/:id', PlatformController.updateBusiness);
router.post('/businesses/:id/suspend', PlatformController.suspendBusiness);
router.post('/businesses/:id/activate', PlatformController.activateBusiness);
router.post('/businesses/:id/archive', PlatformController.archiveBusiness);
router.post('/businesses/:id/change-plan', PlatformController.changeTenantPlan);

// Users across platform
router.get('/users', PlatformController.getUsers);

// SaaS Plans & Subscriptions
router.get('/plans', PlatformController.getPlans);
router.post('/plans', PlatformController.createPlan);
router.get('/subscriptions', PlatformController.getSubscriptions);

// Audit Logs
router.get('/audit-logs', PlatformController.getAuditLogs);

export default router;
