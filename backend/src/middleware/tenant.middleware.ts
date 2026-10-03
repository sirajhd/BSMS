import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';
import { AppError } from './errorHandler.js';
import type { Tenant, TenantSettings } from '@prisma/client';

export type TenantWithSettings = Tenant & {
  settings?: TenantSettings | null;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenant?: TenantWithSettings | null;
      tenantId?: string;
    }
  }
}

/**
 * Extracts and sanitizes the tenant slug from hostname or headers.
 * Supported examples:
 * - `shop-slug.bsms.com` -> `shop-slug`
 * - `shop-slug.localhost:5000` -> `shop-slug`
 * - `shop-slug.localhost` -> `shop-slug`
 * - Header `x-tenant-slug: shop-slug` -> `shop-slug`
 */
export function extractTenantSlug(req: Request): string | null {
  // 1. Direct header override (selection hint)
  const headerSlug = req.headers['x-tenant-slug'] as string | undefined;
  if (headerSlug && headerSlug.trim()) {
    const normalized = headerSlug.trim().toLowerCase();
    // Validate slug structure: only lowercase alphanumeric and hyphens
    if (/^[a-z0-9-]+$/.test(normalized)) {
      return normalized;
    }
    return null;
  }

  // 2. Parse Host / Hostname header
  const rawHost = (req.headers.host || req.hostname || '').split(':')[0].toLowerCase();

  // Root or platform domains that do NOT indicate a tenant subdomain
  const ignoredRootDomains = [
    'localhost',
    '127.0.0.1',
    'bsms.com',
    'www.bsms.com',
    'api.bsms.com',
    'admin.bsms.com',
    'platform.bsms.com',
  ];

  if (!rawHost || ignoredRootDomains.includes(rawHost)) {
    return null;
  }

  // Subdomain on bsms.com (e.g. "sirajbarbers.bsms.com")
  if (rawHost.endsWith('.bsms.com')) {
    const sub = rawHost.replace('.bsms.com', '');
    if (sub && !ignoredRootDomains.includes(sub) && /^[a-z0-9-]+$/.test(sub)) {
      return sub;
    }
  }

  // Subdomain on localhost (e.g. "sirajbarbers.localhost")
  if (rawHost.endsWith('.localhost')) {
    const sub = rawHost.replace('.localhost', '');
    if (sub && !ignoredRootDomains.includes(sub) && /^[a-z0-9-]+$/.test(sub)) {
      return sub;
    }
  }

  // Subdomain on arbitrary host (e.g. "sirajbarbers.example.com")
  const parts = rawHost.split('.');
  if (parts.length > 2) {
    const sub = parts[0];
    if (/^[a-z0-9-]+$/.test(sub) && !ignoredRootDomains.includes(sub)) {
      return sub;
    }
  }

  return null;
}

/**
 * Middleware: Resolves tenant context from hostname/header and attaches to Request.
 * Note: Tenant resolution is only a context-hint; authentication & membership verification
 * must always be performed to authorize actual tenant operations.
 */
export const resolveTenant = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const slug = extractTenantSlug(req);
    let tenant: TenantWithSettings | null = null;

    try {
      if (slug) {
        tenant = await prisma.tenant.findUnique({
          where: { slug },
          include: { settings: true },
        });
      }
    } catch {
      // In standalone unit tests or when database is offline, allow non-tenant routes to proceed
      return next();
    }

    if (tenant) {
      // Check tenant status - block mutations if SUSPENDED or ARCHIVED
      if (tenant.status === 'SUSPENDED' && !req.path.startsWith('/api/platform')) {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
          return next(
            new AppError(
              'This business account is temporarily suspended. Operations are disabled.',
              403,
              'TENANT_SUSPENDED'
            )
          );
        }
      }

      if (tenant.status === 'ARCHIVED' && !req.path.startsWith('/api/platform')) {
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
          return next(
            new AppError(
              'This business account has been archived. Modifications are forbidden.',
              403,
              'TENANT_ARCHIVED'
            )
          );
        }
      }

      req.tenant = tenant;
      req.tenantId = tenant.id;
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Middleware: Requires a valid tenant context on the request.
 */
export const requireTenant = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.tenantId || !req.tenant) {
    return next(
      new AppError(
        'Tenant context could not be resolved. Please verify the domain or business slug.',
        400,
        'TENANT_REQUIRED'
      )
    );
  }
  next();
};
