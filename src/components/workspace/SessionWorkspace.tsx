import { useEffect, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatUkDate, type TeachingSession } from '@/domain/core';
import { SaveState } from './SaveState';
import { WorkflowNavigation } from './WorkflowNavigation';
import type { PersistenceStatus, WorkspaceStageId } from './workspace-types';

interface SessionWorkspaceProps {
  session: TeachingSession;
  currentStage: WorkspaceStageId;
  persistenceStatus: PersistenceStatus;
  onBackToSessions: () => void;
  onStageChange: (stage: WorkspaceStageId) => void;
  children: ReactNode;
}

export function SessionWorkspace({
  session,
  currentStage,
  persistenceStatus,
  onBackToSessions,
  onStageChange,
  children,
}: SessionWorkspaceProps) {
  useEffect(() => {
    (document.querySelector<HTMLElement>(`[data-workspace-stage-heading="${currentStage}"]`)
      ?? document.querySelector<HTMLElement>('[data-workflow-heading]'))?.focus();
  }, [currentStage, session.id]);

  return (
    <section className="mt-5 space-y-5" aria-label="Session workspace">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4" data-print-hidden>
        <div className="space-y-1">
          <Button className="-ml-2" onClick={onBackToSessions} type="button" variant="ghost">
            <ArrowLeft data-icon="inline-start" />
            Back to sessions
          </Button>
          <h2 className="font-heading text-2xl font-semibold tracking-tight">{session.title}</h2>
          <p className="text-sm text-muted-foreground">{formatUkDate(session.date)} · {session.audience}</p>
        </div>
        <SaveState status={persistenceStatus} />
      </div>
      <WorkflowNavigation currentStage={currentStage} onChange={onStageChange} />
      <div data-workspace-stage={currentStage}>{children}</div>
    </section>
  );
}
