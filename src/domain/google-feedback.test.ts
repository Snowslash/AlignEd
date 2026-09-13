import { describe, expect, it } from 'vitest';
import { buildQuickSession, deserialiseSessions, previewFeedbackCsv, serialiseSessions } from './core';
import { buildGoogleFeedbackLink, parseGoogleFormTemplate, previewGoogleFeedbackCsv } from './google-feedback';

const base = 'https://docs.google.com/forms/d/e/TEST_FORM/viewform';
const template = `${base}?usp=pp_url&entry.101=SESSION_TITLE&entry.202=2000-01-02`;
const session = buildQuickSession({ title: 'Sutures & knots', date: '2026-09-13', audience: 'FY1', topic: 'Sutures', durationMinutes: 30, setting: 'Skills lab' });
const headers = ['Timestamp', 'Session title:', 'Session date:', 'How clear was the session?', 'How useful was the session?', 'What was your confidence in the topic before the session? ', 'What was your confidence in the topic after the session? ', 'Any other comments?'];
const row = ['13/09/2026 14:30:00', session.title, '13/09/2026', '5', '4', '2', '4', 'More practice, please\nThanks'];
function csv(rows: string[][], columns = headers) {
  return [columns, ...rows].map((cells) => cells.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\r\n');
}

describe('Google Forms template', () => {
  it('builds a session-only encoded URL without prefilling answers', () => {
    const result = parseGoogleFormTemplate(template);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const link = new URL(buildGoogleFeedbackLink(result.config, session));
    expect(link.origin + link.pathname).toBe(base);
    expect([...link.searchParams.entries()]).toEqual([['usp', 'pp_url'], ['entry.101', session.title], ['entry.202', session.date]]);
    expect(link.href).not.toContain('audience');
  });

  it('supports a Google prefill link using split date fields', () => {
    const result = parseGoogleFormTemplate(`${base}?entry.101=SESSION_TITLE&entry.202_year=2000&entry.202_month=1&entry.202_day=2`);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const link = new URL(buildGoogleFeedbackLink(result.config, session));
    expect(link.searchParams.get('entry.202_year')).toBe('2026');
    expect(link.searchParams.get('entry.202_month')).toBe('9');
    expect(link.searchParams.get('entry.202_day')).toBe('13');
  });

  it.each([
    'javascript:alert(1)',
    template.replace('docs.google.com', 'docs.google.com.evil.example'),
    template.replace('https:', 'http:'),
    template.replace('docs.google.com', 'user:pass@docs.google.com'),
    template.replace('/viewform', '/edit'),
    template.replace('SESSION_TITLE', 'Some title'),
    template + '&entry.303=5',
    template + '&entry.101=SESSION_TITLE',
    template.replace('entry.202', 'entry.101'),
  ])('rejects unsafe, ambiguous or answer-prefilled template %s', (value) => {
    expect(parseGoogleFormTemplate(value).ok).toBe(false);
  });
});

describe('Google Forms CSV import', () => {
  it('maps the real form headings, filters by title AND date, and preserves the original session', () => {
    const before = JSON.stringify(session);
    const result = previewGoogleFeedbackCsv(csv([row, row.map((v, i) => i === 1 ? 'Other teaching' : v), row.map((v, i) => i === 2 ? '12/09/2026' : v)]), session, 'dmy', [session]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result).toMatchObject({ totalCount: 3, matchedCount: 1, excludedCount: 2, duplicateCount: 0 });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ clarity: 5, usefulness: 4, preConfidence: 2, postConfidence: 4, freeText: row[7] });
    expect(result.rows[0].googleFormsImportKey).toEqual(expect.any(String));
    expect(JSON.stringify(session)).toBe(before);
  });

  it('uses an explicit date order, accepts ISO dates, and rejects impossible dates', () => {
    const oct = { ...session, date: '2026-10-09' };
    const ambiguous = row.map((v, i) => i === 2 ? '09/10/2026' : v);
    const uk = previewGoogleFeedbackCsv(csv([ambiguous]), oct, 'dmy', [oct]);
    expect(uk.ok && uk.matchedCount).toBe(1);
    const us = previewGoogleFeedbackCsv(csv([ambiguous]), oct, 'mdy', [oct]);
    expect(us.ok && us.matchedCount).toBe(0);
    expect(previewGoogleFeedbackCsv(csv([row.map((v, i) => i === 2 ? session.date : v)]), session, 'mdy', [session]).ok).toBe(true);
    expect(previewGoogleFeedbackCsv(csv([row.map((v, i) => i === 2 ? '31/02/2026' : v)]), session, 'dmy', [session]).ok).toBe(false);
  });

  it('retains identical simultaneous responses but makes a repeated full export idempotent through backup/restore', () => {
    const first = previewGoogleFeedbackCsv(csv([row, row]), session, 'dmy', [session]);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(first.rows).toHaveLength(2);
    const saved = deserialiseSessions(serialiseSessions([{ ...session, feedbackResponses: first.rows }]))[0];
    const repeat = previewGoogleFeedbackCsv(csv([row, row]), saved, 'dmy', [saved]);
    expect(repeat.ok && repeat.rows).toEqual([]);
    expect(repeat.ok && repeat.duplicateCount).toBe(2);
    const later = previewGoogleFeedbackCsv(csv([row, row, row.map((v, i) => i === 0 ? '13/09/2026 14:31:00' : v)]), saved, 'dmy', [saved]);
    expect(later.ok && later.rows).toHaveLength(1);
  });

  it('does not collapse manual feedback that happens to have the same answers', () => {
    const existing = { ...session, feedbackResponses: [{ clarity: 5, usefulness: 4, preConfidence: 2, postConfidence: 4, freeText: row[7] }] };
    const result = previewGoogleFeedbackCsv(csv([row]), existing, 'dmy', [existing]);
    expect(result.ok && result.rows).toHaveLength(1);
  });

  it('fails closed on missing/unknown/ambiguous columns, scores, timestamps or malformed CSV', () => {
    const inputs = [
      csv([row], headers.map((v, i) => i === 3 ? 'How was the session presentation?' : v)),
      csv([row], headers.map((v, i) => i === 2 ? 'Unknown date heading' : v)),
      csv([row.map((v, i) => i === 3 ? '6' : v)]),
      csv([row.map((v, i) => i === 3 ? '4.5' : v)]),
      csv([row.map((v, i) => i === 0 ? '' : v)]),
      csv([row.map((v, i) => i === 1 ? '' : v)]),
      csv([row]) + '\n"unclosed',
      csv([row], headers.map((v, i) => i === 4 ? headers[3] : v)),
      csv([row.slice(1)]),
      csv([]),
    ];
    for (const input of inputs) expect(previewGoogleFeedbackCsv(input, session, 'dmy', [session]).ok).toBe(false);
  });

  it('preserves missing scores as missing rather than zero, and rejects an empty feedback response', () => {
    const partial = previewGoogleFeedbackCsv(csv([row.map((v, i) => i === 3 ? '' : v)]), session, 'dmy', [session]);
    expect(partial.ok && partial.rows[0].clarity).toBeUndefined();
    const empty = row.map((v, i) => i >= 3 ? '' : v);
    expect(previewGoogleFeedbackCsv(csv([empty]), session, 'dmy', [session]).ok).toBe(false);
  });

  it('blocks same-title/date collisions in the local library', () => {
    const result = previewGoogleFeedbackCsv(csv([row]), session, 'dmy', [session, { ...session, id: 'another' }]);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/same title and date/i);
  });

  it('prevents a Google-shaped file bypassing review through the generic CSV importer', () => {
    const result = previewFeedbackCsv('Timestamp,Session title:,Session date:,clarity\nnow,Other session,13/09/2026,5');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Google Forms/i);
  });
});
