/// <reference types="node" />

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(path.join(process.cwd(), 'src/index.css'), 'utf8');
const landingCss = readFileSync(path.join(process.cwd(), 'src/landing/project-page.css'), 'utf8');
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
    const page = readFileSync(path.join(process.cwd(), 'src/landing/ProjectPage.tsx'), 'utf8');
    const project = readFileSync(path.join(process.cwd(), 'src/landing/project.ts'), 'utf8');
    const landingCss = readFileSync(path.join(process.cwd(), 'src/landing/project-page.css'), 'utf8');
    const landingEntry = readFileSync(landingEntryPath, 'utf8');
    const rootHtml = readFileSync(path.join(process.cwd(), 'index.html'), 'utf8');
    const appHtml = readFileSync(appHtmlPath, 'utf8');
    const vite = readFileSync(path.join(process.cwd(), 'vite.config.ts'), 'utf8');

    expect(landing).toContain('<ProjectPage project={project} />');
    expect(page).toContain('<PublicEstateHeader current={project.key as EstatePage}');
    expect(page).toContain('<EstateShell variant="landing">');
    expect(page).toContain('Source code and notes on GitHub');
    expect(project).toContain('key: "aligned"');
    expect(project).toContain('href: "./app/"');
    expect(project).toContain('sourceHref: "https://github.com/Snowslash/AlignEd"');
    expect(page + project).not.toContain('<Code');
    expect(project).toContain('anything that could identify a patient');
    expect(project).toContain('Your sessions are saved in this browser.');
    expect(project).toContain('Google keeps those answers until you delete them there.');
    expect(project).toContain('with the session title and date filled in.');
    expect(project).not.toContain('until you download them and add them here');
    expect(project).toContain('alt: "AlignEd as it opens: a choice between teaching you’ve done and teaching you’re planning');
    expect(page + project).not.toContain('build-note');
    expect(project).not.toContain('This is the current empty-state app');
    expect(landingCss).toContain('.title-stop { color: var(--estate-coral); }');
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

  it('keeps headings and landing-link hover states contrast-safe', () => {
    expect(css).toMatch(/h1,\s*h2,\s*h3\s*\{\s*color:\s*var\(--foreground\);/);
    expect(landingCss).not.toMatch(/:hover \{[^}]*color: var\(--accent\)/);
    expect(landingCss).toContain('.back-link:hover { text-decoration-line: underline; }');
    expect(landingCss).toContain('.desk-footer a:hover { text-decoration-line: underline; }');
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

it('Deep Atlas boot chrome matches both landing and app with semantic section rules', () => {
  for (const html of ['index.html', 'app/index.html']) {
    expect(readFileSync(path.join(process.cwd(), html), 'utf8')).toContain('name="theme-color" content="#061e1d"');
  }
  expect(landingCss).toMatch(/\[data-theme="dark"\],\s*\.dark \{\s*--desk-ground: var\(--estate-night\);/);
});
