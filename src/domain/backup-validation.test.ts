import { describe, expect, it } from 'vitest';
import {
  buildDemoSession,
  buildMarkdownExport,
  DEFAULT_FRAMEWORK_TAG,
  deserialiseSessions,
  generateFeedbackQuestions,
  serialiseSessions,
} from './core';
import { previewGoogleFeedbackCsv } from './google-feedback';

// Change one field in an otherwise valid JSON record, so each rejection reaches
// the intended branch rather than failing on an unrelated missing identifier.
function backupWith(path: string, value: unknown): string {
  const session = JSON.parse(JSON.stringify(buildDemoSession()));
  const keys = path.split('.');
  let parent = session;
  for (const key of keys.slice(0, -1)) parent = parent[key];
  parent[keys.at(-1)!] = value;
  return JSON.stringify({ version: 1, sessions: [session] });
}

const malformedArrays = [null, false, 'not an array', {}, [null], [{}], [1], [['nested']]];

describe('backup admission of consumed nested fields', () => {
  it.each(['frameworkTags', 'feedbackQuestions'])('rejects malformed present %s, not just non-arrays', (field) => {
    for (const value of malformedArrays) {
      const message = field === 'frameworkTags' ? 'invalid framework tags' : 'invalid feedback questions';
      expect(() => deserialiseSessions(backupWith(field, value)), JSON.stringify(value)).toThrow(message);
    }
  });

  it.each(['level', 'evidenceNotes'])('does not default malformed present %s', (field) => {
    for (const value of [null, false, 3, {}, []]) {
      expect(() => deserialiseSessions(backupWith(field, value)), JSON.stringify(value)).toThrow(`invalid ${field}`);
    }
  });

  it.each([null, false, 0, '', [], {}].map((value) => [value]))('rejects malformed present reflection %j', (value) => {
    expect(() => deserialiseSessions(backupWith('reflection', value))).toThrow('invalid reflection');
  });

  it.each(['description', 'feelings', 'evaluation', 'analysis', 'conclusion', 'actionPlan'])('rejects a malformed reflection section: %s', (field) => {
    for (const value of [undefined, null, 2, {}, []]) {
      expect(() => deserialiseSessions(backupWith(`reflection.sections.${field}`, value))).toThrow('invalid reflection');
    }
  });

  it.each(['model', 'sections', 'forwardEvaluationMeasure'])('rejects malformed reflection %s', (field) => {
    expect(() => deserialiseSessions(backupWith(`reflection.${field}`, {}))).toThrow('invalid reflection');
  });

  it.each([null, false, 1, '', [], {}].map((value) => [value]))('rejects malformed present rigour %j', (value) => {
    expect(() => deserialiseSessions(backupWith('rigour', value))).toThrow('invalid rigour');
  });

  it.each([undefined, null, 'false', 0, {}, []].map((value) => [value]))('requires a boolean rigour enabled flag: %j', (value) => {
    expect(() => deserialiseSessions(backupWith('rigour.enabled', value))).toThrow('invalid rigour');
  });

  it.each([null, false, '', [], {}, { validity: 4 }].map((value) => [value]))('rejects malformed present utility structure %j', (value) => {
    expect(() => deserialiseSessions(backupWith('rigour.utility', value))).toThrow('invalid rigour');
  });

  it.each(['validity', 'reliability', 'educationalImpact', 'acceptability', 'cost'])('requires a finite 1–5 utility score for %s', (field) => {
    for (const value of [undefined, null, false, '4', {}, 0, 6, Infinity]) {
      expect(() => deserialiseSessions(backupWith(`rigour.utility.${field}`, value)), String(value)).toThrow('invalid rigour');
    }
  });

  it.each([null, false, 3, {}, []].map((value) => [value]))('rejects a malformed equity prompt %j', (value) => {
    expect(() => deserialiseSessions(backupWith('rigour.equityPrompt', value))).toThrow('invalid rigour');
  });

  it.each([null, false, 'pass', [], {}].map((value) => [value]))('rejects malformed present dose check %j', (value) => {
    expect(() => deserialiseSessions(backupWith('rigour.doseCheck', value))).toThrow('invalid rigour');
  });

  it.each([
    ['status', undefined], ['status', 'success'], ['status', {}],
    ['message', undefined], ['message', null], ['message', {}],
    ['suggestedMax', undefined], ['suggestedMax', '2'], ['suggestedMax', 0],
    ['suggestedMax', -1], ['suggestedMax', 1.5], ['suggestedMax', Infinity],
  ])('rejects malformed dose check %s = %j', (field, value) => {
    expect(() => deserialiseSessions(backupWith(`rigour.doseCheck.${field}`, value))).toThrow('invalid rigour');
  });

  it.each(['miller', 'dreyfusStage', 'observedStandard'])('rejects non-string optional objective metadata: %s', (field) => {
    for (const value of [null, false, 3, {}, []]) {
      expect(() => deserialiseSessions(backupWith(`objectives.0.${field}`, value))).toThrow('invalid objectives');
    }
  });

  it.each([
    ['bloom', 'Unknown'], ['miller', 'Unknown'], ['dreyfusStage', 'Unknown'], ['evidence', ['Unknown']],
    ['id', ''], ['id', '   '],
  ])('rejects invalid objective classification or identifier: %s = %j', (field, value) => {
    expect(() => deserialiseSessions(backupWith(`objectives.0.${field}`, value))).toThrow('invalid objectives');
  });

  it.each(['evidence', 'frameworkTags'])('rejects malformed objective string arrays: %s', (field) => {
    for (const value of malformedArrays) {
      expect(() => deserialiseSessions(backupWith(`objectives.0.${field}`, value))).toThrow('invalid objectives');
    }
  });

  it('rejects duplicate objective IDs within a session before editing can affect two objectives', () => {
    const session = buildDemoSession();
    session.objectives[1].id = session.objectives[0].id;
    expect(() => deserialiseSessions(serialiseSessions([session]))).toThrow('duplicate objective ID');
  });

  it.each(['googleFormsImportKey', 'googleFormsTimestamp'])('rejects malformed Google CSV provenance: %s', (field) => {
    for (const value of [null, false, 3, {}, []]) {
      expect(() => deserialiseSessions(backupWith(`feedbackResponses.0.${field}`, value))).toThrow('invalid feedback responses');
    }
  });

  it.each(['clarity', 'usefulness', 'preConfidence', 'postConfidence'])('rejects malformed response scores: %s', (field) => {
    for (const value of [null, false, '4', {}, 0, 6]) {
      expect(() => deserialiseSessions(backupWith(`feedbackResponses.0.${field}`, value))).toThrow('invalid feedback responses');
    }
  });

  it.each(['freeText', 'peerObservation', 'customColumn'])('rejects structured feedback values: %s', (field) => {
    expect(() => deserialiseSessions(backupWith(`feedbackResponses.0.${field}`, {}))).toThrow('invalid feedback responses');
  });

  it.each(['id', 'title', 'date', 'audience', 'topic', 'setting', 'createdAt', 'updatedAt'])('still requires a nonblank session %s', (field) => {
    for (const value of [undefined, null, {}, '   ']) {
      expect(() => deserialiseSessions(backupWith(field, value))).toThrow(`missing ${field}`);
    }
  });

  it.each([null, '30', 0, -1, Infinity])('still rejects invalid duration %j', (value) => {
    expect(() => deserialiseSessions(backupWith('durationMinutes', value))).toThrow('invalid duration');
  });

  it.each(['objectives', 'feedbackResponses'])('still rejects malformed required record arrays: %s', (field) => {
    for (const value of [undefined, null, {}, [null], [[]]]) {
      expect(() => deserialiseSessions(backupWith(field, value))).toThrow(field === 'objectives' ? 'invalid objectives' : 'invalid feedback responses');
    }
  });
});

