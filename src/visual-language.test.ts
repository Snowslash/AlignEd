/// <reference types="node" />

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(path.join(process.cwd(), 'src/index.css'), 'utf8');
const app = readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
const sessionsHome = readFileSync(path.join(process.cwd(), 'src/components/sessions/SessionsHome.tsx'), 'utf8');
const buttons = readFileSync(path.join(process.cwd(), 'src/components/ui/button.tsx'), 'utf8');
const cards = readFileSync(path.join(process.cwd(), 'src/components/ui/card.tsx'), 'utf8');

describe('shared visual language contract', () => {
  it('serves a landing page at the root while keeping the tracker at /app/', () => {
    const landingPath = path.join(process.cwd(), 'src/landing/LandingPage.tsx');
    const landingEntryPath = path.join(process.cwd(), 'src/landing/main.tsx');
    const appHtmlPath = path.join(process.cwd(), 'app/index.html');

    expect(existsSync(landingPath)).toBe(true);
    expect(existsSync(landingEntryPath)).toBe(true);
    expect(existsSync(appHtmlPath)).toBe(true);

    const landing = readFileSync(landingPath, 'utf8');
    const landingCss = readFileSync(path.join(process.cwd(), 'src/landing/styles.css'), 'utf8');
    const landingEntry = readFileSync(landingEntryPath, 'utf8');
    const rootHtml = readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
    const appHtml = readFileSync(appHtmlPath, 'utf8');
    const vite = readFileSync(path.join(process.cwd(), 'vite.config.ts'), 'utf8');

    expect(landing).toContain('<PublicEstateHeader current="aligned"');
    expect(landing).toContain('<EstateShell variant="landing">');
    expect(landing).toContain('href="./app/"');
    expect(landing).toContain('className="estate-primary-action estate-icon-action" href="https://github.com/Snowslash/AlignEd" aria-label="Source on GitHub" title="Source on GitHub"><GitHubMark');
    expect(landing).not.toContain('<Code');
    expect(landing).toContain('Do not enter patient-identifiable information');
    expect(landing).toContain('stored only in this browser');
    expect(landing).toContain('alt="AlignEd showing two routes for completed or planned teaching');
    expect(landing).not.toContain('build-note');
    expect(landing).not.toContain('<figcaption>');
    expect(landing).not.toContain('This is the current empty-state app');
    expect(landingCss).toContain('border-block-end: 1px solid var(--estate-shoal)');
    expect(landingCss).toContain('.hero::after');
    expect(landingCss).toContain('background: var(--estate-coral)');
    expect(landingEntry).toContain('initialiseEstateTheme()');
    expect(rootHtml).toContain('src="/src/landing/main.tsx"');
    expect(appHtml).toContain('src="/src/main.tsx"');
    expect(vite).toContain('input:');
    expect(vite).toContain("app: path.resolve(__dirname, './app/index.html')");
  });

  it('consumes the exact versioned successor contract', () => {
    expect(css).toContain('@import "@sangeev/estate-ui/contract.css"');
    expect(app).toContain("from '@sangeev/estate-ui'");
    expect(app).toContain("variant=\"wide-app\"");
    expect(app).toContain('<EstatePageTitle variant="app">AlignEd</EstatePageTitle>');
    expect(sessionsHome).toContain("import { EstateBoundary } from '@sangeev/estate-ui'");
    expect(sessionsHome).toContain('<EstateBoundary className="max-w-4xl text-sm leading-6" label="Privacy and local storage">');
  });

  it('keeps square controls and cards', () => {
    expect(buttons).toContain('rounded-sm');
    expect(cards).toContain('rounded-sm border border-border');
    expect(cards).not.toContain('rounded-xl');
    const badges = readFileSync(path.join(process.cwd(), 'src/components/ui/badge.tsx'), 'utf8');
    expect(badges).toContain('rounded-sm');
    expect(badges).not.toContain('rounded-4xl');
  });
});
