import { afterEach, describe, expect, it } from 'vitest';
import { resolvePoolSsl } from './database.js';

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
});
