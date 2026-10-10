import { useEffect, useRef, useState } from 'react';
import { serialiseSessions, type TeachingSession } from './core';

export const BACKUP_STORAGE_KEY = 'aligned.backup.v1';
interface BackupRecord { exportedAt: string; fingerprint: string }

function loadBackupRecord(): BackupRecord | null {
  try {
    const record = JSON.parse(localStorage.getItem(BACKUP_STORAGE_KEY) ?? 'null');
    if (record && typeof record.exportedAt === 'string'
      && new Date(record.exportedAt).toISOString() === record.exportedAt
      && typeof record.fingerprint === 'string' && /^[a-f0-9]{64}$/.test(record.fingerprint)) return record;
  } catch { /* Missing, inaccessible or corrupt metadata is not an export record. */ }
  return null;
}

async function fingerprintSessions(sessions: TeachingSession[]): Promise<string> {
  // Hash content, not the export envelope's clock or an edit-only timestamp.
  // Sorted object keys keep reload/normalisation from looking like an edit.
  const content = JSON.stringify(sessions.map(({ updatedAt: _updatedAt, ...session }) => session), (_key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return Object.fromEntries(Object.keys(value).sort().map((key) => [key, value[key]]));
    }
    return value;
  });
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function downloadBackup(sessions: TeachingSession[]) {
  const url = URL.createObjectURL(new Blob([serialiseSessions(sessions)], { type: 'application/json;charset=utf-8' }));
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'aligned-backup.json';
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function useBackupStatus(sessions: TeachingSession[]) {
  const [record, setRecord] = useState(loadBackupRecord);
  const [comparison, setComparison] = useState<{ sessions: TeachingSession[]; fingerprint: string | null } | null>(null);
  const [message, setMessage] = useState('');
  const generation = useRef(0);

  useEffect(() => {
    let active = true;
    void fingerprintSessions(sessions).then((fingerprint) => {
      if (active) setComparison({ sessions, fingerprint });
    }).catch(() => { if (active) setComparison({ sessions, fingerprint: null }); });
    return () => { active = false; };
  }, [sessions]);
  useEffect(() => () => { generation.current += 1; }, []);

  const exportBackup = async () => {
    const started = ++generation.current;
    const fingerprint = await fingerprintSessions(sessions).catch(() => null);
    if (started !== generation.current) return;
    try {
      downloadBackup(sessions);
    } catch {
      setMessage('Could not request the backup download. Please try again.');
      return;
    }
    try {
      if (!fingerprint) throw new Error('Content comparison unavailable');
      const next = { exportedAt: new Date().toISOString(), fingerprint };
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(next));
      setRecord(next);
      setMessage('');
    } catch {
      setMessage('Download requested, but the export time could not be saved. Check that the JSON file is saved.');
    }
  };

  const clearBackupStatus = () => {
    generation.current += 1;
    localStorage.removeItem(BACKUP_STORAGE_KEY);
    setRecord(null);
    setMessage('');
  };

  let status = 'No backup export recorded for this library.';
  if (record) {
    status = `Last backup export: ${new Date(record.exportedAt).toLocaleString('en-GB')}.`;
    if (!comparison || comparison.sessions !== sessions) status += ' Checking for changes…';
    else if (!comparison.fingerprint) status += ' Could not check for changes. Download a new backup if unsure.';
    else if (comparison.fingerprint !== record.fingerprint) status += ' Sessions have changed since this export. Download a new backup.';
    status += ' Check that the JSON file is saved; a download request does not confirm it was saved.';
  }
  if (message) status += ` ${message}`;
  return { status, exportBackup, clearBackupStatus };
}
