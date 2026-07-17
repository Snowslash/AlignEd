/// <reference types="node" />

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const appCss = readFileSync(path.join(process.cwd(), 'src/App.css'), 'utf8');
const contractCss = readFileSync(path.join(process.cwd(), 'node_modules/@sangeev/estate-ui/src/contract.css'), 'utf8');

describe('keyboard focus styling', () => {
  it('inherits the unlayered visible focus fallback from the versioned estate contract', () => {
    expect(contractCss).toMatch(
      /:focus-visible\s*\{[^}]*outline:\s*(?!0|none)[^;]+;[^}]*outline-offset:\s*(?!0)[^;]+;/s,
    );
    expect(appCss).not.toMatch(/:focus-visible/);
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
