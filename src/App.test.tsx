import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { formatUkDate, todayIso } from './domain/core';

describe('App', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  it('prioritises the 60-second taught-session logging journey', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /AlignEd/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Session title/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Session title/i), 'Ward suturing');
    await userEvent.type(screen.getByLabelText(/Audience/i), 'FY1 doctors');
    await userEvent.type(screen.getByLabelText(/Topic/i), 'Simple interrupted sutures');
    await userEvent.click(screen.getByRole('button', { name: /Save session/i }));
    expect(await screen.findByRole('heading', { name: /Session details/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Planning/i })).not.toBeInTheDocument();
  });

  it('guides users through separate workflow pages', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    expect(screen.getByRole('heading', { name: /Session details/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Feedback capture/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /2Planning/i }));
    expect(screen.getByRole('heading', { name: /Planning/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Rigour Mode/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Advanced mode/i)).toBeInTheDocument();
    expect(screen.queryByText(/validity:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Utility average/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /3Feedback/i }));
    expect(screen.getByRole('heading', { name: /Feedback capture/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Reflection and evidence pack/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /4Reflection\/export/i }));
    expect(screen.getByRole('heading', { name: /Reflection and evidence pack/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Gibbs reflection and evidence pack/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy Markdown export/i })).toBeInTheDocument();
  });

  it('uses UK date display, free text activity and assessment, and editable reflections', async () => {
    const { container } = render(<App />);
    const dateField = screen.getByLabelText(/^Date$/i);
    expect(dateField).toHaveValue(formatUkDate(todayIso()));
    await userEvent.type(screen.getByLabelText(/Session title/i), 'Ward suturing');
    await userEvent.click(screen.getByRole('button', { name: /Save session/i }));

    expect(screen.getAllByText(new RegExp(formatUkDate(todayIso()).replace(/\//g, '\\/'))).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: /2Planning/i }));
    expect(screen.queryByLabelText(/^Check$/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Assessment$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Activity$/i).tagName).toBe('INPUT');
    expect(screen.getByLabelText(/^Assessment$/i).tagName).toBe('INPUT');
    expect(screen.queryByText(/Miller level not set/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Advanced mode/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Advanced mode/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Objective text/i)).toHaveValue('By the end of this session, ...');
    expect(screen.getByText(/These ticks are the evidence types/i)).toBeInTheDocument();
    expect(screen.getByText(/Evidence to attach/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /4Reflection\/export/i }));
    const feelings = screen.getByLabelText(/^Feelings$/i);
    await userEvent.clear(feelings);
    await userEvent.type(feelings, 'Learners were engaged but wanted more hands-on practice.');
    expect(feelings).toHaveValue('Learners were engaged but wanted more hands-on practice.');
    expect(screen.queryByLabelText(/Gibbs feelings/i)).not.toBeInTheDocument();
    expect(container.querySelector('pre')?.textContent).toContain('### Feelings\nLearners were engaged but wanted more hands-on practice.');
  });

  it('adds manual feedback locally and stops presenting the QR link as collection', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: /3Feedback/i }));

    expect(screen.getByRole('heading', { name: /Feedback capture/i })).toBeInTheDocument();
    expect(screen.getByText(/Recommended for now: type responses in during or after the session/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Feedback URL/i)).not.toBeInTheDocument();
    expect(screen.queryByAltText(/QR code/i)).not.toBeInTheDocument();

    await userEvent.clear(screen.getByLabelText(/Clarity/i));
    await userEvent.type(screen.getByLabelText(/Clarity/i), '4');
    await userEvent.clear(screen.getByLabelText(/Usefulness/i));
    await userEvent.type(screen.getByLabelText(/Usefulness/i), '5');
    await userEvent.clear(screen.getByLabelText(/Confidence before/i));
    await userEvent.type(screen.getByLabelText(/Confidence before/i), '2');
    await userEvent.clear(screen.getByLabelText(/Confidence after/i));
    await userEvent.type(screen.getByLabelText(/Confidence after/i), '4');
    await userEvent.type(screen.getByLabelText(/One thing to change/i), 'More time for practice');
    await userEvent.click(screen.getByRole('button', { name: /Add manual response/i }));

    expect(document.querySelector('.summary-grid')?.textContent).toMatch(/3\s*responses/i);
    await userEvent.click(screen.getByRole('button', { name: /4Reflection\/export/i }));
    expect(screen.getByDisplayValue(/More time for practice/i)).toBeInTheDocument();
  });

  it('confirms JSON backup import worked', async () => {
    render(<App />);
    const backup = JSON.stringify({
      version: 1,
      sessions: [{
        id: 'session-imported',
        title: 'Imported teaching session',
        date: '2026-07-03',
        audience: 'CT1 doctors',
        level: 'CT1',
        topic: 'Plaster safety',
        durationMinutes: 20,
        setting: 'Clinic',
        createdAt: '2026-07-03T00:00:00.000Z',
        updatedAt: '2026-07-03T00:00:00.000Z',
        objectives: [],
        frameworkTags: ['Generic teaching evidence'],
        rigour: { enabled: false, utility: { validity: 3, reliability: 3, educationalImpact: 3, acceptability: 4, cost: 4 }, equityPrompt: '' },
        feedbackQuestions: [],
        feedbackResponses: [],
        reflection: { model: 'Gibbs', sections: { description: 'Imported description', feelings: '', evaluation: '', analysis: '', conclusion: '', actionPlan: '' }, forwardEvaluationMeasure: '' },
        evidenceNotes: ''
      }]
    });
    const file = new File([backup], 'backup.json', { type: 'application/json' });
    await userEvent.upload(screen.getByLabelText(/Import JSON backup/i), file);
    expect(await screen.findByText('Imported 1 session from backup.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Imported teaching session')).toBeInTheDocument();
  });

});
