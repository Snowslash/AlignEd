/// <reference types="node" />

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(path.join(process.cwd(), 'src/index.css'), 'utf8');
const app = readFileSync(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
const sessionsHome = readFileSync(path.join(process.cwd(), 'src/components/sessions/SessionsHome.tsx'), 'utf8');
const buttons = readFileSync(path.join(process.cwd(), 'src/components/ui/button.tsx'), 'utf8');
const cards = readFileSync(path.join(process.cwd(), 'src/components/ui/card.tsx'), 'utf8');

describe('shared visual language contract', () => {
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
