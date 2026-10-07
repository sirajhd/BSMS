import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';
import prisma from '../config/prisma.js';
import type { Role, Membership } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role | null; // Authoritative role within the active tenant context
  platformRole: Role; // Global platform role
  customerId?: string;
  barberId?: string;
  tenantId?: string;
  activeMembership?: Membership | null;
  memberships: Membership[];
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authenticate = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Authentication required. Please sign in.', 401, 'UNAUTHORIZED'));
    }

    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      email: string;
      role: Role;
      tenantId?: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        customerProfile: true,
        barberProfile: true,
        memberships: {
          include: { tenant: true },
        },
      },
    });

    if (!user) {
      return next(new AppError('User session is invalid. Please log in again.', 401, 'USER_NOT_FOUND'));
    }

    if (!user.isActive) {
      return next(
        new AppError('Your account has been deactivated. Please contact support.', 403, 'ACCOUNT_DEACTIVATED')
      );
    }

    // Determine target tenant context
    const currentTenantId = req.tenantId || decoded.tenantId;

    let activeMembership: Membership | null = null;
    let effectiveRole: Role | null = user.role;

    // Authoritative tenant membership resolution
    if (user.role === 'SUPER_ADMIN') {
      effectiveRole = 'SUPER_ADMIN';
    } else if (currentTenantId) {
      // Find active membership strictly for the requested tenant
      const membership = user.memberships.find(
        (m) => m.tenantId === currentTenantId && m.isActive
      );

      if (membership) {
        activeMembership = membership;
        effectiveRole = membership.role;
      } else {
        // User does NOT have active membership in this tenant.
        // Fail closed: Do NOT inherit global role and do NOT grant default customer access without membership.
        activeMembership = null;
        effectiveRole = null;
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: effectiveRole,
      platformRole: user.role,
      customerId: user.customerProfile?.id,
      barberId: user.barberProfile?.id,
      tenantId: currentTenantId,
      activeMembership,
      memberships: user.memberships,
    };

    if (!req.tenantId && currentTenantId) {
      req.tenantId = currentTenantId;
      if (!req.tenant && activeMembership && 'tenant' in activeMembership) {
        req.tenant = (activeMembership as any).tenant;
      }
    }

    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError) {
      return next(new AppError('Invalid or expired authentication token.', 401, 'TOKEN_INVALID'));
    }
    next(err);
  }
};

/**
 * Reusable Middleware: Requires an active membership in the current tenant.
 */
export const requireTenantMembership = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
  }

  if (req.user.platformRole === 'SUPER_ADMIN') {
    return next();
  }

  if (!req.tenantId) {
    return next(new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED'));
  }

  if (!req.user.activeMembership || !req.user.activeMembership.isActive) {
    return next(
      new AppError(
        'Forbidden. You do not have an active membership in this business.',
        403,
        'NOT_TENANT_MEMBER'
      )
    );
  }

  next();
};

/**
 * Role-Based Access Control Middleware.
 * Strictly enforces active tenant membership for tenant operations.
 */
export const requireRole = (...allowedRoles: Role[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
    }

    const platformRole = req.user.platformRole;

    // Super Admin has universal platform administrative clearance
    if (platformRole === 'SUPER_ADMIN') {
      return next();
    }

    // Normalizing legacy ADMIN checks to allow SHOP_OWNER
    let effectiveAllowed = [...allowedRoles];
    if (allowedRoles.includes('ADMIN' as Role)) {
      effectiveAllowed.push('SUPER_ADMIN' as Role, 'SHOP_OWNER' as Role);
    }

    // If operating in a tenant context, verify active tenant membership
    if (req.tenantId) {
      if (!req.user.activeMembership || !req.user.activeMembership.isActive) {
        return next(
          new AppError(
            'Forbidden. You do not have an active membership in this business.',
            403,
            'NOT_TENANT_MEMBER'
          )
        );
      }

      const tenantRole = req.user.activeMembership.role;
      if (!effectiveAllowed.includes(tenantRole)) {
        return next(
          new AppError(
            'Forbidden. Your role in this business does not have permission to perform this action.',
            403,
            'FORBIDDEN'
          )
        );
      }

      return next();
    }

    // Non-tenant contextual routes: check effective role
    const hasPermission =
      (req.user.role && effectiveAllowed.includes(req.user.role)) ||
      effectiveAllowed.includes(platformRole);

    if (!hasPermission) {
      return next(
        new AppError(
          'Forbidden. You do not possess the required permissions to perform this action.',
          403,
          'FORBIDDEN'
        )
      );
    }

    next();
  };
};

/**
 * Super Admin-Only Middleware for Platform Routes.
 */
export const requireSuperAdmin = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) {
    return next(new AppError('Authentication required.', 401, 'UNAUTHORIZED'));
  }

  if (req.user.platformRole !== 'SUPER_ADMIN') {
    return next(
      new AppError(
        'Forbidden. This action requires platform super administrator privileges.',
        403,
        'SUPER_ADMIN_REQUIRED'
      )
    );
  }

  next();
};
