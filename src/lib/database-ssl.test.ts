import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { resolveDatabaseConfig, resolvePoolSsl } from './database.js';

describe('resolvePoolSsl', () => {
  const prevSsl = process.env.DATABASE_SSL;
  const prevNode = process.env.NODE_ENV;

  afterEach(() => {
    if (prevSsl === undefined) delete process.env.DATABASE_SSL;
    else process.env.DATABASE_SSL = prevSsl;
    if (prevNode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevNode;
  });

  it('disables SSL when URL has sslmode=disable even if NODE_ENV=production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.DATABASE_SSL;
    expect(
      resolvePoolSsl(
        'postgresql://linkforty:changeme@postgres:5432/linkforty?sslmode=disable'
      )
    ).toBe(false);
  });

  it('enables SSL for sslmode=require (managed Postgres / Fly)', () => {
    delete process.env.DATABASE_SSL;
    expect(
      resolvePoolSsl('postgresql://u:p@db.example:5432/linkforty?sslmode=require')
    ).toEqual({ rejectUnauthorized: false });
  });

  it('honors DATABASE_SSL override', () => {
    process.env.DATABASE_SSL = 'false';
    expect(
      resolvePoolSsl('postgresql://u:p@db.example:5432/linkforty?sslmode=require')
    ).toBe(false);
  });

  it('defaults to no SSL when there is no URL (discrete PG config)', () => {
    delete process.env.DATABASE_SSL;
    expect(resolvePoolSsl('')).toBe(false);
  });
});

describe('resolveDatabaseConfig', () => {
  const keys = [
    'DATABASE_URL',
    'DATABASE_SSL',
    'PGHOST',
    'PGPORT',
    'PGUSER',
    'PGPASSWORD',
    'PGDATABASE',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_DB',
  ] as const;
  const prev: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of keys) {
      prev[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of keys) {
      if (prev[key] === undefined) delete process.env[key];
      else process.env[key] = prev[key];
    }
  });

  it('prefers DATABASE_URL when set', () => {
    process.env.DATABASE_URL =
      'postgresql://u:p@db.example:5432/linkforty?sslmode=require';
    process.env.PGHOST = 'should-not-use-this-host';
    const cfg = resolveDatabaseConfig();
    expect(cfg.mode).toBe('url');
    if (cfg.mode === 'url') {
      expect(cfg.connectionString).toContain('db.example');
      expect(cfg.ssl).toEqual({ rejectUnauthorized: false });
    }
  });

  it('uses discrete POSTGRES_* + PGHOST without stuffing password into a URL', () => {
    process.env.PGHOST = 'postgres';
    process.env.POSTGRES_USER = 'mediazan';
    process.env.POSTGRES_PASSWORD = 'sec$ret@with#chars';
    process.env.POSTGRES_DB = 'linkforty';
    process.env.DATABASE_SSL = 'false';
    const cfg = resolveDatabaseConfig();
    expect(cfg).toEqual({
      mode: 'discrete',
      host: 'postgres',
      port: 5432,
      user: 'mediazan',
      password: 'sec$ret@with#chars',
      database: 'linkforty',
      ssl: false,
    });
  });

  it('strips trailing newlines from password but keeps quotes', () => {
    process.env.PGHOST = 'postgres';
    process.env.POSTGRES_USER = 'mediazan';
    process.env.POSTGRES_PASSWORD = '"secret"\n';
    process.env.POSTGRES_DB = 'linkforty';
    const cfg = resolveDatabaseConfig();
    expect(cfg.mode).toBe('discrete');
    if (cfg.mode === 'discrete') {
      expect(cfg.password).toBe('"secret"');
    }
  });

  it('falls back to localhost URL when nothing is configured', () => {
    const cfg = resolveDatabaseConfig();
    expect(cfg.mode).toBe('url');
    if (cfg.mode === 'url') {
      expect(cfg.connectionString).toContain('localhost:5432/linkforty');
    }
  });
});

