import prisma from '../config/prisma.js';

export interface AuditLogData {
  tenantId?: string | null;
  actorUserId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Record<string, any> | string | null;
  ipAddress?: string | null;
}

export class AuditService {
  static async log(data: AuditLogData): Promise<void> {
    try {
      const metadataStr =
        typeof data.metadata === 'object' && data.metadata !== null
          ? JSON.stringify(data.metadata)
          : data.metadata || null;

      await prisma.auditLog.create({
        data: {
          tenantId: data.tenantId || null,
          actorUserId: data.actorUserId || null,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId || null,
          metadata: metadataStr,
          ipAddress: data.ipAddress || null,
        },
      });
    } catch (err) {
      console.error('⚠️ Failed to write audit log:', err);
      // Non-blocking: audit log failure should not crash primary operations
    }
  }

  static async getTenantAuditLogs(tenantId: string, limit = 100) {
    return prisma.auditLog.findMany({
      where: { tenantId },
      include: {
        actorUser: {
          select: { id: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  static async getPlatformAuditLogs(limit = 200) {
    return prisma.auditLog.findMany({
      include: {
        tenant: {
          select: { id: true, name: true, slug: true },
        },
        actorUser: {
          select: { id: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
