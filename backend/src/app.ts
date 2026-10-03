import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';

import healthRoutes from './routes/health.routes.js';
import authRoutes from './routes/auth.routes.js';
import tenantRoutes from './routes/tenant.routes.js';
import platformRoutes from './routes/platform.routes.js';
import serviceRoutes from './routes/service.routes.js';
import barberRoutes from './routes/barber.routes.js';
import customerRoutes from './routes/customer.routes.js';
import scheduleRoutes from './routes/schedule.routes.js';
import availabilityRoutes from './routes/availability.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import uploadRoutes from './routes/upload.routes.js';

import { resolveTenant } from './middleware/tenant.middleware.js';
import { errorHandler, AppError } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { apiRateLimiter } from './middleware/rateLimiter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const createApp = () => {
  const app = express();

  // Trust reverse proxy (Nginx) for secure IP and protocol headers
  app.set('trust proxy', 1);

  // Security HTTP Headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // Cross-Origin Resource Sharing (CORS) with strict allowlist
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow non-browser requests (e.g. server-to-server, curl, tests) without Origin header
        if (!origin) return callback(null, true);

        const isLocalhost = /^https?:\/\/([a-z0-9-]+\.)?localhost(:\d+)?$/i.test(origin);
        const isLoopback = /^https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(origin);
        const isBsmsDomain = /^https?:\/\/([a-z0-9-]+\.)?bsms\.com$/i.test(origin);
        const isExplicitFrontend = origin === env.FRONTEND_URL;

        let isFrontendSubdomain = false;
        if (env.FRONTEND_URL) {
          try {
            const parsedUrl = new URL(env.FRONTEND_URL);
            const apex = parsedUrl.hostname.replace(/^www\./, '');
            const subRegex = new RegExp(`^https?:\\/\\/([a-z0-9-]+\\.)?${apex.replace(/\./g, '\\.')}(:\\d+)?$`, 'i');
            isFrontendSubdomain = subRegex.test(origin);
          } catch {
            // ignore
          }
        }

        if (isLocalhost || isLoopback || isBsmsDomain || isExplicitFrontend || isFrontendSubdomain) {
          return callback(null, true);
        }

        if (env.NODE_ENV === 'production') {
          return callback(new AppError('Blocked by CORS policy.', 403, 'CORS_DISALLOWED'));
        }

        return callback(null, true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-slug', 'x-tenant-id'],
    })
  );

  // HTTP Request Logging
  if (env.NODE_ENV !== 'test') {
    app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  }

  // Request Body Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static File Serving for Uploaded Assets
  const uploadsPath = path.join(__dirname, '..', env.UPLOAD_DIR);
  app.use('/uploads', express.static(uploadsPath));

  // Global Rate Limiter for general API traffic
  app.use('/api', apiRateLimiter);

  // Health check endpoint (public, unisolated)
  app.use('/api', healthRoutes);

  // Global Tenant Resolver Middleware (injects req.tenant and req.tenantId)
  app.use('/api', resolveTenant);

  // Mount API Endpoints
  app.use('/api/auth', authRoutes);
  app.use('/api/tenant', tenantRoutes);
  app.use('/api/platform', platformRoutes);
  app.use('/api/services', serviceRoutes);
  app.use('/api/barbers', barberRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/business-schedule', scheduleRoutes);
  app.use('/api/availability', availabilityRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/uploads', uploadRoutes);

  // 404 Catch-All Handler
  app.use(notFoundHandler);

  // Centralized Error Handling Middleware
  app.use(errorHandler);

  return app;
};
