import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { buildDemoSession, deserialiseSessions, serialiseSessions } from './domain/core';

const libraryKey = 'aligned.sessions.v1';
const legacyKey = 'teaching-portfolio-tracker.sessions.v1';
const formKey = 'aligned.google-form.v1';
const backupKey = 'aligned.backup.v1';
const file = (raw: string) => new File([raw], 'synthetic-backup.json', { type: 'application/json' });

beforeEach(() => localStorage.clear());
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('nested backup rejection at the restore boundary', () => {
  it.each([
    ['feedback questions', { feedbackQuestions: [{ text: 'Not a question string' }] }],
    ['framework tags', { frameworkTags: [null] }],
    ['rigour', { rigour: { enabled: 'false' } }],
    ['reflection', { reflection: false }],
    ['level', { level: {} }],
    ['evidenceNotes', { evidenceNotes: null }],
    ['objectives', { objectives: [{ ...buildDemoSession().objectives[0], miller: {} }] }],
    ['feedback responses', { feedbackResponses: [{ googleFormsImportKey: 123 }] }],
  ])('rejects invalid %s without changing either saved or displayed library', async (field, malformed) => {
    const prior = { ...buildDemoSession(), title: 'Prior synthetic library' };
    localStorage.setItem(libraryKey, serialiseSessions([prior]));
    localStorage.setItem(legacyKey, JSON.stringify([prior]));
    localStorage.setItem(formKey, 'synthetic form settings');
    localStorage.setItem(backupKey, 'synthetic prior backup marker');
    const app = render(<App />);
    const before = Object.fromEntries([libraryKey, legacyKey, formKey, backupKey].map((key) => [key, localStorage.getItem(key)]));
    // A valid first row must not be committed if the second row is corrupt.
    const replacement = { ...buildDemoSession(), title: 'Not admitted', ...malformed };
    await userEvent.upload(screen.getByLabelText('Import JSON backup'), file(JSON.stringify({ version: 1, sessions: [buildDemoSession(), replacement] })));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(new RegExp(`Session 2 has (an )?invalid ${field}`)));
    expect(screen.queryByRole('dialog', { name: 'Replace local session library' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Prior synthetic library/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Not admitted/ })).not.toBeInTheDocument();
    for (const [key, value] of Object.entries(before)) expect(localStorage.getItem(key), key).toBe(value);
    app.unmount();
    render(<App />);
    expect(screen.getByRole('button', { name: /Prior synthetic library/ })).toBeInTheDocument();
    expect(deserialiseSessions(localStorage.getItem(libraryKey)!)).toEqual([prior]);
  });

  it.each([libraryKey, legacyKey])('leaves malformed saved nested data at %s untouched on initial load', (key) => {
    const raw = JSON.stringify([{ ...buildDemoSession(), feedbackQuestions: [{}] }]);
    localStorage.setItem(key, raw);
    render(<App />);
    expect(screen.getByRole('alert')).toHaveTextContent('Could not load the local session library. It was left unchanged.');
    expect(localStorage.getItem(key)).toBe(raw);
    if (key === legacyKey) expect(localStorage.getItem(libraryKey)).toBeNull();
  });
});

describe('restored library workspace and export', () => {
  it.each(['current', 'legacy-array', 'legacy-advanced'])('opens all stages and exports authored data after %s restore and reload', async (format) => {
    const user = userEvent.setup();
    const session = buildDemoSession();
    session.title = 'Synthetic restored workshop';
    session.objectives[0].observedStandard = 'An authored observed standard';
    session.reflection.sections.feelings = 'Authored reflection survives restoration.';
    session.evidenceNotes = 'Synthetic evidence location';
    const input = JSON.parse(JSON.stringify(session));
    if (format !== 'current') {
      for (const key of ['level', 'frameworkTags', 'feedbackQuestions']) delete input[key];
    }
    if (format === 'legacy-advanced') input.rigour = { enabled: true };
    const raw = format === 'current' ? serialiseSessions([input]) : JSON.stringify([input]);
    const app = render(<App />);
    await user.upload(screen.getByLabelText('Import JSON backup'), file(raw));
    await user.click(await screen.findByRole('button', { name: 'Replace local library' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Imported 1 session from backup.');
    const restored = deserialiseSessions(localStorage.getItem(libraryKey)!);
    expect(restored[0]).toMatchObject({
      id: session.id, date: session.date, createdAt: session.createdAt, updatedAt: session.updatedAt,
      objectives: session.objectives, feedbackResponses: session.feedbackResponses, reflection: session.reflection,
    });
    expect(deserialiseSessions(serialiseSessions(restored))).toEqual(restored);
    if (format === 'legacy-advanced') {
      expect(restored[0].rigour.utility).toEqual({ validity: 3, reliability: 3, educationalImpact: 3, acceptability: 4, cost: 4 });
      expect(restored[0].rigour.equityPrompt).toBe('');
    }
    app.unmount();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Synthetic restored workshop/ }));
    await user.click(screen.getByRole('button', { name: 'Capture' }));
    expect(screen.getByLabelText('Session title')).toHaveValue(session.title);
    await user.click(screen.getByRole('button', { name: 'Plan' }));
    expect(screen.getAllByLabelText('Learning objective')[0]).toHaveValue(session.objectives[0].text);
    expect(screen.getAllByLabelText('Observed standard')[0]).toHaveValue('An authored observed standard');
    await user.click(screen.getByRole('button', { name: 'Feedback' }));
    expect(screen.getByText(restored[0].feedbackQuestions[0])).toBeInTheDocument();
    expect(screen.getByTestId('feedback-summary')).toHaveTextContent('2 responses');
    await user.click(screen.getByRole('button', { name: 'Reflect' }));
    expect(screen.getByLabelText('Feelings')).toHaveValue(session.reflection.sections.feelings);
    await user.click(screen.getByRole('button', { name: 'Export' }));
    const markdown = screen.getByTestId('markdown-preview').textContent;
    expect(markdown).toContain(session.title);
    expect(markdown).toContain(session.reflection.sections.feelings);
    expect(markdown).toContain(session.evidenceNotes);
    await user.click(screen.getByRole('button', { name: 'Copy Markdown' }));
    expect(await navigator.clipboard.readText()).toBe(markdown);
    // Clipboard is user-event's boundary stub; the UI and generated payload are real.
    expect(screen.getByTestId('export-action-status')).toHaveTextContent('Markdown copied to clipboard.');
    expect(deserialiseSessions(localStorage.getItem(libraryKey)!)).toEqual(restored);
  });
});
