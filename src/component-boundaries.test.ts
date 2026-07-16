/// <reference types="node" />

import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const sourceRoot = path.join(process.cwd(), 'src');

describe('session workflow component boundaries', () => {
  it('keeps the Sessions home, backup controls, entry form, Plan, Feedback, Reflect, and Export stages out of App.tsx', () => {
    const appSource = readFileSync(path.join(sourceRoot, 'App.tsx'), 'utf8');
    const sessionsHomeSource = readFileSync(path.join(sourceRoot, 'components/sessions/SessionsHome.tsx'), 'utf8');

    expect(appSource).not.toMatch(/function SessionEntryPanel/);
    expect(appSource).not.toMatch(/function ObjectiveEditor/);
    expect(appSource).not.toMatch(/function FeedbackPanel/);
    expect(appSource).not.toMatch(/function ReflectStage/);
    expect(appSource).not.toMatch(/function ExportPanel/);
    expect(appSource).not.toMatch(/aria-labelledby="sessions-home-title"/);
    expect(existsSync(path.join(sourceRoot, 'components/sessions/SessionEntryPanel.tsx'))).toBe(true);
    expect(existsSync(path.join(sourceRoot, 'components/sessions/SessionsHome.tsx'))).toBe(true);
    expect(existsSync(path.join(sourceRoot, 'components/backup/BackupRestorePanel.tsx'))).toBe(true);
    expect(existsSync(path.join(sourceRoot, 'components/workspace/PlanStage.tsx'))).toBe(true);
    expect(existsSync(path.join(sourceRoot, 'components/workspace/FeedbackStage.tsx'))).toBe(true);
    expect(existsSync(path.join(sourceRoot, 'components/workspace/ReflectStage.tsx'))).toBe(true);
    expect(existsSync(path.join(sourceRoot, 'components/workspace/ExportStage.tsx'))).toBe(true);
    expect(sessionsHomeSource).not.toContain('Application backup');
  });

  it('keeps UI variant factories private to their component modules', () => {
    const badgeSource = readFileSync(path.join(sourceRoot, 'components/ui/badge.tsx'), 'utf8');
    const buttonSource = readFileSync(path.join(sourceRoot, 'components/ui/button.tsx'), 'utf8');

    expect(badgeSource).toContain('export { Badge }');
    expect(buttonSource).toContain('export { Button }');
  });

  it('keeps the unused CSV template helper out of the domain API', () => {
    const coreSource = readFileSync(path.join(sourceRoot, 'domain/core.ts'), 'utf8');

    expect(coreSource).not.toContain('export function buildCsvTemplate');
  });

  it('reuses one module-scoped London date formatter', () => {
    const coreSource = readFileSync(path.join(sourceRoot, 'domain/core.ts'), 'utf8');
    const formatterDeclaration = coreSource.indexOf('const londonDateFormatter = new Intl.DateTimeFormat');
    const todayFunction = coreSource.indexOf('export function todayIso');

    expect(formatterDeclaration).toBeGreaterThan(-1);
    expect(formatterDeclaration).toBeLessThan(todayFunction);
    expect(coreSource.slice(todayFunction)).toContain('londonDateFormatter.formatToParts(new Date())');
  });
});
