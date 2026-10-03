import { Router } from 'express';
import { PaymentController } from '../controllers/payment.controller.js';
import { authenticate, requireRole, requireTenantMembership } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate, requireTenantMembership);

// Admin: view all payment records
router.get('/', requireRole(Role.ADMIN), PaymentController.getAllPayments);
router.get('/appointment/:appointmentId', PaymentController.getByAppointmentId);
router.patch('/:id/status', requireRole(Role.ADMIN, Role.BARBER), PaymentController.updateStatus);

export default router;
