import { useEffect, useState } from 'react';
import './App.css';
import { PublicEstateHeader } from '@/components/PublicEstateHeader';
import { DeleteDataConfirmation } from '@/components/backup/DeleteDataConfirmation';
import { RestoreConfirmation } from '@/components/backup/RestoreConfirmation';
import { SessionEntryPanel } from '@/components/sessions/SessionEntryPanel';
import { SessionsHome } from '@/components/sessions/SessionsHome';
import type { EntryMode, QuickFormState } from '@/components/sessions/types';
import { CaptureStage } from '@/components/workspace/CaptureStage';
import { ExportStage } from '@/components/workspace/ExportStage';
import { FeedbackStage } from '@/components/workspace/FeedbackStage';
import { PlanStage } from '@/components/workspace/PlanStage';
import { ReflectStage } from '@/components/workspace/ReflectStage';
import { SessionWorkspace } from '@/components/workspace/SessionWorkspace';
import type { WorkspaceStageId } from '@/components/workspace/workspace-types';
import {
  type TeachingSession,
  buildDemoSession,
  buildQuickSession,
  deserialiseSessions,
  formatUkDate,

  parseUkDate,
  serialiseSessions,
  todayIso,
} from './domain/core';
import { getCaptureValidationErrors, getSuggestedResumeStage, type CaptureValidationErrors } from './domain/workflow';
import { applyTheme, getAppliedTheme, type Theme } from './theme';

const STORAGE_KEY = 'aligned.sessions.v1';
const LEGACY_STORAGE_KEY = 'teaching-portfolio-tracker.sessions.v1';

const workflowStepForResume = {
  capture: 'capture',
  plan: 'plan',
  feedback: 'feedback',
  reflect: 'reflect',
} satisfies Record<ReturnType<typeof getSuggestedResumeStage>, WorkspaceStageId>;

const emptyQuickForm = (): QuickFormState => ({
  title: '',
  date: formatUkDate(todayIso()),
  audience: '',
  level: '',
  topic: '',
  durationMinutes: 30,
  setting: 'Ward teaching',
});

function loadSessions(): { sessions: TeachingSession[]; error: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    return { sessions: raw ? deserialiseSessions(raw) : [], error: null };
  } catch (error) {
    return {
      sessions: [],
      error: `Could not load the local session library. It was left unchanged. ${error instanceof Error ? error.message : ''}`.trim(),
    };
  }
}

