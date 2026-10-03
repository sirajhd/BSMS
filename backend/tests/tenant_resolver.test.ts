import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractTenantSlug } from '../src/middleware/tenant.middleware.js';
import type { Request } from 'express';

describe('SaaS Subdomain & Tenant Resolution Tests', () => {
  it('correctly extracts slug from production subdomain (shop.bsms.com)', () => {
    const mockReq = {
      headers: { host: 'sirajbarbers.bsms.com' },
      hostname: 'sirajbarbers.bsms.com',
    } as unknown as Request;

    assert.strictEqual(extractTenantSlug(mockReq), 'sirajbarbers');
  });

  it('correctly extracts slug from local development subdomain (shop.localhost:5000)', () => {
    const mockReq = {
      headers: { host: 'demo-shop.localhost:5000' },
      hostname: 'demo-shop.localhost',
    } as unknown as Request;

    assert.strictEqual(extractTenantSlug(mockReq), 'demo-shop');
  });

  it('correctly extracts slug from custom x-tenant-slug header override', () => {
    const mockReq = {
      headers: {
        host: 'localhost:5000',
        'x-tenant-slug': 'downtown-cuts',
      },
      hostname: 'localhost',
    } as unknown as Request;

    assert.strictEqual(extractTenantSlug(mockReq), 'downtown-cuts');
  });

  it('returns null for bare root domains and platform portals', () => {
    const rootHosts = [
      'localhost',
      'localhost:5000',
      '127.0.0.1:5000',
      'bsms.com',
      'www.bsms.com',
      'admin.bsms.com',
      'platform.bsms.com',
    ];

    for (const host of rootHosts) {
      const mockReq = {
        headers: { host },
        hostname: host.split(':')[0],
      } as unknown as Request;

      assert.strictEqual(
        extractTenantSlug(mockReq),
        null,
        `Expected ${host} to yield null tenant slug`
      );
    }
  });
});