describe('backup compatibility and lossless session round trips', () => {
  it.each(['legacy', 'version-1'])('preserves the complete authored shape in a %s backup', (format) => {
    const session = buildDemoSession();
    session.objectives[0].observedStandard = 'Authored standard';
    session.frameworkTags = ['Custom legacy framework'];
    session.feedbackQuestions = ['An authored question?'];
    session.feedbackResponses.push({ freeText: 'A text-only response', source: 'paper', customScore: 2.5 });
    session.reflection.sections.analysis = 'Authored analysis, not a generated suggestion.';
    const raw = format === 'legacy' ? JSON.stringify([session]) : serialiseSessions([session]);
    const restored = deserialiseSessions(raw);
    // Compare session JSON shape, not exportedAt (a new envelope export timestamp).
    expect(restored).toEqual([session]);
    expect(deserialiseSessions(serialiseSessions(restored))).toEqual([session]);
    expect(buildMarkdownExport(restored[0], undefined, restored[0].reflection)).toContain(session.reflection.sections.analysis);
  });

  it('fills only absent supported legacy fields, including optional advanced planning notes', () => {
    const session = buildDemoSession();
    const legacy = JSON.parse(JSON.stringify(session));
    for (const key of ['level', 'frameworkTags', 'feedbackQuestions', 'reflection', 'evidenceNotes']) delete legacy[key];
    legacy.rigour = { enabled: true };
    const [restored] = deserialiseSessions(JSON.stringify([legacy]));
    expect(restored).toMatchObject({
      id: session.id, date: session.date, createdAt: session.createdAt, updatedAt: session.updatedAt,
      objectives: session.objectives, feedbackResponses: session.feedbackResponses,
      level: 'Mixed', frameworkTags: [DEFAULT_FRAMEWORK_TAG], evidenceNotes: '',
      feedbackQuestions: generateFeedbackQuestions(session.objectives),
      rigour: { enabled: true, utility: { validity: 3, reliability: 3, educationalImpact: 3, acceptability: 4, cost: 4 }, equityPrompt: '' },
      reflection: { model: 'Gibbs', forwardEvaluationMeasure: expect.any(String) },
    });
    expect(restored.rigour.doseCheck).toBeUndefined();
    expect(deserialiseSessions(serialiseSessions([restored]))).toEqual([restored]);
    expect(buildMarkdownExport(restored, undefined, restored.reflection)).toContain('## Advanced planning notes');
  });

  it('defaults absent rigour without inventing dose evidence', () => {
    const session = JSON.parse(JSON.stringify(buildDemoSession()));
    delete session.rigour;
    const [restored] = deserialiseSessions(JSON.stringify([session]));
    expect(restored.rigour).toEqual({ enabled: false, utility: { validity: 3, reliability: 3, educationalImpact: 3, acceptability: 4, cost: 4 }, equityPrompt: '' });
  });

  it('preserves empty authored text/arrays, optional metadata omissions and utility boundaries', () => {
    const session = buildDemoSession();
    session.level = '';
    session.frameworkTags = [];
    session.feedbackQuestions = [];
    session.rigour.equityPrompt = '';
    session.rigour.utility = { validity: 1, reliability: 5, educationalImpact: 3.5, acceptability: 2, cost: 4 };
    delete session.rigour.doseCheck;
    session.objectives[0] = { id: 'draft', text: '', bloom: 'Apply', activity: '', assessment: '', evidence: [], frameworkTags: [] };
    session.objectives[1].observedStandard = '';
    expect(deserialiseSessions(serialiseSessions([session]))).toEqual([session]);
  });

  it.each(['legacy', 'version-1'])('preserves Google provenance and duplicate multiplicity through %s restore', (format) => {
    const session = buildDemoSession();
    session.title = 'Synthetic CSV session';
    session.feedbackResponses = [];
    const headers = 'Timestamp,Session title:,Session date:,How clear was the session?,How useful was the session?,What was your confidence in the topic before the session?,What was your confidence in the topic after the session?,Any other comments?';
    const row = `02/07/2026 14:00:00,${session.title},${session.date},5,4,2,4,More practice`;
    const csv = `${headers}\n${row}\n${row}`;
    const preview = previewGoogleFeedbackCsv(csv, session, 'dmy', [session]);
    if (!preview.ok) throw new Error(preview.error);
    session.feedbackResponses = preview.rows;
    const [restored] = deserialiseSessions(format === 'legacy' ? JSON.stringify([session]) : serialiseSessions([session]));
    expect(restored.feedbackResponses).toEqual(preview.rows);
    expect(restored.feedbackResponses).toHaveLength(2);
    expect(restored.feedbackResponses[0].googleFormsTimestamp).toBe('02/07/2026 14:00:00');
    const repeated = previewGoogleFeedbackCsv(csv, restored, 'dmy', [restored]);
    expect(repeated).toMatchObject({ ok: true, rows: [], duplicateCount: 2, matchedCount: 2 });
  });
});