function persistSessions(sessions: TeachingSession[]) {
  try {
    localStorage.setItem(STORAGE_KEY, serialiseSessions(sessions));
    return true;
  } catch {
    return false;
  }
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function updateSession(sessions: TeachingSession[], updated: TeachingSession): TeachingSession[] {
  return sessions.map((session) => (session.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : session));
}

function getQuickFormErrors(form: QuickFormState): CaptureValidationErrors {
  return getCaptureValidationErrors({
    title: form.title,
    date: parseUkDate(form.date),
    audience: form.audience,
    setting: form.setting,
    durationMinutes: form.durationMinutes,
  });
}

export default function App() {
  const [initialLoad] = useState(loadSessions);
  const [sessions, setSessions] = useState<TeachingSession[]>(initialLoad.sessions);
  const [canPersist, setCanPersist] = useState(!initialLoad.error);
  const [loadError, setLoadError] = useState(initialLoad.error);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [entryMode, setEntryMode] = useState<EntryMode | null>(null);
  const [homeFocusTarget, setHomeFocusTarget] = useState<EntryMode | 'sessions' | null>(null);
  const [form, setForm] = useState<QuickFormState>(() => emptyQuickForm());
  const [entryErrors, setEntryErrors] = useState<CaptureValidationErrors>({});
  const [importStatus, setImportStatus] = useState('');
  const [pendingImport, setPendingImport] = useState<TeachingSession[] | null>(null);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [backupImportFocusRequest, setBackupImportFocusRequest] = useState(0);
  const [persistenceStatus, setPersistenceStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [currentStage, setCurrentStage] = useState<WorkspaceStageId>('capture');
  const [theme, setTheme] = useState<Theme>(getAppliedTheme);
  const selected = sessions.find((session) => session.id === selectedId);

  useEffect(() => {
    if (!canPersist) return;
    setPersistenceStatus(persistSessions(sessions) ? 'saved' : 'error');
  }, [canPersist, sessions]);


  useEffect(() => {
    if (selectedId || entryMode || !homeFocusTarget) return;
    const target = homeFocusTarget === 'sessions'
      ? document.querySelector<HTMLElement>('#session-list-title')
      : document.querySelector<HTMLElement>(`[data-entry-route="${homeFocusTarget}"]`);
    target?.focus();
    setHomeFocusTarget(null);
  }, [entryMode, homeFocusTarget, selectedId]);

  const saveQuickSession = () => {
    const errors = getQuickFormErrors(form);
    setEntryErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const session = buildQuickSession(form);
    const next = [session, ...sessions];
    setSessions(next);
    setSelectedId(session.id);
    setCurrentStage(entryMode === 'prospective' ? 'plan' : 'capture');
    setEntryMode(null);
    setEntryErrors({});
    setForm(emptyQuickForm());
  };

  const addDemo = () => {
    const session = buildDemoSession();
    const next = [session, ...sessions];
    setSessions(next);
    setSelectedId(session.id);
    setEntryMode(null);
    setCurrentStage('capture');
  };

  const openSession = (id: string) => {
    const session = sessions.find((candidate) => candidate.id === id);
    setSelectedId(id);
    setEntryMode(null);
    setHomeFocusTarget(null);
    setCurrentStage(session ? workflowStepForResume[getSuggestedResumeStage(session, todayIso())] : 'capture');
  };

  const openSessionsHome = () => {
    setHomeFocusTarget('sessions');
    setSelectedId(undefined);
    setEntryMode(null);
  };

  const patchSelected = (session: TeachingSession) => {
    setSessions(updateSession(sessions, session));
    setSelectedId(session.id);
  };

  const previewJsonImport = (raw: string) => {
    try {
      const imported = deserialiseSessions(raw);
      if (imported.length === 0) throw new Error('Import file does not contain sessions.');
      setPendingImport(imported);
      setImportStatus('');
    } catch (error) {
      setPendingImport(null);
      setImportStatus(error instanceof Error ? error.message : 'Could not import sessions');
    }
  };

  const confirmJsonImport = () => {
    if (!pendingImport) return;
    setCanPersist(true);
    setLoadError(null);
    setSessions(pendingImport);
    setSelectedId(undefined);
    setCurrentStage('capture');
    setImportStatus(`Imported ${pendingImport.length} session${pendingImport.length === 1 ? '' : 's'} from backup.`);
    setPendingImport(null);
    setBackupImportFocusRequest((request) => request + 1);
  };

  const deleteAllLocalData = () => {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setSessions([]);
    setSelectedId(undefined);
    setEntryMode(null);
    setImportStatus('Deleted all locally stored sessions from this browser.');
    setDeleteConfirmationOpen(false);
  };

  return (
    <div className="min-h-screen">
      <PublicEstateHeader
        current="aligned"
        theme={theme}
        onToggleTheme={() => {
          const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
          setTheme(applyTheme(nextTheme));
        }}
      />
      <main className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5 pt-6" data-app-header data-print-hidden>
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">AlignEd</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">Plan teaching, capture feedback and leave with a usable evidence pack.</p>
        </div>
        {persistenceStatus === 'error' && (
          <span className="rounded-sm border border-destructive/45 bg-destructive/10 px-2.5 py-1 text-sm font-medium text-destructive" role="alert">
            Could not save locally. Download a backup before leaving this page.
          </span>
        )}
      </header>
      {loadError && <p className="mt-4 rounded-sm border border-destructive/45 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{loadError} Restore a valid backup to resume local saving.</p>}

      {!selected && !entryMode && (
        <SessionsHome
          sessions={sessions}
          importStatus={importStatus}
          backupImportFocusRequest={backupImportFocusRequest}
          onOpenEntry={(mode) => {
            setEntryErrors({});
            setEntryMode(mode);
          }}
          onOpenSession={openSession}
          onAddDemo={addDemo}
          onDownloadBackup={() => downloadText('aligned-backup.json', serialiseSessions(sessions))}
          onDeleteAllData={() => setDeleteConfirmationOpen(true)}
          onImportBackup={previewJsonImport}
        />
      )}

      {!selected && entryMode && (
        <SessionEntryPanel
          mode={entryMode}
          form={form}
          errors={entryErrors}
          onChange={(nextForm) => {
            setForm(nextForm);
            if (Object.keys(entryErrors).length > 0) setEntryErrors(getQuickFormErrors(nextForm));
          }}
          onCancel={() => {
            setHomeFocusTarget(entryMode);
            setEntryErrors({});
            setEntryMode(null);
          }}
          onSave={saveQuickSession}
        />
      )}

      {selected && (
        <SessionWorkspace
          currentStage={currentStage}
          onBackToSessions={openSessionsHome}
          onStageChange={setCurrentStage}
          persistenceStatus={persistenceStatus}
          session={selected}
        >
          {currentStage === 'capture' && <CaptureStage session={selected} onChange={patchSelected} />}
          {currentStage === 'plan' && <PlanStage session={selected} onChange={patchSelected} />}
          {currentStage === 'feedback' && <FeedbackStage session={selected} onChange={patchSelected} />}
          {currentStage === 'reflect' && <ReflectStage session={selected} onChange={patchSelected} />}
          {currentStage === 'export' && <ExportStage session={selected} onChange={patchSelected} />}
        </SessionWorkspace>
      )}
      {pendingImport && (
        <RestoreConfirmation
          onCancel={() => {
            setPendingImport(null);
            setImportStatus('Restore cancelled. Current library unchanged.');
            setBackupImportFocusRequest((request) => request + 1);
          }}
          onConfirm={confirmJsonImport}
          onDownloadCurrentBackup={() => downloadText('aligned-backup.json', serialiseSessions(sessions))}
          sessionCount={pendingImport.length}
        />
      )}
      {deleteConfirmationOpen && (
        <DeleteDataConfirmation
          onCancel={() => setDeleteConfirmationOpen(false)}
          onConfirm={deleteAllLocalData}
          sessionCount={sessions.length}
        />
      )}
      </main>
    </div>
  );
}
