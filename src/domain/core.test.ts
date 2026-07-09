import { describe, expect, it } from 'vitest';
import {
  buildDemoSession,
  buildFeedbackSummary,
  buildGibbsReflectionDraft,
  buildMarkdownExport,
  buildQuickSession,
  checkAlignment,
  checkDose,
  flagObjectiveText,
  parseFeedbackCsv,
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
    expect(md).toContain('Generic teaching evidence');
    expect(md).not.toContain('PGCert');
  });

  it('formats and parses UK dates for display', () => {
    expect(formatUkDate('2026-07-02')).toBe('02/07/2026');
    expect(parseUkDate('02/07/2026')).toBe('2026-07-02');
    expect(parseUkDate('2/7/26')).toBe('2026-07-02');
  });

});
