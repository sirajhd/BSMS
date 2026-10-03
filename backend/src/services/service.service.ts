import prisma from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import { AuditService } from './audit.service.js';
import type { CreateServiceInput, UpdateServiceInput } from '../validators/service.validator.js';

export class ServiceService {
  static async getAllServices(tenantId?: string, includeInactive = false) {
    if (!tenantId) {
      return [];
    }

    return prisma.service.findMany({
      where: {
        tenantId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: { price: 'asc' },
    });
  }

  static async getServiceById(id: string, tenantId?: string) {
    if (!tenantId) {
      throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
    }

    const service = await prisma.service.findFirst({
      where: {
        id,
        tenantId,
      },
    });

    if (!service) {
      throw new AppError('Service not found.', 404, 'SERVICE_NOT_FOUND');
    }
    return service;
  }

  static async createService(input: CreateServiceInput, tenantId?: string, actorUserId?: string) {
    if (!tenantId) {
      throw new AppError('Tenant context is required to create a service.', 400, 'TENANT_REQUIRED');
    }

    const existing = await prisma.service.findFirst({
      where: {
        tenantId,
        name: input.name,
      },
    });

    if (existing) {
      throw new AppError('A service with this name already exists in your shop.', 409, 'SERVICE_EXISTS');
    }

    const service = await prisma.service.create({
      data: {
        ...input,
        tenantId,
      },
    });

    await AuditService.log({
      tenantId,
      actorUserId,
      action: 'SERVICE_CREATED',
      entity: 'Service',
      entityId: service.id,
      metadata: { name: service.name, price: service.price },
    });

    return service;
  }

  static async updateService(id: string, input: UpdateServiceInput, tenantId?: string, actorUserId?: string) {
    if (!tenantId) {
      throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
    }

    await this.getServiceById(id, tenantId);

    const updateRes = await prisma.service.updateMany({
      where: { id, tenantId },
      data: input,
    });

    if (updateRes.count === 0) {
      throw new AppError('Service could not be updated or does not belong to this shop.', 400, 'UPDATE_FAILED');
    }

    const updated = await prisma.service.findUnique({
      where: { id },
    });

    if (!updated) {
      throw new AppError('Service not found.', 404, 'SERVICE_NOT_FOUND');
    }

    await AuditService.log({
      tenantId,
      actorUserId,
      action: 'SERVICE_UPDATED',
      entity: 'Service',
      entityId: updated.id,
      metadata: input,
    });

    return updated;
  }

  static async toggleServiceStatus(id: string, tenantId?: string, actorUserId?: string) {
    if (!tenantId) {
      throw new AppError('Tenant context is required.', 400, 'TENANT_REQUIRED');
    }

    const current = await this.getServiceById(id, tenantId);

    const updateRes = await prisma.service.updateMany({
      where: { id, tenantId },
      data: { isActive: !current.isActive },
    });

    if (updateRes.count === 0) {
      throw new AppError('Service could not be updated or does not belong to this shop.', 400, 'UPDATE_FAILED');
    }

    const updated = await prisma.service.findUnique({
      where: { id },
    });

    if (!updated) {
      throw new AppError('Service not found.', 404, 'SERVICE_NOT_FOUND');
    }

    await AuditService.log({
      tenantId,
      actorUserId,
      action: 'SERVICE_STATUS_TOGGLED',
      entity: 'Service',
      entityId: updated.id,
      metadata: { isActive: updated.isActive },
    });

    return updated;
  }
}
