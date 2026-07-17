import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { buildDemoSession, buildQuickSession, formatUkDate, serialiseSessions, todayIso } from './domain/core';

describe('App', () => {
  const tomorrowUk = () => {
    const [year, month, day] = todayIso().split('-').map(Number);
    return formatUkDate(new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10));
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the shared estate theme control markup', async () => {
    render(<App />);
    const toggle = screen.getByRole('button', { name: 'Switch to dark mode' });
    expect(toggle).toHaveClass('estate-theme-toggle');
    expect(toggle.querySelector('svg')).not.toBeNull();
    await userEvent.click(toggle);
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toHaveTextContent('Light');
  });

  it('uses the shared public-estate header on the hosted app', () => {
    render(<App />);
    const navigation = screen.getByRole('navigation', { name: 'Primary navigation' });
    expect(navigation).toBeVisible();
    const estateHeader = navigation.closest('header');
    expect(estateHeader).toHaveAttribute('data-print-hidden');
    expect(estateHeader?.parentElement).toHaveClass('min-h-screen');
    expect(estateHeader?.parentElement).not.toHaveClass('px-4', 'max-w-[1480px]');
    expect(estateHeader?.nextElementSibling?.tagName).toBe('MAIN');
    expect(screen.getByRole('link', { name: 'Sangeev' })).toHaveAttribute('href', 'https://sangeev.me');
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', 'https://sangeev.me/#projects');
    expect(screen.getByRole('link', { name: 'AlignEd' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Op notes' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Scratchpad' })).toBeVisible();
  });

  it('starts on a sessions home with two explicit entry routes', async () => {
    const { container } = render(<App />);

    expect(screen.getByRole('heading', { name: /AlignEd/i })).toBeInTheDocument();
    expect(screen.queryByText(/Local-first teaching evidence/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Browser-only · no account/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Saved locally$/i)).not.toBeInTheDocument();
    const description = screen.getByText(/Plan teaching, capture feedback/i);
    expect(container.querySelector('header[data-app-header]')).toContainElement(description);
    expect(description).toHaveClass('text-sm');
    const retrospectiveRoute = screen.getByRole('button', { name: /Log teaching I have just done/i });
    expect(retrospectiveRoute).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Plan an upcoming session/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Session title/i)).not.toBeInTheDocument();

    await userEvent.click(retrospectiveRoute);
    await userEvent.click(screen.getByRole('button', { name: /Back to sessions/i }));
    expect(screen.getByRole('button', { name: /Log teaching I have just done/i })).toHaveFocus();
  });

  it('explains the browser-only privacy and backup boundary on the home screen', () => {
    render(<App />);

    expect(screen.getByText(/Data is not uploaded or synced/i)).toBeInTheDocument();
    expect(screen.getByText(/remain on this device until deleted or browser data is cleared/i)).toBeInTheDocument();
    expect(screen.getByText(/Do not enter patient-identifiable information/i)).toBeInTheDocument();
    expect(screen.getByText(/Avoid learner-identifiable information unless it is necessary/i)).toBeInTheDocument();
    expect(screen.getByText(/Download a JSON backup before clearing browser data or moving devices/i)).toBeInTheDocument();
  });

  it('requires confirmation before deleting every locally stored session', async () => {
    const session = buildDemoSession();
    localStorage.setItem('aligned.sessions.v1', serialiseSessions([session]));
    localStorage.setItem('teaching-portfolio-tracker.sessions.v1', serialiseSessions([session]));
    render(<App />);

    await userEvent.click(screen.getByRole('button', { name: /Delete all local data/i }));
    expect(screen.getByRole('dialog', { name: /Delete all local data/i })).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Cancel deletion/i }));
    expect(screen.getByRole('button', { name: new RegExp(session.title, 'i') })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Delete all local data/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Delete local data$/i }));

    expect(screen.getByText(/No sessions yet/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: new RegExp(session.title, 'i') })).not.toBeInTheDocument();
    expect(localStorage.getItem('teaching-portfolio-tracker.sessions.v1')).toBeNull();
    expect(JSON.parse(localStorage.getItem('aligned.sessions.v1') ?? '{}').sessions).toEqual([]);
    expect(screen.getByRole('status')).toHaveTextContent(/Deleted all locally stored sessions/i);
  });

  it('loads an existing library from the legacy storage key', () => {
    const legacySession = buildQuickSession({
      title: 'Legacy storage session',
      date: '2026-07-02',
      audience: 'FY1 doctors',
      topic: 'Safe prescribing',
      durationMinutes: 30,
      setting: 'Ward teaching',
    });
    localStorage.setItem('teaching-portfolio-tracker.sessions.v1', serialiseSessions([legacySession]));

    render(<App />);

    expect(screen.getByRole('button', { name: /Legacy storage session/i })).toBeInTheDocument();
    expect(screen.queryByText(/Could not load the local session library/i)).not.toBeInTheDocument();
  });

  it('prioritises the 60-second taught-session logging journey', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Log teaching I have just done/i }));
    expect(screen.getByRole('heading', { name: /Log teaching I have just done/i })).toBeInTheDocument();
    const titleField = screen.getByLabelText(/Session title/i);
    const saveButton = screen.getByRole('button', { name: /^Save session$/i });
    expect(titleField).toHaveFocus();
    expect(titleField.compareDocumentPosition(saveButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await userEvent.type(titleField, 'Ward suturing');
    await userEvent.type(screen.getByLabelText(/Audience/i), 'FY1 doctors');
    await userEvent.type(screen.getByLabelText(/Topic/i), 'Simple interrupted sutures');
    await userEvent.click(screen.getByRole('button', { name: /Save session/i }));
    expect(await screen.findByRole('heading', { name: /^Capture$/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Planning/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Ward suturing/i })).toBeInTheDocument();
  });

  it('continues an upcoming session into planning', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Plan an upcoming session/i }));
    expect(screen.getByRole('heading', { name: /Plan an upcoming session/i })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Session title/i), 'Compartment syndrome teaching');
    await userEvent.type(screen.getByLabelText(/Audience/i), 'FY1 doctors');
    await userEvent.clear(screen.getByLabelText(/^Date$/i));
    await userEvent.type(screen.getByLabelText(/^Date$/i), tomorrowUk());
    await userEvent.click(screen.getByRole('button', { name: /Save and continue to planning/i }));

    expect(await screen.findByRole('heading', { name: /^Plan$/i })).toHaveFocus();
    expect(screen.queryByRole('heading', { name: /^Capture$/i })).not.toBeInTheDocument();

    const objectiveText = screen.getByLabelText(/Objective text/i);
    await userEvent.clear(objectiveText);
    await userEvent.type(objectiveText, 'Explain the initial management of compartment syndrome');

    await userEvent.click(screen.getByRole('button', { name: /Back to sessions/i }));
    expect(screen.getByRole('heading', { name: /^Sessions$/i })).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: /Compartment syndrome teaching/i }));
    expect(await screen.findByRole('heading', { name: /^Plan$/i })).toHaveFocus();
  });

  it('resumes a past session with placeholder planning at Plan', async () => {
    const session = buildQuickSession({
      title: 'Past teaching session',
      date: '2020-01-01',
      audience: 'FY1 doctors',
      topic: 'Basic suturing',
      durationMinutes: 30,
      setting: 'Skills lab',
    });
    localStorage.setItem('aligned.sessions.v1', serialiseSessions([session]));

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Past teaching session/i }));

    expect(await screen.findByRole('heading', { name: /^Plan$/i })).toHaveFocus();
  });

  it('reports local persistence failures instead of claiming data was saved', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'QuotaExceededError');
    });

    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not save locally/i);
    expect(screen.queryByText(/^Saved locally$/i)).not.toBeInTheDocument();
  });

  it('does not overwrite local storage when reading the current library fails', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage unavailable', 'SecurityError');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem');

    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/Could not load the local session library/i);
    expect(setItem).not.toHaveBeenCalled();
  });

  it('guides users through separate workflow pages', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    expect(screen.getByRole('heading', { name: /^Capture$/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Feedback capture/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Plan$/i }));
    expect(screen.getByRole('heading', { name: /^Plan$/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Rigour Mode/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Advanced mode/i)).toBeInTheDocument();
    expect(screen.queryByText(/validity:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Utility average/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Feedback$/i }));
    expect(screen.getByRole('heading', { name: /Feedback capture/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Reflection and evidence pack/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Reflect$/i }));
    expect(screen.getByRole('heading', { name: /^Reflect$/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Copy Markdown$/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Export$/i }));
    expect(screen.getByRole('heading', { name: /^Export$/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Feelings$/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Copy Markdown$/i })).toBeInTheDocument();
  });

  it('uses UK date display, free text activity and assessment, and editable reflections', async () => {
    const { container } = render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Log teaching I have just done/i }));
    const dateField = screen.getByLabelText(/^Date$/i);
    expect(dateField).toHaveValue(formatUkDate(todayIso()));
    await userEvent.type(screen.getByLabelText(/Session title/i), 'Ward suturing');
    await userEvent.type(screen.getByLabelText(/Audience/i), 'FY1 doctors');
    await userEvent.click(screen.getByRole('button', { name: /Save session/i }));

    expect(screen.getAllByText(new RegExp(formatUkDate(todayIso()).replace(/\//g, '\\/'))).length).toBeGreaterThan(0);
    await userEvent.click(screen.getByRole('button', { name: /^Plan$/i }));
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

    await userEvent.click(screen.getByRole('button', { name: /^Reflect$/i }));
    const feelings = screen.getByLabelText(/^Feelings$/i);
    await userEvent.clear(feelings);
    await userEvent.type(feelings, 'Learners were engaged but wanted more hands-on practice.');
    expect(feelings).toHaveValue('Learners were engaged but wanted more hands-on practice.');
    expect(screen.queryByLabelText(/Gibbs feelings/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /^Export$/i }));
    expect(container.querySelector('pre')?.textContent).toContain('### Feelings\nLearners were engaged but wanted more hands-on practice.');
  });

  it('keeps Plan readiness fields together while advanced prompts remain optional', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Plan$/i }));

    expect(await screen.findByRole('heading', { name: /^Plan$/i })).toHaveFocus();
    expect(screen.getAllByLabelText(/^Objective text$/i)).toHaveLength(2);
    expect(screen.getAllByLabelText(/^Bloom level$/i)).toHaveLength(2);
    expect(screen.getAllByLabelText(/^Activity$/i)).toHaveLength(2);
    expect(screen.getAllByLabelText(/^Assessment$/i)).toHaveLength(2);
    expect(screen.getAllByText(/^Intended evidence to attach$/i)).toHaveLength(2);
    expect(screen.getAllByRole('checkbox', { name: /Feedback/i })).toHaveLength(2);
    expect(screen.queryByLabelText(/^Miller level$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Dreyfus learner stage$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Observed standard$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^Equity prompt$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Dose check:/i)).not.toBeInTheDocument();

    const advancedMode = screen.getByRole('button', { name: /^Advanced mode$/i });
    expect(advancedMode).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(advancedMode);
    expect(advancedMode).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByLabelText(/^Miller level$/i)).toHaveLength(2);
    expect(screen.getAllByLabelText(/^Dreyfus learner stage$/i)).toHaveLength(2);
    expect(screen.getAllByLabelText(/^Observed standard$/i)).toHaveLength(2);
    expect(screen.getByLabelText(/^Equity prompt$/i)).toBeInTheDocument();
    expect(screen.getByText(/^Dose check:/i)).toBeInTheDocument();
  });

  it('regenerates feedback questions from edited Plan objectives', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Plan$/i }));
    const objectiveText = screen.getAllByLabelText(/^Objective text$/i)[0];

    await userEvent.clear(objectiveText);
    await userEvent.type(objectiveText, 'Demonstrate safe plaster application');
    await userEvent.click(screen.getByRole('button', { name: /^Feedback$/i }));

    expect(screen.getByText('After this session, how confident do you feel with: Demonstrate safe plaster application?')).toBeInTheDocument();
  });

  it('accumulates manual feedback, preserves cleared numeric fields, and has no QR collection route', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Feedback$/i }));

    expect(screen.getByRole('heading', { name: /Feedback capture/i })).toHaveFocus();
    expect(screen.getByText(/does not collect phone responses by QR/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Feedback URL/i)).not.toBeInTheDocument();
    expect(screen.queryByAltText(/QR code/i)).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/Clarity/i), '4');
    await userEvent.type(screen.getByLabelText(/Usefulness/i), '5');
    await userEvent.type(screen.getByLabelText(/Confidence before/i), '2');
    await userEvent.type(screen.getByLabelText(/Confidence after/i), '4');
    await userEvent.type(screen.getByLabelText(/One thing to change/i), 'More time for practice');
    await userEvent.click(screen.getByRole('button', { name: /Add manual response/i }));

    expect(screen.getByTestId('feedback-summary').textContent).toMatch(/3\s*responses/i);
    const stored = JSON.parse(localStorage.getItem('aligned.sessions.v1') ?? '{}').sessions[0];
    expect(stored.feedbackResponses).toHaveLength(3);
    expect(stored.feedbackResponses[2]).toMatchObject({ clarity: 4, usefulness: 5, preConfidence: 2, postConfidence: 4 });

    await userEvent.type(screen.getByLabelText(/One thing to change/i), 'Text-only response');
    await userEvent.click(screen.getByRole('button', { name: /Add manual response/i }));
    const textOnlyStored = JSON.parse(localStorage.getItem('aligned.sessions.v1') ?? '{}').sessions[0];
    expect(textOnlyStored.feedbackResponses[3]).toEqual({ freeText: 'Text-only response' });
  });

  it('rejects an empty or out-of-range manual response with inline guidance', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Feedback$/i }));

    await userEvent.click(screen.getByRole('button', { name: /Add manual response/i }));
    expect(screen.getByText(/Enter at least one score or comment/i)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/Clarity/i), '9');
    await userEvent.click(screen.getByRole('button', { name: /Add manual response/i }));
    expect(screen.getByText(/between 1 and 5/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Clarity/i)).toHaveAttribute('aria-describedby', 'feedback-manual-error');
    expect(screen.getByText(/between 1 and 5/i)).toHaveAttribute('id', 'feedback-manual-error');
    expect(screen.getByTestId('feedback-summary').textContent).toMatch(/2\s*responses/i);
  });

  it('puts manual feedback fields before the submit action in keyboard tab order', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Feedback$/i }));

    screen.getByLabelText(/Clarity/i).focus();
    await userEvent.tab();
    expect(screen.getByLabelText(/Usefulness/i)).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByLabelText(/Confidence before/i)).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByLabelText(/Confidence after/i)).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByLabelText(/One thing to change/i)).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByLabelText(/Peer \/ observed teaching note/i)).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: /Add manual response/i })).toHaveFocus();
  });

  it('preserves edited reflection text when manual or CSV feedback is added', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Reflect$/i }));
    const feelings = screen.getByLabelText(/^Feelings$/i);
    await userEvent.clear(feelings);
    await userEvent.type(feelings, 'The clinician wrote this reflection.');

    await userEvent.click(screen.getByRole('button', { name: /^Feedback$/i }));
    await userEvent.type(screen.getByLabelText(/One thing to change/i), 'Manual feedback');
    await userEvent.click(screen.getByRole('button', { name: /Add manual response/i }));
    await userEvent.click(screen.getByText('Import CSV instead'));
    await userEvent.type(screen.getByLabelText(/CSV feedback import/i), 'clarity,usefulness\n4,5');
    await userEvent.click(screen.getByRole('button', { name: /^Preview CSV$/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Apply CSV$/i }));

    await userEvent.click(screen.getByRole('button', { name: /^Reflect$/i }));
    expect(screen.getByLabelText(/^Feelings$/i)).toHaveValue('The clinician wrote this reflection.');
  });

  it('previews CSV without mutation, appends on apply, and requires explicit replacement confirmation', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Feedback$/i }));
    await userEvent.click(screen.getByText('Import CSV instead'));
    const csv = screen.getByLabelText(/CSV feedback import/i);
    await userEvent.clear(csv);
    await userEvent.type(csv, 'clarity,usefulness\n3,4');
    await userEvent.click(screen.getByRole('button', { name: /^Preview CSV$/i }));
    expect(screen.getByText(/Parsed 1 response/i)).toBeInTheDocument();
    expect(screen.getByTestId('feedback-summary').textContent).toMatch(/2\s*responses/i);

    await userEvent.click(screen.getByRole('button', { name: /^Apply CSV$/i }));
    expect(screen.getByTestId('feedback-summary').textContent).toMatch(/3\s*responses/i);
    expect(screen.getByText('Appended 1 response.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Apply CSV$/i })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: /^Apply CSV$/i }));
    expect(screen.getByTestId('feedback-summary').textContent).toMatch(/3\s*responses/i);

    await userEvent.clear(csv);
    await userEvent.type(csv, 'clarity,usefulness\n1,2');
    await userEvent.click(screen.getByRole('button', { name: /^Preview CSV$/i }));
    await userEvent.selectOptions(screen.getByLabelText(/CSV import mode/i), 'replace');
    await userEvent.click(screen.getByRole('button', { name: /^Apply CSV$/i }));
    expect(screen.getByRole('button', { name: /Replace 3 existing responses/i })).toBeInTheDocument();
    expect(screen.getByTestId('feedback-summary').textContent).toMatch(/3\s*responses/i);
    await userEvent.click(screen.getByRole('button', { name: /Replace 3 existing responses/i }));
    expect(screen.getByTestId('feedback-summary').textContent).toMatch(/1\s*responses/i);
    expect(screen.getByText('Replaced 3 existing responses with 1 response.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Apply CSV$/i })).toBeDisabled();
  });

  it('blocks malformed or zero-row CSV and keeps existing responses unchanged', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Feedback$/i }));
    await userEvent.click(screen.getByText('Import CSV instead'));
    const csv = screen.getByLabelText(/CSV feedback import/i);
    await userEvent.clear(csv);
    await userEvent.type(csv, 'clarity,usefulness');
    await userEvent.click(screen.getByRole('button', { name: /^Preview CSV$/i }));
    expect(screen.getByText(/no feedback rows/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Apply CSV$/i })).toBeDisabled();
    expect(screen.getByTestId('feedback-summary').textContent).toMatch(/2\s*responses/i);

    await userEvent.clear(csv);
    await userEvent.type(csv, 'clarity,usefulness\n5,4,extra');
    await userEvent.click(screen.getByRole('button', { name: /^Preview CSV$/i }));
    expect(screen.getByText(/inconsistent number of cells/i)).toBeInTheDocument();
    expect(screen.getByTestId('feedback-summary').textContent).toMatch(/2\s*responses/i);
  });

  it('keeps missing CSV scores undefined and displays missing summary values as an em dash', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Feedback$/i }));
    await userEvent.click(screen.getByText('Import CSV instead'));
    const csv = screen.getByLabelText(/CSV feedback import/i);
    await userEvent.type(csv, 'clarity,usefulness\n5,');
    await userEvent.click(screen.getByRole('button', { name: /^Preview CSV$/i }));
    await userEvent.selectOptions(screen.getByLabelText(/CSV import mode/i), 'replace');
    await userEvent.click(screen.getByRole('button', { name: /^Apply CSV$/i }));
    await userEvent.click(screen.getByRole('button', { name: /Replace 2 existing responses/i }));

    const stored = JSON.parse(localStorage.getItem('aligned.sessions.v1') ?? '{}').sessions[0];
    expect(stored.feedbackResponses[0]).toEqual({ clarity: 5 });
    expect(screen.getByTestId('feedback-summary').textContent).toContain('— usefulness');
    expect(screen.getByTestId('feedback-summary').textContent).not.toContain('0 usefulness');
  });

  it('previews JSON replacement and requires confirmation before replacing the current library', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: /Back to sessions/i }));
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

    expect(await screen.findByRole('dialog', { name: /Replace local session library/i })).toBeInTheDocument();
    expect(screen.getByText(/Detected 1 session/i)).toBeInTheDocument();
    expect(screen.getByText(/will replace your current local session library/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Download current backup/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Replace local library/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Compartment syndrome and basic wound closure/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Replace local library/i }));
    expect(await screen.findByRole('button', { name: /Imported teaching session/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Import JSON backup/i)).toHaveFocus();
  });

  it('reports an unreadable backup file without opening restore confirmation', async () => {
    render(<App />);
    const file = new File(['unreadable'], 'backup.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', {
      value: vi.fn().mockRejectedValue(new Error('read failed')),
    });

    await userEvent.upload(screen.getByLabelText(/Import JSON backup/i), file);

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not read backup file.');
    expect(screen.queryByRole('dialog', { name: /Replace local session library/i })).not.toBeInTheDocument();
  });

  it('moves focus to the restore backup action when preview opens', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: /Back to sessions/i }));
    const file = new File([JSON.stringify({ version: 1, sessions: [buildDemoSession()] })], 'backup.json', { type: 'application/json' });

    await userEvent.upload(screen.getByLabelText(/Import JSON backup/i), file);

    expect(await screen.findByRole('button', { name: /Download current backup/i })).toHaveFocus();
  });

  it('downloads the current backup before replacement when requested', async () => {
    const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<App />);
    const file = new File([JSON.stringify({ version: 1, sessions: [buildDemoSession()] })], 'backup.json', { type: 'application/json' });

    await userEvent.upload(screen.getByLabelText(/Import JSON backup/i), file);
    await userEvent.click(await screen.findByRole('button', { name: /Download current backup/i }));

    expect(download).toHaveBeenCalledTimes(1);
  });

  it('keeps keyboard focus inside the restore confirmation and cancels with Escape', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: /Back to sessions/i }));
    const file = new File([JSON.stringify({ version: 1, sessions: [buildDemoSession()] })], 'backup.json', { type: 'application/json' });

    await userEvent.upload(screen.getByLabelText(/Import JSON backup/i), file);
    const download = await screen.findByRole('button', { name: /Download current backup/i });
    expect(download).toHaveFocus();

    await userEvent.tab();
    expect(screen.getByRole('button', { name: /Cancel restore/i })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: /Replace local library/i })).toHaveFocus();
    await userEvent.tab();
    expect(download).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: /Replace local library/i })).toHaveFocus();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: /Replace local session library/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Compartment syndrome and basic wound closure/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Import JSON backup/i)).toHaveFocus();
  });

  it('keeps invalid initial Capture data in the form rather than creating default-filled records', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Log teaching I have just done/i }));

    await userEvent.type(screen.getByLabelText(/Session title/i), '   ');
    await userEvent.type(screen.getByLabelText(/Audience/i), '   ');
    await userEvent.clear(screen.getByLabelText(/Setting/i));
    await userEvent.type(screen.getByLabelText(/Setting/i), '   ');
    await userEvent.clear(screen.getByLabelText(/^Date$/i));
    await userEvent.type(screen.getByLabelText(/^Date$/i), '31/02/2026');
    await userEvent.clear(screen.getByLabelText(/Duration minutes/i));
    await userEvent.type(screen.getByLabelText(/Duration minutes/i), '0');
    await userEvent.click(screen.getByRole('button', { name: /^Save session$/i }));

    expect(await screen.findByText('Enter a session title.')).toBeInTheDocument();
    expect(screen.getByText('Enter an audience.')).toBeInTheDocument();
    expect(screen.getByText('Enter a setting.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid calendar date.')).toBeInTheDocument();
    expect(screen.getByText('Enter a duration greater than zero.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Session title/i)).toHaveFocus();
    expect(screen.getByLabelText(/Session title/i)).toHaveAttribute('aria-describedby', 'entry-title-error');
    expect(screen.getByText('Enter a session title.')).toHaveAttribute('id', 'entry-title-error');
    expect(screen.getByLabelText(/Audience/i)).toHaveAttribute('aria-describedby', 'entry-audience-error');
    expect(screen.getByText('Enter an audience.')).toHaveAttribute('id', 'entry-audience-error');
    expect(screen.getByRole('heading', { name: /Log teaching I have just done/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^Capture$/i })).not.toBeInTheDocument();
  });

  it('uses five canonical stages and validates Capture edits without rendering duplicate bodies', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));

    expect(await screen.findByRole('heading', { name: /^Capture$/i })).toHaveFocus();
    expect(screen.getByText('Compartment syndrome and basic wound closure')).toBeInTheDocument();
    for (const stage of ['Capture', 'Plan', 'Feedback', 'Reflect', 'Export']) {
      expect(screen.getByRole('button', { name: new RegExp(`^${stage}$`, 'i') })).toBeInTheDocument();
    }

    await userEvent.click(screen.getByRole('button', { name: /^Plan$/i }));
    expect(await screen.findByRole('heading', { name: /^Plan$/i })).toHaveFocus();
    expect(screen.queryByRole('heading', { name: /^Capture$/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /^Reflect$/i }));
    expect(await screen.findByRole('heading', { name: /^Reflect$/i })).toHaveFocus();
    expect(screen.getAllByRole('heading', { name: /^Reflect$/i })).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: /^Capture$/i }));
    await userEvent.clear(screen.getByLabelText(/^Session title$/i));
    await userEvent.type(screen.getByLabelText(/^Session title$/i), '   ');
    await userEvent.clear(screen.getByLabelText(/^Date$/i));
    await userEvent.type(screen.getByLabelText(/^Date$/i), '31/02/2026');
    await userEvent.clear(screen.getByLabelText(/Duration minutes/i));
    await userEvent.type(screen.getByLabelText(/Duration minutes/i), '0');

    expect(screen.getByText('Enter a session title.')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid calendar date.')).toBeInTheDocument();
    expect(screen.getByText('Enter a duration greater than zero.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Session title$/i)).toHaveAttribute('aria-describedby', 'capture-title-error');
    expect(screen.getByText('Enter a session title.')).toHaveAttribute('id', 'capture-title-error');
    expect(screen.getByLabelText(/^Date$/i)).toHaveAttribute('aria-describedby', 'capture-date-error');
    expect(screen.getByText('Enter a valid calendar date.')).toHaveAttribute('id', 'capture-date-error');
  });

  it('keeps a coherent page heading hierarchy across home and workspace routes', async () => {
    const { container } = render(<App />);
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect([...container.querySelectorAll('h1, h2, h3')].map((heading) => heading.tagName)).toEqual(['H1', 'H2', 'H3', 'H3', 'H2', 'H2']);

    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    expect(container.querySelectorAll('h1')).toHaveLength(1);
    expect([...container.querySelectorAll('h1, h2, h3')].map((heading) => heading.tagName)).toEqual(['H1', 'H2', 'H2']);
  });

  it('keeps the current library after a restore is cancelled or fails validation', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: /Back to sessions/i }));
    const validFile = new File([JSON.stringify({ version: 1, sessions: [buildDemoSession()] })], 'backup.json', { type: 'application/json' });

    await userEvent.upload(screen.getByLabelText(/Import JSON backup/i), validFile);
    await userEvent.click(screen.getByRole('button', { name: /Cancel restore/i }));
    expect(screen.getByRole('button', { name: /Compartment syndrome and basic wound closure/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Import JSON backup/i)).toHaveFocus();

    const invalidFile = new File(['not JSON'], 'broken.json', { type: 'application/json' });
    await userEvent.upload(screen.getByLabelText(/Import JSON backup/i), invalidFile);
    expect(await screen.findByText(/Unexpected token|Could not import sessions/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Compartment syndrome and basic wound closure/i })).toBeInTheDocument();
  });

  it('keeps the current library when any nested import record is malformed', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: /Back to sessions/i }));
    const malformedSession = {
      ...buildDemoSession(),
      reflection: { model: 'Gibbs', sections: { description: 'Only one section' }, forwardEvaluationMeasure: '' },
    };
    const file = new File([JSON.stringify({ version: 1, sessions: [buildDemoSession(), malformedSession] })], 'broken-nested.json', { type: 'application/json' });

    await userEvent.upload(screen.getByLabelText(/Import JSON backup/i), file);

    expect(await screen.findByText(/Session 2 has an invalid reflection/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /Replace local session library/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Compartment syndrome and basic wound closure/i })).toBeInTheDocument();
  });

  it('rejects malformed typed feedback without opening replacement or changing the library', async () => {
    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: /Back to sessions/i }));
    const malformedSession = { ...buildDemoSession(), feedbackResponses: [{ freeText: 3 }] };
    const file = new File([JSON.stringify({ version: 1, sessions: [malformedSession] })], 'broken-feedback.json', { type: 'application/json' });

    await userEvent.upload(screen.getByLabelText(/Import JSON backup/i), file);

    expect(await screen.findByText(/Session 1 has invalid feedback responses/i)).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /Replace local session library/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Compartment syndrome and basic wound closure/i })).toBeInTheDocument();
  });

  it('preserves an edited reflection after the App unmounts and a fresh App loads local storage', async () => {
    const { unmount } = render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Reflect$/i }));
    const feelings = screen.getByLabelText(/^Feelings$/i);
    await userEvent.clear(feelings);
    await userEvent.type(feelings, 'This reflection must survive reopening the session.');

    await waitFor(() => {
      expect(localStorage.getItem('aligned.sessions.v1')).toContain('This reflection must survive reopening the session.');
    });
    unmount();

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Compartment syndrome and basic wound closure/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Reflect$/i }));

    expect(screen.getByLabelText(/^Feelings$/i)).toHaveValue('This reflection must survive reopening the session.');
  });

  it('exports a no-feedback evidence pack with derived non-blocking omissions and current authored text', async () => {
    const session = buildQuickSession({
      title: 'Ward suturing',
      date: '2020-01-01',
      audience: 'FY1 doctors',
      topic: 'Simple interrupted sutures',
      durationMinutes: 30,
      setting: 'Ward skills corner',
    });
    session.reflection.sections.feelings = 'I will allow more supervised hands-on practice.';
    session.reflection.forwardEvaluationMeasure = 'Observe two learners completing supervised sutures next week.';
    session.evidenceNotes = 'Attendance sheet stored in portfolio folder.';
    localStorage.setItem('aligned.sessions.v1', serialiseSessions([session]));

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Ward suturing/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Export$/i }));

    expect(await screen.findByRole('heading', { name: /^Export$/i })).toHaveFocus();
    expect(screen.queryByLabelText(/^Feelings$/i)).not.toBeInTheDocument();
    expect(screen.getByTestId('export-warnings')).toHaveTextContent(/No learner feedback was recorded/i);
    expect(screen.getByTestId('export-warnings')).toHaveTextContent(/Objectives are incomplete/i);
    expect(screen.getByRole('button', { name: /Download Markdown/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /Print or save PDF/i })).toBeEnabled();
    expect(screen.getByTestId('markdown-preview')).toHaveTextContent('I will allow more supervised hands-on practice.');
    expect(screen.getByTestId('markdown-preview')).toHaveTextContent('Attendance sheet stored in portfolio folder.');
    expect(screen.getByTestId('markdown-preview')).toHaveTextContent('Forward evaluation measure');
    expect(screen.getByTestId('markdown-preview')).toHaveTextContent('Observe two learners completing supervised sutures next week.');
    expect(screen.getByTestId('markdown-preview')).toHaveTextContent('No learner feedback was recorded.');
    expect(screen.getByTestId('markdown-preview')).not.toHaveTextContent('Average clarity: 0');
    expect(document.querySelector('header[data-app-header]')).toHaveAttribute('data-print-hidden');
    expect(screen.getByRole('navigation', { name: /Teaching evidence workflow/i })).toHaveAttribute('data-print-hidden');
    expect(screen.getByRole('button', { name: /Copy Markdown/i }).parentElement).toHaveAttribute('data-print-hidden');
    expect(screen.getByTestId('markdown-preview')).toHaveAttribute('data-print-evidence-pack');
  });

  it('keeps one export action status across copy, download, print, and failure transitions', async () => {
    const clipboard = { writeText: vi.fn().mockResolvedValue(undefined) };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
    const anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL });

    render(<App />);
    await userEvent.click(screen.getByRole('button', { name: /Add demo data/i }));
    await userEvent.click(screen.getByRole('button', { name: /^Export$/i }));

    await userEvent.click(screen.getByRole('button', { name: /Download Markdown/i }));
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('export-action-status')).toHaveTextContent(/Download initiated/i);
    expect(screen.getAllByTestId('export-action-status')).toHaveLength(1);

    await userEvent.click(screen.getByRole('button', { name: /Copy Markdown/i }));
    expect(await screen.findByTestId('export-action-status')).toHaveTextContent('Markdown copied to clipboard.');
    expect(screen.getAllByTestId('export-action-status')).toHaveLength(1);
    expect(clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('# Teaching evidence pack'));

    clipboard.writeText.mockRejectedValueOnce(new Error('Clipboard denied'));
    await userEvent.click(screen.getByRole('button', { name: /Copy Markdown/i }));
    expect(await screen.findByTestId('export-action-status')).toHaveTextContent(/could not be copied/i);
    expect(screen.getAllByTestId('export-action-status')).toHaveLength(1);

    anchorClick.mockImplementationOnce(() => { throw new Error('Download blocked'); });
    await userEvent.click(screen.getByRole('button', { name: /Download Markdown/i }));
    expect(await screen.findByTestId('export-action-status')).toHaveTextContent(/could not be initiated/i);
    expect(screen.getAllByTestId('export-action-status')).toHaveLength(1);
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);

    await userEvent.click(screen.getByRole('button', { name: /Print or save PDF/i }));
    expect(print).toHaveBeenCalledTimes(1);
    expect(await screen.findByTestId('export-action-status')).toHaveTextContent(/Print dialog initiated/i);
    expect(screen.getAllByTestId('export-action-status')).toHaveLength(1);

    print.mockImplementationOnce(() => { throw new Error('Print blocked'); });
    await userEvent.click(screen.getByRole('button', { name: /Print or save PDF/i }));
    expect(await screen.findByTestId('export-action-status')).toHaveTextContent(/could not be initiated/i);
    expect(screen.getAllByTestId('export-action-status')).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem('aligned.sessions.v1') ?? '{}').sessions[0]).not.toHaveProperty('exported');
  });
});
