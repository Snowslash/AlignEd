import { useState } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { FeedbackStage } from './components/workspace/FeedbackStage';
import { buildQuickSession, serialiseSessions, type TeachingSession } from './domain/core';
import { GOOGLE_FORM_STORAGE_KEY } from './domain/google-feedback';

const template = 'https://docs.google.com/forms/d/e/TEST_FORM/viewform?usp=pp_url&entry.101=SESSION_TITLE&entry.202=2000-01-02';
const initial = buildQuickSession({ title: 'Sutures & knots', date: '2026-09-13', audience: 'FY1', topic: 'Sutures', durationMinutes: 30, setting: 'Skills lab' });
initial.reflection.sections.feelings = 'My own reflection, not a generated statement.';
const csv = 'Timestamp,Session title:,Session date:,How clear was the session?,How useful was the session?,What was your confidence in the topic before the session?,What was your confidence in the topic after the session?,Any other comments?\n13/09/2026 12:00:00,Sutures & knots,13/09/2026,5,4,2,4,Useful\n13/09/2026 12:01:00,Other session,13/09/2026,1,1,1,1,Not this session';
function Harness() {
  const [session, setSession] = useState(initial);
  return <><FeedbackStage session={session} onChange={setSession} /><output data-testid="saved">{JSON.stringify(session)}</output></>;
}

beforeEach(() => localStorage.clear());

describe('Google feedback workflow', () => {
  it('requires local configuration, generates a private session link/QR, and handles copy failure', async () => {
    const user = userEvent.setup();
    const clipboard = vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
    render(<Harness />);
    expect(screen.queryByRole('img', { name: 'Feedback QR code' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Pre-filled form template'), { target: { value: template } });
    await user.click(screen.getByRole('button', { name: 'Save form connection' }));
    expect(localStorage.getItem(GOOGLE_FORM_STORAGE_KEY)).toBe(template);
    expect(screen.getByRole('img', { name: 'Feedback QR code' }).tagName.toLowerCase()).toBe('svg');
    const link = screen.getByRole('link', { name: 'Open feedback form' });
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    const url = new URL(link.getAttribute('href')!);
    expect(url.searchParams.get('entry.101')).toBe(initial.title);
    expect(url.searchParams.get('entry.202')).toBe(initial.date);
    expect(screen.getByText(/Google stores submitted feedback/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Copy feedback link' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Could not copy/i);
    clipboard.mockRestore();
  });

  it('does not render a configured QR if the saved template is unsafe', () => {
    localStorage.setItem(GOOGLE_FORM_STORAGE_KEY, 'javascript:alert(1)');
    render(<Harness />);
    expect(screen.queryByRole('img', { name: 'Feedback QR code' })).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/pre-filled link|responder link/i);
  });

  it('previews matching rows without mutation, requires confirmation, appends once and preserves reflection', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('Import Google Forms CSV'));
    fireEvent.change(screen.getByLabelText('Google Forms CSV'), { target: { value: csv } });
    await user.click(screen.getByRole('button', { name: 'Preview Google responses' }));
    expect(screen.getByText(/1 matching.*1 from other sessions/i)).toBeInTheDocument();
    expect(JSON.parse(screen.getByTestId('saved').textContent!).feedbackResponses).toEqual([]);
    const apply = screen.getByRole('button', { name: 'Append new Google responses' });
    expect(apply).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /I have checked these responses/i }));
    await user.click(apply);
    const saved = JSON.parse(screen.getByTestId('saved').textContent!);
    expect(saved.feedbackResponses).toHaveLength(1);
    expect(saved.feedbackResponses[0]).toMatchObject({ clarity: 5, usefulness: 4 });
    expect(saved.reflection).toEqual(initial.reflection);
    await user.click(screen.getByRole('button', { name: 'Preview Google responses' }));
    expect(screen.getByText(/1 already imported/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Append new Google responses' })).toBeDisabled();
  });

  it('invalidates a confirmed preview when CSV, date order or session changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const view = render(<FeedbackStage session={initial} onChange={onChange} />);
    await user.click(screen.getByText('Import Google Forms CSV'));
    const input = screen.getByLabelText('Google Forms CSV');
    fireEvent.change(input, { target: { value: csv } });
    await user.click(screen.getByRole('button', { name: 'Preview Google responses' }));
    await user.click(screen.getByRole('checkbox', { name: /I have checked these responses/i }));
    await user.selectOptions(screen.getByLabelText('CSV date order'), 'mdy');
    expect(screen.getByRole('button', { name: 'Append new Google responses' })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('CSV date order'), 'dmy');
    await user.click(screen.getByRole('button', { name: 'Preview Google responses' }));
    await user.click(screen.getByRole('checkbox', { name: /I have checked these responses/i }));
    view.rerender(<FeedbackStage session={{ ...initial, title: 'Different session' }} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Append new Google responses' })).toBeDisabled();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('imports from a CSV file and reports file read failure without mutating feedback', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('Import Google Forms CSV'));
    const file = new File([csv], 'feedback.csv', { type: 'text/csv' });
    Object.defineProperty(file, 'text', { value: () => Promise.resolve(csv) });
    await user.upload(screen.getByLabelText('Choose Google Forms CSV file'), file);
    expect(screen.getByLabelText('Google Forms CSV')).toHaveValue(csv);
    const bad = new File(['bad'], 'bad.csv', { type: 'text/csv' });
    Object.defineProperty(bad, 'text', { value: () => Promise.reject(new Error('unreadable')) });
    await user.upload(screen.getByLabelText('Choose Google Forms CSV file'), bad);
    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not read/i);
    expect(JSON.parse(screen.getByTestId('saved').textContent!).feedbackResponses).toEqual([]);
  });

  it('uses the real library to block matching-session collisions and deletes the local form connection with delete-all', async () => {
    const user = userEvent.setup();
    localStorage.setItem(GOOGLE_FORM_STORAGE_KEY, template);
    const other: TeachingSession = { ...initial, id: 'other' };
    localStorage.setItem('aligned.sessions.v1', serialiseSessions([initial, other]));
    render(<App />);
    await user.click(screen.getAllByRole('button', { name: /Sutures & knots/i })[0]);
    await user.click(screen.getByRole('button', { name: 'Feedback' }));
    await user.click(screen.getByText('Import Google Forms CSV'));
    fireEvent.change(screen.getByLabelText('Google Forms CSV'), { target: { value: csv } });
    await user.click(screen.getByRole('button', { name: 'Preview Google responses' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/same title and date/i);
    await user.click(screen.getByRole('button', { name: 'Back to sessions' }));
    await user.click(screen.getByRole('button', { name: /Delete all local data/i }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete local data' }));
    expect(localStorage.getItem(GOOGLE_FORM_STORAGE_KEY)).toBeNull();
  });
});
