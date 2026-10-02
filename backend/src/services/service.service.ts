import prisma from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';
import type { CreateServiceInput, UpdateServiceInput } from '../validators/service.validator.js';

export class ServiceService {
  static async getAllServices(includeInactive = false) {
    return prisma.service.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { price: 'asc' },
    });
  }

  static async getServiceById(id: string) {
    const service = await prisma.service.findUnique({
      where: { id },
    });
    if (!service) {
      throw new AppError('Service not found.', 404, 'SERVICE_NOT_FOUND');
    }
    return service;
  }

  static async createService(input: CreateServiceInput) {
    return prisma.service.create({
      data: input,
    });
  }

  static async updateService(id: string, input: UpdateServiceInput) {
    await this.getServiceById(id);
    return prisma.service.update({
      where: { id },
      data: input,
    });
  }

  static async toggleServiceStatus(id: string) {
    const current = await this.getServiceById(id);
    return prisma.service.update({
      where: { id },
      data: { isActive: !current.isActive },
    });
  }
}
