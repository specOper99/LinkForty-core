import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { buildAasaPayload, wellKnownRoutes } from './well-known.js';

describe('buildAasaPayload', () => {
  it('builds TeamID.BundleID appID', () => {
    expect(buildAasaPayload('ABC123', 'com.example.app')).toEqual({
      applinks: {
        apps: [],
        details: [{ appID: 'ABC123.com.example.app', paths: ['*'] }],
      },
    });
  });
});

describe('wellKnownRoutes', () => {
  const keys = [
    'IOS_TEAM_ID',
    'IOS_BUNDLE_ID',
    'ANDROID_PACKAGE_NAME',
    'ANDROID_SHA256_FINGERPRINTS',
  ] as const;
  const saved: Partial<Record<(typeof keys)[number], string | undefined>> = {};

  afterEach(() => {
    for (const k of keys) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  beforeEach(() => {
    for (const k of keys) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  async function buildApp() {
    const app = Fastify();
    await app.register(wellKnownRoutes);
    await app.ready();
    return app;
  }

  it('returns 404 when iOS env missing', async () => {
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/.well-known/apple-app-site-association' });
    expect(res.statusCode).toBe(404);
    await app.close();
  });

  it('serves AASA at /.well-known and root paths', async () => {
    process.env.IOS_TEAM_ID = 'TEAM1';
    process.env.IOS_BUNDLE_ID = 'com.demo.app';
    const app = await buildApp();

    for (const url of [
      '/.well-known/apple-app-site-association',
      '/apple-app-site-association',
    ]) {
      const res = await app.inject({ method: 'GET', url });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/json/);
      expect(res.json()).toEqual(buildAasaPayload('TEAM1', 'com.demo.app'));
    }
    await app.close();
  });

  it('serves assetlinks when Android env set', async () => {
    process.env.ANDROID_PACKAGE_NAME = 'com.demo.app';
    process.env.ANDROID_SHA256_FINGERPRINTS = 'AA:BB:CC,DD:EE:FF';
    const app = await buildApp();
    const res = await app.inject({ method: 'GET', url: '/.well-known/assetlinks.json' });
    expect(res.statusCode).toBe(200);
    expect(res.json()[0].target.package_name).toBe('com.demo.app');
    expect(res.json()[0].target.sha256_cert_fingerprints).toEqual(['AA:BB:CC', 'DD:EE:FF']);
    await app.close();
  });
});
