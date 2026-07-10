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
});
