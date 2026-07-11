import type { PersistenceStatus } from './workspace-types';

interface SaveStateProps {
  status: PersistenceStatus;
}

export function SaveState({ status }: SaveStateProps) {
  if (status === 'error') {
    return <span className="rounded-lg border border-destructive/45 bg-destructive/10 px-2.5 py-1 text-sm font-medium text-destructive" role="alert">Could not save locally. Download a backup before leaving this page.</span>;
  }

  if (status === 'saved') {
    return <span className="text-sm text-muted-foreground" role="status">Saved locally</span>;
  }

  return null;
}
