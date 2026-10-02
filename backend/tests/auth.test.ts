import { describe, it } from 'node:test';
import assert from 'node:assert';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { AuthService } from '../src/services/auth.service.js';
import { env } from '../src/config/env.js';

describe('Security & Authentication Tests', () => {
  it('securely hashes and verifies passwords using bcrypt', async () => {
    const rawPass = 'SecretPassword123!';
    const hash = await bcrypt.hash(rawPass, 10);

    assert.notStrictEqual(hash, rawPass);
    assert.strictEqual(await bcrypt.compare(rawPass, hash), true);
    assert.strictEqual(await bcrypt.compare('WrongPassword', hash), false);
  });

  it('generates verifiable signed JWT tokens', () => {
    const userPayload = {
      id: 'test-user-id-123',
      email: 'user@barbershop.com',
      role: Role.CUSTOMER,
    };

    const token = AuthService.generateToken(userPayload);
    assert.ok(typeof token === 'string' && token.length > 20);

    const decoded = jwt.verify(token, env.JWT_SECRET) as any;
    assert.strictEqual(decoded.id, userPayload.id);
    assert.strictEqual(decoded.email, userPayload.email);
    assert.strictEqual(decoded.role, userPayload.role);
  });
});
