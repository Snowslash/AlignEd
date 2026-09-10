import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App';
import { buildDemoSession, buildMarkdownExport, deserialiseSessions, serialiseSessions } from './domain/core';

describe('plain teaching workflow', () => {
  beforeEach(() => localStorage.clear());

  it.each(['Capture', 'Plan', 'Feedback', 'Reflect', 'Export'])('keeps %s free of redundant stage introductions', async (stage) => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: stage }));

    expect(screen.queryAllByText(/Record the factual session details|Define one meaningful objective|Record responses manually first|Write a portfolio-usable Gibbs reflection|Review the evidence pack and produce|Use these prompts during or after|These ticks are the evidence types|Optional prompts for more defensible planning|These location notes remain editable/i)).toHaveLength(0);
    expect(screen.queryByLabelText(/Framework tags?/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Kirkpatrick spine/i })).not.toBeInTheDocument();
    if (stage === 'Feedback') {
      expect(screen.getByText(/All scores are optional/)).toBeVisible();
      expect(screen.getByText(/does not collect phone responses by QR/)).toBeVisible();
      expect(screen.getByRole('heading', { name: 'What the feedback shows' })).toBeVisible();
    }
    if (stage === 'Export') expect(screen.getByRole('region', { name: 'Export omissions' })).toBeVisible();
  });

  it('preserves hidden saved tags through edits, reload and JSON backup without printing them', async () => {
    const session = buildDemoSession();
    session.frameworkTags = ['Legacy session tag'];
    session.objectives[0].frameworkTags = ['Legacy objective tag'];
    session.rigour.enabled = false;
    localStorage.setItem('aligned.sessions.v1', serialiseSessions([session]));
    const view = render(<App />);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(session.title, 'i') }));
    await userEvent.click(screen.getByRole('button', { name: 'Capture' }));
    expect(screen.queryByLabelText(/Framework tags?/i)).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Session title'), ' updated');
    await userEvent.click(screen.getByRole('button', { name: 'Plan' }));
    await userEvent.type(screen.getAllByLabelText('Learning objective')[0], ' safely');
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(screen.getByTestId('markdown-preview')).not.toHaveTextContent(/Legacy session tag|Legacy objective tag|Framework tags/);

    view.unmount();
    render(<App />);
    expect(screen.getByRole('button', { name: new RegExp(session.title + ' updated', 'i') })).toBeVisible();
    const [restored] = deserialiseSessions(localStorage.getItem('aligned.sessions.v1')!);
    const [backedUp] = deserialiseSessions(serialiseSessions([restored]));
    expect(backedUp.frameworkTags).toEqual(session.frameworkTags);
    expect(backedUp.objectives[0].frameworkTags).toEqual(session.objectives[0].frameworkTags);
    expect(backedUp.objectives[0].bloom).toBe(session.objectives[0].bloom);
    expect(backedUp.objectives[0].miller).toBe(session.objectives[0].miller);
    expect(backedUp.reflection).toEqual(session.reflection);
  });

  it.each([false, true])('omits inactive education metadata with feedback=%s', (hasFeedback) => {
    const session = buildDemoSession();
    session.rigour.enabled = false;
    session.frameworkTags = ['Legacy session tag'];
    session.objectives[0].frameworkTags = ['Legacy objective tag'];
    if (!hasFeedback) session.feedbackResponses = [];
    const markdown = buildMarkdownExport(session, undefined, session.reflection);
    expect(markdown).not.toMatch(/Framework tags|Generic teaching evidence|Legacy session tag|Legacy objective tag|Bloom:|Miller:|Advanced planning notes|Dose check:|Equity prompt:|Objective wording:|## Kirkpatrick/);
    expect(markdown).toContain('## Learning objectives');
    expect(markdown).toContain('## How I will check next time');
    expect(markdown).toContain(session.objectives[0].text);
    expect(markdown).toContain(session.reflection.sections.feelings);
    if (hasFeedback) {
      expect(markdown).toContain('## What the feedback shows');
    } else {
      expect(markdown).toContain('No learner feedback was recorded.');
      expect(markdown).not.toContain('## What the feedback shows');
    }
  });
});
