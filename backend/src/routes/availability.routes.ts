import { Router } from 'express';
import { AvailabilityController } from '../controllers/availability.controller.js';

const router = Router();

// Public: check available start times for a service, barber, and date
router.get('/', AvailabilityController.getAvailableSlots);

export default router;
