import { Router } from 'express';
import { CustomerController } from '../controllers/customer.controller.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticate, requireRole(Role.ADMIN), CustomerController.getAll);
router.get('/:id', authenticate, CustomerController.getById);

export default router;
