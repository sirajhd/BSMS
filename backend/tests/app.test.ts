import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createApp } from '../src/app.js';
import type { Server } from 'http';

describe('API Foundation & Health Check Tests', () => {
  let server: Server;
  const port = 5099;
  const baseUrl = `http://localhost:${port}`;

  it('starts app and responds 200 OK on GET /api/health', async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(port, () => resolve());
    });

    try {
      const res = await fetch(`${baseUrl}/api/health`);
      const json = await res.json();

      assert.strictEqual(res.status, 200);
      assert.strictEqual(json.success, true);
      assert.strictEqual(json.data.status, 'UP');
      assert.ok(json.message.includes('healthy'));
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it('returns 404 with standard error JSON on unknown route', async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(port, () => resolve());
    });

    try {
      const res = await fetch(`${baseUrl}/api/non-existent-route`);
      const json = await res.json();

      assert.strictEqual(res.status, 404);
      assert.strictEqual(json.success, false);
      assert.strictEqual(json.code, 'NOT_FOUND');
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
