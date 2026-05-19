/**
 * Settings provisioning failure tests.
 *
 * Guards the silent-failure regression: when downloadPbf rejects, the wizard
 * must see a status of 'error' on /api/settings/provision-status so the UI
 * can surface the failure. Previously the `.catch` handlers only logged,
 * leaving the wizard pinned at "Downloading 0%" forever.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';

const redisGet = vi.fn();
const redisSet = vi.fn();
const getBestMethod = vi.fn();

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    get: redisGet,
    set: redisSet,
  })),
}));

vi.mock('../services/provision.service.js', () => ({
  provisionService: {
    getBestMethod,
    isCloudAvailable: vi.fn().mockResolvedValue(false),
  },
}));

vi.mock('../services/tile.service.js', () => ({
  tileService: {
    warmCache: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../services/backup.service.js', () => ({
  backupService: {
    createEncryptedBackup: vi.fn(),
  },
}));

vi.mock('../services/audit.service.js', () => ({
  logAdminAction: vi.fn(),
}));

vi.mock('../config.js', () => ({
  config: {
    REDIS_URL: 'redis://localhost:6379',
    GEOCODING_URL: 'http://localhost:8088',
  },
}));

vi.mock('../db/index.js', () => ({
  db: { execute: vi.fn() },
}));

const { default: settingsRoutes } = await import('../routes/settings.routes.js');

// Bounds entirely inside California, so findCoveringExtracts returns ['california']
const CA_SETTINGS = {
  orgName: 'Test',
  serviceArea: {
    lat: 37.44,
    lng: -122.16,
    zoom: 13,
    label: 'Palo Alto',
    bounds: { south: 37.41, west: -122.19, north: 37.47, east: -122.13 },
  },
};

function makeApp() {
  const app = Fastify();
  app.decorate('requireAdmin', async () => {});
  app.decorate('requireUnlocked', async () => {});
  return app;
}

function findErrorStatusCall() {
  return redisSet.mock.calls.find(([key, value]) => {
    if (key !== 'map:provision:status' || typeof value !== 'string') return false;
    try {
      return JSON.parse(value).status === 'error';
    } catch {
      return false;
    }
  });
}

describe('settingsRoutes provisioning failures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    redisGet.mockImplementation(async (key: string) => {
      if (key === 'org:settings') return JSON.stringify(CA_SETTINGS);
      return null;
    });
    redisSet.mockResolvedValue('OK');
  });

  it("writes status:'error' when the local PBF download fails", async () => {
    getBestMethod.mockResolvedValue({ method: 'local' });

    // Make every outbound HTTP request fail immediately so downloadPbf rejects.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED')));

    const app = makeApp();
    await app.register(settingsRoutes);

    const res = await app.inject({
      method: 'POST',
      url: '/api/settings/provision-maps',
      payload: {},
    });

    expect(res.statusCode).toBe(200);

    // The download runs in the background. Wait until the error status is
    // observed, with a hard cap so a regression fails the test instead of
    // hanging it.
    const deadline = Date.now() + 5_000;
    while (!findErrorStatusCall() && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
    }

    const errorCall = findErrorStatusCall();
    expect(errorCall, 'expected redis.set to receive an error status').toBeTruthy();

    const parsed = JSON.parse(errorCall![1] as string);
    expect(parsed.status).toBe('error');
    expect(parsed.message).toMatch(/ECONNREFUSED|Unknown/);

    await app.close();
    vi.unstubAllGlobals();
  });

  it("writes status:'error' when the prebuilt download fails and the local fallback also fails", async () => {
    getBestMethod.mockResolvedValue({
      method: 'prebuilt',
      region: { name: 'California', pbfSize: 100_000_000, osrmSize: 200_000_000 },
    });

    // Mock the dynamic import so downloadPrebuilt throws immediately
    const { provisionService } = await import('../services/provision.service.js');
    (provisionService as any).downloadPrebuilt = vi
      .fn()
      .mockRejectedValue(new Error('prebuilt 404'));

    // Local fallback fetch also fails
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connect ETIMEDOUT')));

    const app = makeApp();
    await app.register(settingsRoutes);

    const res = await app.inject({
      method: 'POST',
      url: '/api/settings/provision-maps',
      payload: {},
    });

    expect(res.statusCode).toBe(200);

    const deadline = Date.now() + 5_000;
    while (!findErrorStatusCall() && Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, 50));
    }

    const errorCall = findErrorStatusCall();
    expect(errorCall, 'expected redis.set to receive an error status after prebuilt + local both failed').toBeTruthy();

    const parsed = JSON.parse(errorCall![1] as string);
    expect(parsed.status).toBe('error');

    await app.close();
    vi.unstubAllGlobals();
  });
});
