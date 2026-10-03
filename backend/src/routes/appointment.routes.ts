import { Router } from 'express';
import { AppointmentController } from '../controllers/appointment.controller.js';
import { authenticate, requireTenantMembership } from '../middleware/auth.middleware.js';

const router = Router();

// Protected: all appointment routes require authentication and active tenant membership
router.use(authenticate, requireTenantMembership);

router.get('/', AppointmentController.getAppointments);
router.get('/:id', AppointmentController.getById);
router.post('/', AppointmentController.create);
router.post('/walk-in', AppointmentController.createWalkIn);
router.post('/:id/cancel', AppointmentController.cancel);
router.post('/:id/reschedule', AppointmentController.reschedule);
router.patch('/:id/status', AppointmentController.updateStatus);

export default router;
