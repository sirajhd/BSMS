import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendSuccess } from '../utils/response.js';

const storage = multer.diskStorage({
  destination: (req: Request, _file, cb) => {
    if (!req.tenant?.slug) {
      return cb(new AppError('Tenant context is required for uploads.', 400, 'TENANT_REQUIRED'), '');
    }

    const tenantFolder = req.tenant.slug;
    const targetDir = path.join(process.cwd(), env.UPLOAD_DIR, tenantFolder);

    try {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      cb(null, targetDir);
    } catch (err: any) {
      cb(err, targetDir);
    }
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '.jpg';
    const safeName = `${crypto.randomUUID()}${safeExt}`;
    cb(null, safeName);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Only JPEG, PNG, and WebP image files are allowed.', 400, 'INVALID_FILE_TYPE'));
  }
};

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // Strict 2MB max
  },
});

/**
 * Validates actual file content header signatures (magic bytes)
 */
function isValidImageSignature(filePath: string): boolean {
  try {
    const buffer = Buffer.alloc(12);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 12, 0);
    fs.closeSync(fd);

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return true;
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return true;
    }

    // WebP: RIFF .... WEBP
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export class UploadController {
  static handleUpload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new AppError('No file was uploaded.', 400, 'NO_FILE');
      }

      if (!req.tenant?.slug) {
        // Clean up file if somehow written
        if (req.file.path && fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        throw new AppError('Tenant context is required for file uploads.', 400, 'TENANT_REQUIRED');
      }

      // Deep inspection: verify file signature against magic bytes
      if (!isValidImageSignature(req.file.path)) {
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        throw new AppError(
          'File validation failed. Uploaded content does not match allowed image signatures.',
          400,
          'INVALID_FILE_SIGNATURE'
        );
      }

      const tenantFolder = req.tenant.slug;
      const fileUrl = `/uploads/${tenantFolder}/${req.file.filename}`;

      return sendSuccess(
        res,
        'File uploaded successfully.',
        {
          url: fileUrl,
          filename: req.file.filename,
          size: req.file.size,
          tenantSlug: tenantFolder,
        },
        201
      );
    } catch (err) {
      next(err);
    }
  }
}
