import { webcrypto } from 'node:crypto';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { buildDemoSession, serialiseSessions } from './domain/core';

const KEY = 'aligned.backup.v1';
const exportBackup = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Download JSON backup' }));
  await screen.findByText(/Last backup export:/);
};

describe('backup status', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('crypto', webcrypto);
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    localStorage.setItem('aligned.sessions.v1', serialiseSessions([buildDemoSession()]));
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('remembers an honest export time across reload without treating envelope time as a change', async () => {
    const app = render(<App />);
    expect(screen.getByText(/No backup export recorded/)).toBeInTheDocument();
    await exportBackup();
    expect(screen.getByText(/Check that the JSON file is saved/)).toBeInTheDocument();
    const metadata = localStorage.getItem(KEY)!;
    expect(metadata).not.toContain('Compartment');
    expect(metadata.length).toBeLessThan(250);
    const label = screen.getByText(/Last backup export:/).textContent;
    app.unmount();
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Last backup export:/)).toHaveTextContent(label!));
    expect(screen.queryByText(/Sessions have changed since/)).not.toBeInTheDocument();
  });

  it('reminds after an authored edit and reload, then clears the reminder on another export', async () => {
    const app = render(<App />);
    await exportBackup();
    await userEvent.click(screen.getByRole('button', { name: /Compartment syndrome and basic wound closure/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Reflect' }));
    await userEvent.type(screen.getByLabelText('Feelings'), ' Synthetic change.');
    await userEvent.click(screen.getByRole('button', { name: 'Back to sessions' }));
    expect(await screen.findByText(/Sessions have changed since/)).toBeInTheDocument();
    app.unmount();
    render(<App />);
    expect(await screen.findByText(/Sessions have changed since/)).toBeInTheDocument();
    await exportBackup();
    await waitFor(() => expect(screen.queryByText(/Sessions have changed since/)).not.toBeInTheDocument());
  });

  it('shares export behaviour in the restore dialog and resets status on replacement', async () => {
    render(<App />);
    const replacement = { ...buildDemoSession(), title: 'Synthetic replacement' };
    await userEvent.upload(screen.getByLabelText('Import JSON backup'), new File([serialiseSessions([replacement])], 'backup.json', { type: 'application/json' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Download current backup' }));
    expect(await within(dialog).findByText(/Last backup export:/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Replace local library' }));
    expect(screen.getByText(/No backup export recorded/)).toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('clears metadata on delete-all and restores exported synthetic content without stale status', async () => {
    render(<App />);
    await exportBackup();
    const backup = localStorage.getItem('aligned.sessions.v1')!;
    await userEvent.click(screen.getByRole('button', { name: 'Delete all local data' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete local data' }));
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(screen.getByText(/No backup export recorded/)).toBeInTheDocument();
    await userEvent.upload(screen.getByLabelText('Import JSON backup'), new File([backup], 'backup.json', { type: 'application/json' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Replace local library' }));
    expect(JSON.parse(localStorage.getItem('aligned.sessions.v1')!).sessions).toEqual(JSON.parse(backup).sessions);
    expect(screen.getByText(/No backup export recorded/)).toBeInTheDocument();
  });

  it.each(['not JSON', 'null', '{}', '{"exportedAt":"invalid","fingerprint":"fake"}'])(
    'ignores invalid metadata %s without affecting the library', (value) => {
      localStorage.setItem(KEY, value);
      render(<App />);
      expect(screen.getByText(/No backup export recorded/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Compartment syndrome/ })).toBeInTheDocument();
    },
  );

  it('does not record a failed download and releases its object URL', async () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => { throw new Error('blocked'); });
    const revoke = vi.spyOn(URL, 'revokeObjectURL');
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: 'Download JSON backup' }));
    expect(await screen.findByText(/Could not request the backup download/)).toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(screen.queryByText(/Last backup export:/)).not.toBeInTheDocument();
    expect(revoke).toHaveBeenCalled();
  });

  it('reports metadata write failure without recording a new export time', async () => {
    render(<App />);
    const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === KEY) throw new Error('full');
      original.call(this, key, value);
    });
    await userEvent.click(screen.getByRole('button', { name: 'Download JSON backup' }));
    expect(await screen.findByText(/Download requested, but the export time could not be saved/)).toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(screen.queryByText(/Last backup export:/)).not.toBeInTheDocument();
  });

  it('does not mistake key order, navigation or edit-only timestamps for authored changes', async () => {
    const app = render(<App />);
    await exportBackup();
    const saved = JSON.parse(localStorage.getItem('aligned.sessions.v1')!);
    saved.exportedAt = '2020-01-01T00:00:00.000Z';
    saved.sessions = saved.sessions.map((session: Record<string, unknown>) => Object.fromEntries(Object.entries({ ...session, updatedAt: '2020-01-01T00:00:00.000Z' }).reverse()));
    app.unmount();
    localStorage.setItem('aligned.sessions.v1', JSON.stringify(saved));
    render(<App />);
    await waitFor(() => expect(screen.getByText(/Last backup export:/)).not.toHaveTextContent('Checking for changes'));
    expect(screen.queryByText(/Sessions have changed since/)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Back to sessions' }));
    expect(await screen.findByText(/Sessions have changed since/)).toBeInTheDocument();
  });

  it('keeps the old export and dirty reminder when a later download fails', async () => {
    render(<App />);
    await exportBackup();
    const original = localStorage.getItem(KEY);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Back to sessions' }));
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => { throw new Error('blocked'); });
    await userEvent.click(screen.getByRole('button', { name: 'Download JSON backup' }));
    expect(await screen.findByText(/Could not request the backup download/)).toBeInTheDocument();
    expect(screen.getByText(/Sessions have changed since/)).toBeInTheDocument();
    expect(localStorage.getItem(KEY)).toBe(original);
  });

  it('reports unavailable content comparison rather than leaving a misleading checking state', async () => {
    const app = render(<App />);
    await exportBackup();
    app.unmount();
    vi.stubGlobal('crypto', {});
    render(<App />);
    expect(await screen.findByText(/Could not check for changes/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Download JSON backup' }));
    expect(await screen.findByText(/Download requested, but the export time could not be saved/)).toBeInTheDocument();
  });

  it('blocks replacement if old backup metadata cannot be cleared', async () => {
    render(<App />);
    await exportBackup();
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('denied'); });
    await userEvent.upload(screen.getByLabelText('Import JSON backup'), new File([serialiseSessions([{ ...buildDemoSession(), title: 'Different library' }])], 'backup.json', { type: 'application/json' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Replace local library' }));
    expect(await screen.findByText(/Could not clear the previous backup status/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem('aligned.sessions.v1')!).sessions[0].title).not.toBe('Different library');
  });
});
