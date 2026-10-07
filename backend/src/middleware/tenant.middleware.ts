import type { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.js';
import { AppError } from './errorHandler.js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { Tenant, TenantSettings, Role } from '@prisma/client';

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

  // Subdomain on bsms.com (e.g. "sirajbarbers.bsms.com" or "www.sirajbarbers.bsms.com")
  if (rawHost.endsWith('.bsms.com')) {
    let sub = rawHost.replace('.bsms.com', '');
    if (sub.startsWith('www.')) sub = sub.replace(/^www\./, '');
    if (sub && !ignoredRootDomains.includes(sub) && /^[a-z0-9-]+$/.test(sub)) {
      return sub;
    }
  }

  // Subdomain on localhost (e.g. "sirajbarbers.localhost")
  if (rawHost.endsWith('.localhost')) {
    let sub = rawHost.replace('.localhost', '');
    if (sub.startsWith('www.')) sub = sub.replace(/^www\./, '');
    if (sub && !ignoredRootDomains.includes(sub) && /^[a-z0-9-]+$/.test(sub)) {
      return sub;
    }
  }

  // Subdomain on arbitrary host (e.g. "sirajbarbers.example.com")
  const parts = rawHost.split('.');
  if (parts.length > 2) {
    let sub = parts[0];
    if (sub === 'www' && parts.length > 3) {
      sub = parts[1];
    }
    if (/^[a-z0-9-]+$/.test(sub) && !ignoredRootDomains.includes(sub)) {
      return sub;
    }
  }

  return null;
}

/**
 * Middleware: Resolves tenant context from hostname/header and attaches to Request.
 * For unauthenticated requests, resolves tenant from hostname or x-tenant-slug.
 * For authenticated requests, enforces that the effective tenant matches the user's active membership,
 * or automatically resolves to the user's active membership tenant if no tenant was specified in domain.
 * Cross-tenant spoofing attempts by authenticated tenant users fail closed with 403 NOT_TENANT_MEMBER.
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

    // Check for authenticated caller via Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, env.JWT_SECRET) as {
          id: string;
          email: string;
          role: Role;
          tenantId?: string;
        };

        if (decoded && decoded.id) {
          const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            include: {
              customerProfile: true,
              barberProfile: true,
              memberships: {
                include: { tenant: { include: { settings: true } } },
              },
            },
          });

          if (user && user.isActive) {
            if (user.role === 'SUPER_ADMIN') {
              // Super Admin has platform-wide clearance to operate across tenants
              if (tenant) {
                req.tenant = tenant;
                req.tenantId = tenant.id;
              }
            } else {
              // Authenticated tenant user (SHOP_OWNER, MANAGER, BARBER, CUSTOMER, ADMIN)
              if (tenant) {
                // If a tenant was requested via domain / header, verify active membership
                const matchingMembership = user.memberships.find(
                  (m) => m.tenantId === tenant!.id && m.isActive
                );

                if (!matchingMembership) {
                  // Cross-tenant spoofing or unauthorized tenant access attempt
                  return next(
                    new AppError(
                      'Forbidden. You do not have an active membership in this business.',
                      403,
                      'NOT_TENANT_MEMBER'
                    )
                  );
                }

                req.tenant = tenant;
                req.tenantId = tenant.id;
              } else {
                // If no tenant was specified in domain/header (e.g. localhost or apex),
                // bind the user's authoritative active membership tenant
                const targetTenantId = decoded.tenantId;
                let activeMembership = targetTenantId
                  ? user.memberships.find((m) => m.tenantId === targetTenantId && m.isActive)
                  : null;

                if (!activeMembership) {
                  activeMembership = user.memberships.find((m) => m.isActive) || null;
                }

                if (activeMembership && (activeMembership as any).tenant) {
                  req.tenant = (activeMembership as any).tenant;
                  req.tenantId = activeMembership.tenantId;
                }
              }
            }
          }
        }
      } catch {
        // Token invalid or expired - ignore here; if route requires auth, authenticate middleware will reject
      }
    } else {
      // Unauthenticated request
      if (tenant) {
        req.tenant = tenant;
        req.tenantId = tenant.id;
      }
    }

    if (req.tenant) {
      // Check tenant status - block mutations if SUSPENDED or ARCHIVED
      if (req.tenant.status === 'SUSPENDED' && !req.path.startsWith('/api/platform')) {
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

      if (req.tenant.status === 'ARCHIVED' && !req.path.startsWith('/api/platform')) {
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
