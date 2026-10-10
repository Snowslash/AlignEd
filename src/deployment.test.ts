import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('production deployment contract', () => {
  it('gives only the indexable landing its self-canonical', () => {
    expect(readFileSync('index.html', 'utf8')).toContain('<link rel="canonical" href="https://aligned.sangeev.me/" />');
    expect(readFileSync('app/index.html', 'utf8')).not.toMatch(/rel="canonical"|name="robots"/i);
  });

  it('ships a standalone missing-page document rather than a landing or app shell', () => {
    const html = readFileSync('public/404.html', 'utf8');
    expect(html).toContain('<h1>Page not found</h1>');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/app/"');
    expect(html).not.toMatch(/<script\b|id="root"/i);
  });

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

  it('publishes canonical crawler discovery files', () => {
    const robots = readFileSync('public/robots.txt', 'utf8');
    const sitemap = readFileSync('public/sitemap.xml', 'utf8');

    expect(robots).toBe('User-agent: *\nAllow: /\n\nSitemap: https://aligned.sangeev.me/sitemap.xml\n');
    expect(sitemap).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemap).toContain('<loc>https://aligned.sangeev.me/</loc>');
    expect(sitemap).not.toMatch(/<html\b/i);
  });

  it('deploys the built static assets to the production custom domain with Wrangler', () => {
    const config = JSON.parse(readFileSync('wrangler.jsonc', 'utf8'));

    expect(config.name).toBe('aligned');
    expect(config.assets).toMatchObject({ directory: './dist', not_found_handling: '404-page' });
    expect(config.observability).toEqual({ enabled: false });
    expect(config.routes).toContainEqual({ pattern: 'aligned.sangeev.me', custom_domain: true });
  });
});
