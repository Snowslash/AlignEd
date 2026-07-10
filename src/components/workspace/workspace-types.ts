import type { TeachingSession } from '@/domain/core';

export const workspaceStages = [
  { id: 'capture', label: 'Capture' },
  { id: 'plan', label: 'Plan' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'reflect', label: 'Reflect' },
  { id: 'export', label: 'Export' },
] as const;

export type WorkspaceStageId = (typeof workspaceStages)[number]['id'];
export type PersistenceStatus = 'idle' | 'saved' | 'error';

export interface SessionStageProps {
  session: TeachingSession;
  onChange: (session: TeachingSession) => void;
}
