import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('production deployment contract', () => {
  it('ships restrictive Cloudflare Pages security headers', () => {
    const headers = readFileSync('public/_headers', 'utf8');

    expect(headers).toContain('X-Frame-Options: DENY');
    expect(headers).toContain('X-Content-Type-Options: nosniff');
    expect(headers).toContain('Referrer-Policy: no-referrer');
    expect(headers).toContain('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    expect(headers).toContain("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  });
});
