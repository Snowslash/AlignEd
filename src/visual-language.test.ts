/// <reference types="node" />

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(path.join(process.cwd(), 'src/index.css'), 'utf8');
const buttons = readFileSync(path.join(process.cwd(), 'src/components/ui/button.tsx'), 'utf8');
const cards = readFileSync(path.join(process.cwd(), 'src/components/ui/card.tsx'), 'utf8');

const sharedTokens = [
  '--background: #f4f0e8',
  '--foreground: #1d1b18',
  '--card: #fbf8f2',
  '--primary: #8a1538',
  '--muted-foreground: #655e55',
  '--border: #c7b8a5',
  '--background: #1d1b18',
  '--foreground: #f4f0e8',
  '--card: #24211d',
  '--primary: #a3264d',
  '--ring: #c43b63',
];

describe('shared visual language contract', () => {
  it('keeps the canonical light and dark palette', () => {
    for (const token of sharedTokens) expect(css).toContain(token);
  });

  it('keeps square controls, cards and burgundy headings', () => {
    expect(css).toMatch(/h1,\s*h2,\s*h3\s*\{\s*color:\s*var\(--primary\)/s);
    expect(css).toContain('--radius: 0.25rem');
    expect(buttons).toContain('rounded-sm');
    expect(cards).toContain('rounded-sm border border-border');
    expect(cards).not.toContain('rounded-xl');
    const badges = readFileSync(path.join(process.cwd(), 'src/components/ui/badge.tsx'), 'utf8');
    expect(badges).toContain('rounded-sm');
    expect(badges).not.toContain('rounded-4xl');
  });
});
