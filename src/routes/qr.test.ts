import { describe, expect, it } from 'vitest';
import { resolveShortlinkBase } from './qr.js';

describe('resolveShortlinkBase', () => {
  it('prefers SHORTLINK_BASE_URL with trailing slash stripped', () => {
    expect(
      resolveShortlinkBase({
        shortlinkBaseUrl: 'https://links.example.com/',
        shortlinkDomain: 'ignored.example.com',
        protocol: 'http',
        hostname: 'localhost',
      })
    ).toBe('https://links.example.com');
  });

  it('adds https when SHORTLINK_DOMAIN is host-only', () => {
    expect(
      resolveShortlinkBase({
        shortlinkDomain: 'links.example.com',
        protocol: 'http',
        hostname: 'localhost',
      })
    ).toBe('https://links.example.com');
  });

  it('keeps scheme when SHORTLINK_DOMAIN is already absolute', () => {
    expect(
      resolveShortlinkBase({
        shortlinkDomain: 'http://links.example.com',
        protocol: 'https',
        hostname: 'localhost',
      })
    ).toBe('http://links.example.com');
  });

  it('falls back to request protocol + hostname', () => {
    expect(
      resolveShortlinkBase({
        protocol: 'https',
        hostname: 'go.example.com',
      })
    ).toBe('https://go.example.com');
  });
});
