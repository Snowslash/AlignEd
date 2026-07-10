import { describe, expect, it } from 'vitest';
import { buildQuickSession } from './core';
import {
  getCaptureState,
  getExportWarnings,
  getFeedbackState,
  getPlanningState,
  getSuggestedSessionAction,
  getSessionTiming,
  getSuggestedResumeStage,
  sortSessionsForHome,
} from './workflow';

describe('workflow selectors', () => {
  const session = buildQuickSession({
    title: 'Compartment syndrome teaching',
    date: '2026-07-02',
    audience: 'FY1 doctors',
    topic: 'Compartment syndrome',
    durationMinutes: 30,
    setting: 'Ward teaching',
  });

  it('derives Capture readiness only from meaningful factual session data', () => {
    expect(getCaptureState(session)).toBe('ready');
    expect(getCaptureState({ ...session, durationMinutes: 0 })).toBe('in_progress');
    expect(getCaptureState({ ...session, date: 'not-a-date' })).toBe('attention_needed');
  });

  it('derives Plan readiness from all required fields on the same meaningful objective', () => {
    expect(getPlanningState(session)).toBe('in_progress');
    const objective = {
      ...session.objectives[0],
      text: 'Explain the initial management of compartment syndrome',
    };

    expect(getPlanningState({ ...session, objectives: [{ ...objective, bloom: '' as never }] })).toBe('in_progress');
    expect(getPlanningState({ ...session, objectives: [{ ...objective, activity: '' }] })).toBe('in_progress');
    expect(getPlanningState({ ...session, objectives: [{ ...objective, assessment: '' }] })).toBe('in_progress');
    expect(getPlanningState({ ...session, objectives: [{ ...objective, evidence: [] }] })).toBe('in_progress');
    expect(getPlanningState({
      ...session,
      objectives: [{ ...objective, assessment: '' }, { ...objective, evidence: [] }],
    })).toBe('in_progress');
    expect(getPlanningState({ ...session, objectives: [objective] })).toBe('ready');
  });

  it('derives Feedback readiness only from stored feedback rows', () => {
    expect(getFeedbackState(session)).toBe('not_started');
    expect(getFeedbackState({ ...session, feedbackResponses: [{ clarity: 5 }] })).toBe('ready');
  });

  it('derives upcoming and past state from the ISO session date', () => {
    expect(getSessionTiming(session, '2026-07-01')).toBe('upcoming');
    expect(getSessionTiming(session, '2026-07-03')).toBe('past');
  });

  it('resumes a past session with placeholder planning at Plan', () => {
    expect(getSuggestedResumeStage(session, '2026-07-03')).toBe('plan');
  });

  it('derives the exact next action from Capture, Plan, Feedback and session timing without inferring reflection review', () => {
    const plannedSession = {
      ...session,
      objectives: [{
        ...session.objectives[0],
        text: 'Explain the initial management of compartment syndrome',
      }],
    };

    expect(getSuggestedSessionAction(session, '2026-07-01')).toEqual({ stage: 'plan', label: 'Continue planning' });
    expect(getSuggestedSessionAction(session, '2026-07-03')).toEqual({ stage: 'plan', label: 'Continue planning' });
    expect(getSuggestedSessionAction(plannedSession, '2026-07-01')).toEqual({ stage: 'plan', label: 'Continue planning' });
    expect(getSuggestedSessionAction(plannedSession, '2026-07-03')).toEqual({ stage: 'feedback', label: 'Add feedback' });
    expect(getSuggestedSessionAction({ ...plannedSession, feedbackResponses: [{ clarity: 5 }] }, '2026-07-03')).toEqual({
      stage: 'reflect',
      label: 'Review reflection',
    });
    expect(getSuggestedSessionAction({ ...plannedSession, date: 'not-a-date' }, '2026-07-03')).toEqual({
      stage: 'capture',
      label: 'Review Capture details',
    });
    expect(getSuggestedResumeStage({
      ...plannedSession,
      feedbackResponses: [{ clarity: 5 }],
      reflection: {
        ...plannedSession.reflection,
        sections: { ...plannedSession.reflection.sections, feelings: 'Author-written reflection.' },
      },
    }, '2026-07-03')).toBe('reflect');
  });

  it('sorts one flat Sessions list deterministically without dropping invalid dates', () => {
    const sessionWith = (id: string, title: string, date: string) => ({ ...session, id, title, date });
    const sorted = sortSessionsForHome([
      sessionWith('past-b', 'Bravo', '2026-07-08'),
      sessionWith('upcoming-b', 'Bravo', '2026-07-12'),
      sessionWith('invalid-b', 'Bravo', 'not-a-date'),
      sessionWith('past-a', 'Alpha', '2026-07-08'),
      sessionWith('upcoming-a', 'Alpha', '2026-07-12'),
      sessionWith('today', 'Today', '2026-07-10'),
      sessionWith('invalid-a', 'Alpha', 'not-a-date'),
    ], '2026-07-10');

    expect(sorted.map(({ id }) => id)).toEqual([
      'upcoming-a',
      'upcoming-b',
      'today',
      'past-a',
      'past-b',
      'invalid-a',
      'invalid-b',
    ]);
  });

  it('derives export omissions without making the session invalid or blocking export', () => {
    const warnings = getExportWarnings(session);

    expect(warnings).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'no_feedback', message: expect.stringMatching(/No learner feedback was recorded/i) }),
      expect.objectContaining({ code: 'no_evidence_notes' }),
      expect.objectContaining({ code: 'incomplete_objectives' }),
    ]));
    expect(warnings.every((warning) => warning.blocking === false)).toBe(true);
    expect(getFeedbackState(session)).toBe('not_started');
  });
});
