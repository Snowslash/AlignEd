/// <reference types="node" />

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const appCss = readFileSync(path.join(process.cwd(), 'src/App.css'), 'utf8');
const contractCss = readFileSync(path.join(process.cwd(), 'node_modules/@sangeev/estate-ui/src/contract.css'), 'utf8');

function readSourceTree(root: string): string {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    if (entry.isDirectory()) return [readSourceTree(target)];
    return /\.(?:ts|tsx)$/.test(entry.name) ? [readFileSync(target, 'utf8')] : [];
  }).join('\n');
}

const sourceTree = readSourceTree(path.join(process.cwd(), 'src'));

describe('keyboard focus styling', () => {
  it('inherits the unlayered visible focus fallback from the versioned estate contract', () => {
    expect(contractCss).toMatch(
      /:focus-visible\s*\{[^}]*outline:\s*2px solid var\(--estate-focus\);[^}]*outline-offset:\s*2px;[^}]*box-shadow:\s*none;/s,
    );
    expect(appCss).not.toMatch(/:focus-visible/);
    expect(sourceTree).not.toMatch(/focus-visible:(?:ring|border-ring)/);
  });
});

describe('printed evidence preservation', () => {
  it('wraps long authored paragraphs and unbroken artefact locations instead of clipping A4 output', () => {
    const printPack = appCss.match(/\[data-print-evidence-pack\][^{]*\{([^}]*)\}/s)?.[1] ?? '';
    expect(printPack).toMatch(/white-space:\s*pre-wrap\s*!important/);
    expect(printPack).toMatch(/overflow-wrap:\s*anywhere\s*!important/);
  });
});

describe('legacy CSS retirement', () => {
  it('does not retain global legacy component rules or migrated class selectors', () => {
    expect(appCss).not.toMatch(/--legacy-|\.workspace\b|\.summary-grid\b|\.panel\b|\.stepper\b/);
    expect(appCss).not.toMatch(/(^|})\s*button\s*\{/m);
    expect(appCss).not.toMatch(/(^|})\s*(input|textarea|select|label|main|h1|h2|h3|p)(\s*,|\s*\{)/m);
  });

  it('keeps print output scoped to the evidence pack without legacy layout selectors', () => {
    expect(appCss).toMatch(/@media print\s*\{[^}]*\[data-print-hidden\][^}]*display:\s*none\s*!important/s);
    expect(appCss).toMatch(/\[data-print-evidence-pack\][^{]*\{[^}]*max-height:\s*none/s);
  });
});
