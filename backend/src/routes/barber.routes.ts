import { Router } from 'express';
import { BarberController } from '../controllers/barber.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

// Public: view barbers and their availability
router.get('/', BarberController.getAll);
router.get('/:id', BarberController.getById);
router.get('/:id/availability', BarberController.getAvailability);

// Admin-only management
router.post('/', authenticate, requireRole(Role.ADMIN), BarberController.create);
router.patch('/:id', authenticate, requireRole(Role.ADMIN, Role.BARBER), BarberController.update);
router.patch('/:id/toggle-status', authenticate, requireRole(Role.ADMIN), BarberController.toggleStatus);
router.put('/:id/availability', authenticate, requireRole(Role.ADMIN), BarberController.updateAvailability);

export default router;
