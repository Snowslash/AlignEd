import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('production deployment contract', () => {
  it('ships the canonical licences for the self-hosted estate fonts', () => {
    for (const license of ['OFL-Atkinson-Hyperlegible-Next.txt', 'OFL-Literata.txt']) {
      expect(readFileSync(`public/licenses/${license}`, 'utf8')).toBe(
        readFileSync(`node_modules/@sangeev/estate-ui/LICENSES/${license}`, 'utf8'),
      );
    }
  });

  it('emits portable relative asset URLs for embedded static previews', () => {
    const vite = readFileSync('vite.config.ts', 'utf8');

    expect(vite).toContain("base: './'");
    expect(vite).toContain("landing: path.resolve(__dirname, './index.html')");
    expect(vite).toContain("app: path.resolve(__dirname, './app/index.html')");
  });

  it('ships restrictive Cloudflare Pages security headers', () => {
    const headers = readFileSync('public/_headers', 'utf8');

    expect(headers).toContain('X-Frame-Options: DENY');
    expect(headers).toContain('X-Content-Type-Options: nosniff');
    expect(headers).toContain('Referrer-Policy: no-referrer');
    expect(headers).toContain('Permissions-Policy: camera=(), microphone=(), geolocation=()');
    expect(headers).toContain("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
  });

  it('deploys the built static assets to the production custom domain with Wrangler', () => {
    const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));

    expect(config.name).toBe('aligned');
    expect(config.assets).toMatchObject({ directory: './dist', not_found_handling: 'single-page-application' });
    expect(config.observability).toEqual({ enabled: false });
    expect(config.routes).toContainEqual({ pattern: 'aligned.sangeev.me', custom_domain: true });
  });
});
