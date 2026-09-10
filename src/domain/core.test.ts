import { describe, expect, it } from 'vitest';
import {
  buildDemoSession,
  buildFeedbackSummary,
  buildGibbsReflectionDraft,
  buildReflectionSuggestion,
  buildMarkdownExport,
  buildQuickSession,
  checkAlignment,
  checkDose,
  deserialiseSessions,
  flagObjectiveText,
  parseFeedbackCsv,
  previewFeedbackCsv,
  scoreUtility,
  formatUkDate,
  parseUkDate,
} from './core';

describe('AlignEd domain', () => {
  it('builds a 60-second session with generic framework tags and Gibbs reflection defaults', () => {
    const session = buildQuickSession({
      title: 'Compartment syndrome teaching',
      date: '2026-07-02',
      audience: 'FY1 doctors',
      topic: 'Compartment syndrome',
      durationMinutes: 30,
      setting: 'Ward teaching',
    });

    expect(session.title).toBe('Compartment syndrome teaching');
    expect(session.frameworkTags).toEqual(['Generic teaching evidence']);
    expect(session.reflection.model).toBe('Gibbs');
    expect(session.rigour.enabled).toBe(false);
    expect(session.objectives[0]?.text).toBe('By the end of this session, ...');
    expect(session.feedbackQuestions[4]).toBe('After this session, how confident do you feel about the main learning point?');
  });

  it('flags unmeasurable objective verbs and dose overload', () => {
    expect(flagObjectiveText('Understand compartment syndrome')).toContain('Use an observable verb');
    expect(checkDose(20, [{ id: '1' }, { id: '2' }, { id: '3' }] as any)).toEqual({
      status: 'warning',
      message: '3 objectives in 20 min may overload the session; consider 1 objective for this duration.',
      suggestedMax: 1,
    });
  });

  it('keeps constructive alignment disabled while the alignment engine is being redesigned', () => {
    expect(checkAlignment({ miller: 'Shows how', assessment: 'Verbal Qs' } as any)).toEqual({
      status: 'pass',
      message: 'Alignment engine deferred; review activity/objective/assessment alignment manually for now.',
    });
  });

  it('scores utility with clear strengths and cautions', () => {
    const score = scoreUtility({ validity: 4, reliability: 2, educationalImpact: 5, acceptability: 4, cost: 5 });
    expect(score.average).toBe(4);
    expect(score.strengths).toContain('educational impact');
    expect(score.cautions).toContain('reliability');
  });

  it('parses feedback CSV and summarises learner confidence gaps', () => {
    const rows = parseFeedbackCsv('clarity,usefulness,pre_confidence,post_confidence,one_change\n5,4,2,4,More practice\n4,5,3,4,');
    const summary = buildFeedbackSummary(rows);

    expect(rows).toHaveLength(2);
    expect(summary.responseCount).toBe(2);
    expect(summary.averageClarity).toBe(4.5);
    expect(summary.averageConfidenceGain).toBe(1.5);
    expect(summary.themes).toContain('More practice');
  });

  it('previews strict feedback CSV without fabricating missing scores', () => {
    const preview = previewFeedbackCsv('clarity,usefulness,pre_confidence,post_confidence,one_change,source\n5,,2,,More practice,paper');

    expect(preview).toMatchObject({ ok: true, rowCount: 1 });
    if (!preview.ok) throw new Error('Expected valid CSV preview');
    expect(preview.rows[0]).toMatchObject({ clarity: 5, preConfidence: 2, freeText: 'More practice', source: 'paper' });
    expect(preview.rows[0]?.usefulness).toBeUndefined();
    expect(preview.rows[0]?.postConfidence).toBeUndefined();
    expect(buildFeedbackSummary(preview.rows)).toMatchObject({ averageUsefulness: undefined, averageConfidenceGain: undefined });
  });

  it.each([
    ['', 'usable header row'],
    ['clarity,usefulness\n5,4,extra', 'inconsistent number of cells'],
    ['clarity,clarity\n5,4', 'duplicate header'],
    ['unknown\nvalue', 'recognised feedback header'],
    ['clarity,usefulness\n"5,4', 'unbalanced quote'],
    ['clarity,usefulness', 'no feedback rows'],
  ])('rejects malformed feedback CSV: %s', (csv, message) => {
    const preview = previewFeedbackCsv(csv);

    expect(preview.ok).toBe(false);
    if (preview.ok) throw new Error('Expected invalid CSV preview');
    expect(preview.error).toMatch(new RegExp(message, 'i'));
    expect(parseFeedbackCsv(csv)).toEqual([]);
  });

  it('creates a Gibbs-first reflection draft and Markdown evidence export', () => {
    const session = buildDemoSession();
    const feedback = buildFeedbackSummary(session.feedbackResponses);
    const reflection = buildGibbsReflectionDraft(session, feedback);
    const md = buildMarkdownExport(session, feedback, reflection);

    expect(reflection.sections.description).toContain(session.title);
    expect(reflection.sections.actionPlan).toContain('Next time');
    expect(md).toContain('# Teaching evidence pack');
    expect(md).toContain('## Reflection scaffold');
    expect(md).not.toContain('## Gibbs reflection scaffold');
    expect(md).toContain('- Date: 02/07/2026');
    expect(md).not.toContain('- Alignment:');
    expect(md).not.toContain('- Utility:');
    expect(md).toContain('## Advanced planning notes');
    expect(md).not.toContain('## Rigour Mode notes');
    expect(md).not.toContain('Generic teaching evidence');
    expect(md).not.toContain('PGCert');
    expect(md).toContain('## How I will check next time');
    expect(md).toContain(reflection.forwardEvaluationMeasure);
  });

  it('exports legacy advanced sessions that omit optional planning notes', () => {
    const [session] = deserialiseSessions(JSON.stringify([{ ...buildDemoSession(), rigour: { enabled: true } }]));
    const markdown = buildMarkdownExport(session, undefined, session.reflection);
    expect(markdown).toContain('## Advanced planning notes');
    expect(markdown).not.toContain('Equity prompt:');
  });

  it('uses plain-language suggestions while preserving authored education terminology', () => {
    const session = buildDemoSession();
    session.reflection.sections.analysis = 'My authored analysis deliberately mentions Kirkpatrick.';
    const suggestion = buildReflectionSuggestion(session, buildFeedbackSummary(session.feedbackResponses));
    expect(suggestion.sections.analysis).not.toContain('Kirkpatrick');
    expect(buildMarkdownExport(session, undefined, session.reflection)).toContain(session.reflection.sections.analysis);
  });

  it('exports an honest no-feedback evidence pack without fabricated averages or learner outcomes', () => {
    const session = buildQuickSession({
      title: 'Ward suturing',
      date: '2026-07-02',
      audience: 'FY1 doctors',
      topic: 'Simple interrupted sutures',
      durationMinutes: 30,
      setting: 'Ward skills corner',
    });
    const markdown = buildMarkdownExport(session, buildFeedbackSummary([]), session.reflection);

    expect(markdown).toContain('No learner feedback was recorded.');
    expect(markdown).toContain('No learner response, average, or learner outcome is reported.');
    expect(markdown).not.toContain('Average clarity: 0');
    expect(markdown).not.toContain('Average usefulness: 0');
    expect(markdown).not.toContain('## Kirkpatrick evaluation spine');
    expect(markdown).toContain('## How I will check next time');
    expect(markdown).toContain(session.reflection.forwardEvaluationMeasure);
  });

  it('builds a feedback suggestion without changing the authored reflection', () => {
    const session = buildDemoSession();
    const authoredReflection = {
      ...session.reflection,
      sections: { ...session.reflection.sections, feelings: 'The clinician wrote this reflection.' },
    };
    const feedback = buildFeedbackSummary([{ clarity: 5, usefulness: 5, preConfidence: 2, postConfidence: 4 }]);

    const suggestion = buildReflectionSuggestion({ ...session, reflection: authoredReflection }, feedback);

    expect(suggestion.sections.evaluation).toContain('1 learner response captured');
    expect(authoredReflection.sections.feelings).toBe('The clinician wrote this reflection.');
  });

  it('formats and parses UK dates for display', () => {
    expect(formatUkDate('2026-07-02')).toBe('02/07/2026');
    expect(parseUkDate('02/07/2026')).toBe('2026-07-02');
    expect(parseUkDate('2/7/26')).toBe('2026-07-02');
  });

  it('accepts version-1 envelopes and legacy session arrays while rejecting unsupported versions', () => {
    const session = buildDemoSession();

    expect(deserialiseSessions(JSON.stringify({ version: 1, sessions: [session] }))).toHaveLength(1);
    expect(deserialiseSessions(JSON.stringify([session]))).toHaveLength(1);
    expect(() => deserialiseSessions(JSON.stringify({ version: 2, sessions: [session] }))).toThrow('Unsupported backup version');
  });

  it('rejects impossible ISO dates in imported sessions', () => {
    const session = { ...buildDemoSession(), date: '2026-02-30' };

    expect(() => deserialiseSessions(JSON.stringify({ version: 1, sessions: [session] }))).toThrow('Session 1 has an invalid date.');
  });

  it('rejects feedback fields whose imported values violate their declared types or score range', () => {
    const numericText = { ...buildDemoSession(), feedbackResponses: [{ freeText: 3 }] };
    const stringScore = { ...buildDemoSession(), feedbackResponses: [{ clarity: '5' }] };
    const outOfRangeScore = { ...buildDemoSession(), feedbackResponses: [{ usefulness: 9 }] };

    for (const session of [numericText, stringScore, outOfRangeScore]) {
      expect(() => deserialiseSessions(JSON.stringify({ version: 1, sessions: [session] }))).toThrow('Session 1 has invalid feedback responses.');
    }
  });

  it('rejects backup imports containing duplicate session IDs', () => {
    const session = buildDemoSession();
    const duplicate = { ...session, title: 'Duplicate record' };

    expect(() => deserialiseSessions(JSON.stringify({ version: 1, sessions: [session, duplicate] })))
      .toThrow(`Backup contains duplicate session ID: ${session.id}.`);
  });
});
