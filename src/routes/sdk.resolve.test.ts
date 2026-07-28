import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

vi.mock('../lib/database.js', () => ({
  db: { query: vi.fn() },
}));

vi.mock('../lib/fingerprint.js', () => ({
  recordInstallEvent: vi.fn(),
  generateFingerprintHash: vi.fn(),
  storeFingerprintForClick: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/webhook.js', () => ({
  triggerWebhooks: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../lib/event-emitter.js', () => ({
  emitClickEvent: vi.fn(),
}));

import Fastify, { type FastifyInstance } from 'fastify';
import { db } from '../lib/database.js';
import { sdkRoutes } from './sdk.js';

const mockQuery = db.query as unknown as Mock;

const LINK_ID = '22222222-2222-4222-8222-222222222222';
const CLICK_ID = '44444444-4444-4444-8444-444444444444';

const linkRow = {
  id: LINK_ID,
  short_code: 'tester',
  user_id: 'user-1',
  original_url: 'https://en.964media.com/story/1',
  ios_universal_link: 'https://en.964media.com/story/1',
  android_app_link: 'https://en.964media.com/story/1',
  ios_app_store_url: 'https://apps.apple.com/app/id123',
  android_app_store_url: 'https://play.google.com/store/apps/details?id=com.example',
  web_fallback_url: 'https://en.964media.com/',
  deep_link_path: '/story/1',
  app_scheme: null,
  utm_parameters: { utm_source: 'sms' },
  deep_link_parameters: { id: '1' },
  is_active: true,
  expires_at: null,
};

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify();
  await app.register(sdkRoutes);
  await app.ready();
  return app;
}

describe('GET /api/sdk/v1/resolve/:shortCode', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('returns originalUrl, iosUniversalLink, and androidAppLink with store URLs unchanged', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [linkRow] })
      .mockResolvedValue({ rows: [{ id: CLICK_ID }] });

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/sdk/v1/resolve/tester',
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({
      shortCode: 'tester',
      linkId: LINK_ID,
      deepLinkPath: '/story/1',
      originalUrl: 'https://en.964media.com/story/1',
      iosUniversalLink: 'https://en.964media.com/story/1',
      androidAppLink: 'https://en.964media.com/story/1',
      iosUrl: 'https://apps.apple.com/app/id123',
      androidUrl: 'https://play.google.com/store/apps/details?id=com.example',
      webUrl: 'https://en.964media.com/',
      utmParameters: { utm_source: 'sms' },
      customParameters: { id: '1' },
    });
    expect(res.json().appScheme).toBeUndefined();
    expect(res.json().clickedAt).toEqual(expect.any(String));

    await new Promise((r) => setImmediate(r));
    await app.close();
  });

  it('omits empty content / store fields', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            ...linkRow,
            ios_universal_link: null,
            android_app_link: '',
            ios_app_store_url: null,
            android_app_store_url: null,
            web_fallback_url: null,
            deep_link_path: null,
            utm_parameters: null,
            deep_link_parameters: null,
          },
        ],
      })
      .mockResolvedValue({ rows: [{ id: CLICK_ID }] });

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/sdk/v1/resolve/tester',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.originalUrl).toBe('https://en.964media.com/story/1');
    expect(body.iosUniversalLink).toBeUndefined();
    expect(body.androidAppLink).toBeUndefined();
    expect(body.iosUrl).toBeUndefined();
    expect(body.androidUrl).toBeUndefined();
    expect(body.webUrl).toBeUndefined();

    await new Promise((r) => setImmediate(r));
    await app.close();
  });

  it('returns 404 when link missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const app = await buildApp();
    const res = await app.inject({
      method: 'GET',
      url: '/api/sdk/v1/resolve/missing',
    });

    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: 'Link not found' });
    await app.close();
  });
});
