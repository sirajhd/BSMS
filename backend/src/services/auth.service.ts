import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import type {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
  ChangePasswordInput,
} from '../validators/auth.validator.js';

export class AuthService {
  static generateToken(user: { id: string; email: string; role: Role }) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  static sanitizeUser(user: any) {
    const { passwordHash, ...sanitized } = user;
    return sanitized;
  }

  static async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw new AppError('An account with this email address already exists.', 409, 'EMAIL_EXISTS');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email.toLowerCase(),
          passwordHash,
          role: Role.CUSTOMER,
          isActive: true,
          customerProfile: {
            create: {
              fullName: input.fullName,
              phone: input.phone,
              profileImage: input.profileImage || null,
            },
          },
        },
        include: {
          customerProfile: true,
        },
      });

      // Welcome notification
      await tx.notification.create({
        data: {
          userId: user.id,
          title: 'Welcome to Crown & Blade',
          message: 'Your account has been registered successfully. Explore services and book your first cut!',
          type: 'BOOKING_CONFIRMED',
          isRead: false,
        },
      });

      return user;
    });

    const token = this.generateToken(result);

    return {
      user: {
        id: result.id,
        email: result.email,
        role: result.role,
        isActive: result.isActive,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      },
      profile: result.customerProfile ? {
        id: result.customerProfile.id,
        userId: result.customerProfile.userId,
        fullName: result.customerProfile.fullName,
        phone: result.customerProfile.phone,
        profileImage: result.customerProfile.profileImage || undefined,
        createdAt: result.customerProfile.createdAt.toISOString(),
        updatedAt: result.customerProfile.updatedAt.toISOString(),
      } : null,
      token,
    };
  }

  static async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: {
        customerProfile: true,
        barberProfile: true,
      },
    });

    if (!user) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated. Please contact support.', 403, 'ACCOUNT_DEACTIVATED');
    }

    const token = this.generateToken(user);
    const profile = user.customerProfile || user.barberProfile;

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      profile: profile ? {
        id: profile.id,
        userId: profile.userId,
        fullName: profile.fullName,
        phone: profile.phone,
        profileImage: profile.profileImage || undefined,
        ...( 'isActive' in profile ? { isActive: profile.isActive } : {} ),
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      } : null,
      token,
    };
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: true,
        barberProfile: true,
      },
    });

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const profile = user.customerProfile || user.barberProfile;

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      profile: profile ? {
        id: profile.id,
        userId: profile.userId,
        fullName: profile.fullName,
        phone: profile.phone,
        profileImage: profile.profileImage || undefined,
        ...( 'isActive' in profile ? { isActive: profile.isActive } : {} ),
        createdAt: profile.createdAt.toISOString(),
        updatedAt: profile.updatedAt.toISOString(),
      } : null,
    };
  }

  static async updateProfile(userId: string, input: UpdateProfileInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customerProfile: true,
        barberProfile: true,
      },
    });

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    if (user.role === Role.CUSTOMER && user.customerProfile) {
      const updated = await prisma.customerProfile.update({
        where: { id: user.customerProfile.id },
        data: {
          fullName: input.fullName,
          phone: input.phone,
          profileImage: input.profileImage !== undefined ? input.profileImage : undefined,
        },
      });
      return updated;
    }

    if (user.role === Role.BARBER && user.barberProfile) {
      const updated = await prisma.barber.update({
        where: { id: user.barberProfile.id },
        data: {
          fullName: input.fullName,
          phone: input.phone,
          profileImage: input.profileImage !== undefined ? input.profileImage : undefined,
        },
      });
      return updated;
    }

    throw new AppError('No profile associated with this user role.', 400, 'NO_PROFILE');
  }

  static async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    const isMatch = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Current password is incorrect.', 400, 'INVALID_PASSWORD');
    }

    const newHash = await bcrypt.hash(input.newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { success: true, message: 'Password updated successfully.' };
  }
}
