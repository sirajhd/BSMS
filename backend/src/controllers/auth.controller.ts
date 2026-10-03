import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { sendSuccess } from '../utils/response.js';
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  changePasswordSchema,
} from '../validators/auth.validator.js';

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = registerSchema.parse(req.body);
      const result = await AuthService.register(validated, req.tenantId);
      return sendSuccess(res, 'Account registered successfully.', result, 201);
    } catch (err) {
      next(err);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const validated = loginSchema.parse(req.body);
      const result = await AuthService.login(validated, req.tenantId);
      return sendSuccess(res, 'Logged in successfully.', result, 200);
    } catch (err) {
      next(err);
    }
  }

  static async logout(_req: Request, res: Response, next: NextFunction) {
    try {
      return sendSuccess(res, 'Logged out successfully.', null, 200);
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const result = await AuthService.getMe(userId, req.tenantId);
      return sendSuccess(res, 'User profile fetched successfully.', result, 200);
    } catch (err) {
      next(err);
    }
  }

  static async updateProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const validated = updateProfileSchema.parse(req.body);
      const result = await AuthService.updateProfile(userId, validated);
      return sendSuccess(res, 'Profile updated successfully.', result, 200);
    } catch (err) {
      next(err);
    }
  }

  static async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const validated = changePasswordSchema.parse(req.body);
      const result = await AuthService.changePassword(userId, validated);
      return sendSuccess(res, 'Password changed successfully.', result, 200);
    } catch (err) {
      next(err);
    }
  }
}
