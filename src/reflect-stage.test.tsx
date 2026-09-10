import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { buildQuickSession, serialiseSessions } from './domain/core';

describe('Reflect stage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders a body distinct from Export and focuses its heading on direct navigation', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));

    await userEvent.click(screen.getByRole('button', { name: /^Reflect$/i }));
    const reflectHeading = await screen.findByRole('heading', { name: /^Reflect$/i });
    expect(reflectHeading).toHaveFocus();
    expect(reflectHeading).toHaveAttribute('data-workspace-stage-heading', 'reflect');
    expect(screen.getByLabelText(/^Feelings$/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Copy Markdown$/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Export$/i }));
    expect(await screen.findByRole('heading', { name: /^Export$/i })).toHaveFocus();
    expect(screen.queryByLabelText(/^Feelings$/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Copy Markdown$/i })).toBeInTheDocument();
  });

  it('does not show redundant generated suggestion cards when the current reflection already matches feedback', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Reflect$/i }));

    expect(screen.getByText(/current reflection already matches the current feedback-informed draft/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Apply to /i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Keep current /i })).not.toBeInTheDocument();
    expect(screen.queryByText(/^Generated suggestion:/i)).not.toBeInTheDocument();
  });

  it('edits every Gibbs section and the forward evaluation measure through a full App remount', async () => {
    const { unmount } = render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Reflect$/i }));
    const values = {
      Description: 'Authored description',
      Feelings: 'Authored feelings',
      Evaluation: 'Authored evaluation',
      Analysis: 'Authored analysis',
      Conclusion: 'Authored conclusion',
      'Action plan': 'Authored action plan',
      'How I will check next time': 'Authored forward measure',
    };

    for (const [label, value] of Object.entries(values)) {
      const field = screen.getByLabelText(new RegExp(`^${label}$`, 'i'));
      await userEvent.clear(field);
      await userEvent.type(field, value);
    }
    await waitFor(() => expect(localStorage.getItem('aligned.sessions.v1')).toContain('Authored forward measure'));
    unmount();

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Compartment syndrome and basic wound closure/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Reflect$/i }));
    for (const [label, value] of Object.entries(values)) {
      expect(screen.getByLabelText(new RegExp(`^${label}$`, 'i'))).toHaveValue(value);
    }
  });

  it('labels feedback-informed previews as generated drafts, applies one field only, and keeps dismissed text', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Reflect$/i }));
    const feelings = screen.getByLabelText(/^Feelings$/i);
    const evaluation = screen.getByLabelText(/^Evaluation$/i) as HTMLTextAreaElement;
    await userEvent.clear(feelings);
    await userEvent.type(feelings, 'Keep these authored feelings.');
    await userEvent.clear(evaluation);
    await userEvent.type(evaluation, 'Keep this authored evaluation until I apply a draft.');
    const evaluationBeforeApply = evaluation.value;

    expect(screen.getByText(/generated suggestions are available/i)).toBeInTheDocument();
    expect(screen.getAllByText(/generated suggestion/i).length).toBeGreaterThan(1);
    await userEvent.click(screen.getByRole('button', { name: /Apply to Evaluation/i }));

    expect(screen.getByLabelText(/^Feelings$/i)).toHaveValue('Keep these authored feelings.');
    expect(screen.getByLabelText(/^Evaluation$/i)).not.toHaveValue(evaluationBeforeApply);
    await userEvent.click(screen.getByRole('button', { name: /Keep current Feelings/i }));
    expect(screen.getByLabelText(/^Feelings$/i)).toHaveValue('Keep these authored feelings.');
    expect(screen.queryByRole('button', { name: /Apply to Feelings/i })).not.toBeInTheDocument();
    expect(screen.getByText(/generated differences were kept or dismissed.*current text is unchanged/i)).toBeInTheDocument();
  });

  it('preserves authored text after a later manual feedback addition', async () => {
    const session = buildQuickSession({
      title: 'Manual feedback after reflection',
      date: '2026-07-08',
      audience: 'FY1 doctors',
      topic: 'Safe prescribing',
      durationMinutes: 30,
      setting: 'Seminar room',
    });
    localStorage.setItem('aligned.sessions.v1', serialiseSessions([session]));

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Manual feedback after reflection/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Reflect$/i }));
    const feelings = screen.getByLabelText(/^Feelings$/i);
    await userEvent.clear(feelings);
    await userEvent.type(feelings, 'This remains authored.');

    await userEvent.click(screen.getByRole('button', { name: /^Feedback$/i }));
    await userEvent.type(screen.getByLabelText(/One thing to change/i), 'More practice');
    await userEvent.click(screen.getByRole('button', { name: /Add manual response/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Reflect$/i }));

    expect(screen.getByLabelText(/^Feelings$/i)).toHaveValue('This remains authored.');
    expect(screen.getByText(/generated suggestions are available/i)).toBeInTheDocument();
  });

  it('remains usable without feedback and does not claim learner evidence', async () => {
    const session = buildQuickSession({
      title: 'No feedback session',
      date: '2026-07-08',
      audience: 'FY1 doctors',
      topic: 'Safe prescribing',
      durationMinutes: 30,
      setting: 'Seminar room',
    });
    localStorage.setItem('aligned.sessions.v1', serialiseSessions([session]));

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /No feedback session/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Reflect$/i }));

    expect(screen.getByRole('heading', { name: /^Reflect$/i })).toHaveFocus();
    expect(screen.getByLabelText(/^How I will check next time$/i)).toBeEnabled();
    expect(screen.getByText(/No learner feedback is recorded/i)).toBeInTheDocument();
    expect(screen.queryByText(/learner response captured/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/generated suggestions are available/i)).not.toBeInTheDocument();
  });
});
