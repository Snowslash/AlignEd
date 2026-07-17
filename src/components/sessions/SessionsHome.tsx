import { ArrowRight, CalendarPlus, FileText, Plus } from 'lucide-react';
import { EstateBoundary } from '@sangeev/estate-ui';
import { BackupRestorePanel } from '@/components/backup/BackupRestorePanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { type TeachingSession, todayIso } from '@/domain/core';
import { sortSessionsForHome } from '@/domain/workflow';
import { SessionCard } from './SessionCard';
import type { EntryMode } from './types';

interface SessionsHomeProps {
  sessions: TeachingSession[];
  importStatus: string;
  onOpenEntry: (mode: EntryMode) => void;
  onOpenSession: (id: string) => void;
  onAddDemo: () => void;
  backupImportFocusRequest: number;
  onDownloadBackup: () => void;
  onDeleteAllData: () => void;
  onImportBackup: (raw: string) => void;
}

export function SessionsHome({
  sessions,
  importStatus,
  onOpenEntry,
  onOpenSession,
  onAddDemo,
  backupImportFocusRequest,
  onDownloadBackup,
  onDeleteAllData,
  onImportBackup,
}: SessionsHomeProps) {
  const sortedSessions = sortSessionsForHome(sessions, todayIso());

  return (
    <section className="mt-8 space-y-8" aria-labelledby="sessions-home-title">
      <div className="max-w-3xl space-y-2">
        <h2 className="font-heading text-2xl font-semibold tracking-tight" id="sessions-home-title">What are you doing?</h2>
        <p className="text-muted-foreground">Capture something that has already happened or prepare the evidence plan before you teach.</p>
      </div>

      <EstateBoundary className="max-w-4xl text-sm leading-6" label="Privacy and local storage">
        <p className="font-semibold">Stored only in this browser</p>
        <p className="mt-1">Data is not uploaded or synced. Records remain on this device until deleted or browser data is cleared.</p>
        <p className="mt-2"><strong>Do not enter patient-identifiable information.</strong> Avoid learner-identifiable information unless it is necessary. Download a JSON backup before clearing browser data or moving devices.</p>
      </EstateBoundary>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/35 bg-card shadow-none ring-0">
          <CardHeader>
            <FileText className="size-5 text-primary" aria-hidden="true" />
            <CardTitle><h3 className="font-heading text-lg font-semibold">Teaching completed</h3></CardTitle>
            <CardDescription>Save the factual minimum in about a minute. Complete the rest now or return later.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full justify-between" data-entry-route="retrospective" onClick={() => onOpenEntry('retrospective')} size="lg" type="button">
              Log teaching I have just done
              <ArrowRight data-icon="inline-end" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border bg-card shadow-none ring-0">
          <CardHeader>
            <CalendarPlus className="size-5 text-primary" aria-hidden="true" />
            <CardTitle><h3 className="font-heading text-lg font-semibold">Teaching planned</h3></CardTitle>
            <CardDescription>Set up the session, objectives and intended evidence before the date.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full justify-between" data-entry-route="prospective" onClick={() => onOpenEntry('prospective')} size="lg" type="button" variant="outline">
              Plan an upcoming session
              <ArrowRight data-icon="inline-end" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-4" aria-labelledby="session-list-title">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div>
            <h2 className="font-heading text-2xl font-semibold" id="session-list-title" tabIndex={-1}>Sessions</h2>
            <p className="text-sm text-muted-foreground">Resume a record without losing locally saved work.</p>
          </div>
          <Button onClick={onAddDemo} type="button" variant="ghost">
            <Plus data-icon="inline-start" />
            Add demo data
          </Button>
        </div>
        {sessions.length === 0 ? (
          <Card className="border-dashed bg-transparent py-10 text-center shadow-none ring-0">
            <CardContent>
              <p className="font-heading text-lg font-semibold">No sessions yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Choose one of the two routes above to begin.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sortedSessions.map((session) => (
              <SessionCard key={session.id} selected={false} session={session} onSelect={() => onOpenSession(session.id)} />
            ))}
          </div>
        )}
      </section>

      <BackupRestorePanel
        focusImportRequest={backupImportFocusRequest}
        importStatus={importStatus}
        onDownloadBackup={onDownloadBackup}
        onDeleteAllData={onDeleteAllData}
        onImportBackup={onImportBackup}
        sessionCount={sessions.length}
      />
    </section>
  );
}
