import { Router } from 'express';
import { ScheduleController } from '../controllers/schedule.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Public: view shop hours
router.get('/', ScheduleController.getBusinessSchedule);

// Admin: update shop operating hours
router.put('/', authenticate, requireRole(Role.ADMIN), ScheduleController.updateBusinessSchedule);

export default router;
