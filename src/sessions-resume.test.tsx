import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { SessionsHome } from './components/sessions/SessionsHome';
import { buildQuickSession, serialiseSessions } from './domain/core';

describe('Sessions resume refinement', () => {
  const plannedSession = (title: string, date: string) => {
    const session = buildQuickSession({
      title,
      date,
      audience: 'FY1 doctors',
      topic: 'Safe prescribing',
      durationMinutes: 30,
      setting: 'Seminar room',
    });
    session.objectives = [{
      ...session.objectives[0],
      text: 'Explain a safe prescribing check before signing a prescription',
    }];
    return session;
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('renders each session once in a flat list with one next action and invalid-date attention guidance', () => {
    const complete = plannedSession('Past session', '2020-01-01');
    complete.feedbackResponses = [{ clarity: 5 }];
    const invalid = { ...plannedSession('Date needs review', '2020-01-01'), date: 'not-a-date' };

    render(
      <SessionsHome
        backupImportFocusRequest={0}
        importStatus=""
        onAddDemo={() => {}}
        onDownloadBackup={() => {}}
        onImportBackup={() => {}}
        onOpenEntry={() => {}}
        onOpenSession={() => {}}
        sessions={[complete, invalid]}
      />,
    );

    expect(screen.getAllByRole('button', { name: /Past session/i })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /Date needs review/i })).toHaveLength(1);
    expect(screen.getAllByText(/^Next:/i)).toHaveLength(2);
    expect(screen.getByText('Next: Review reflection')).toBeInTheDocument();
    expect(screen.getByText('Next: Review Capture details')).toBeInTheDocument();
    expect(screen.getByText(/Check the date before continuing/i)).toBeInTheDocument();
    expect(screen.queryByText(/percentage|chart|status/i)).not.toBeInTheDocument();
  });

  it('activates a session card from the keyboard, resumes to its derived stage, and restores focus to Sessions on return', async () => {
    const session = plannedSession('Keyboard resume session', '2020-01-01');
    localStorage.setItem('aligned.sessions.v1', serialiseSessions([session]));
    const user = userEvent.setup();

    render(<App />);
    const card = screen.getByRole('button', { name: /Keyboard resume session/i });
    card.focus();
    await user.keyboard('{Enter}');

    expect(await screen.findByRole('heading', { name: /^Feedback capture$/i })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: /Back to sessions/i }));
    expect(screen.getByRole('heading', { name: /^Sessions$/i })).toHaveFocus();
  });
});