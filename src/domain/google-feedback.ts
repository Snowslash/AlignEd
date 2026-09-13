import { hasValidIsoDate, parseCsvRows, type FeedbackResponse, type TeachingSession } from './core';

export const GOOGLE_FORM_STORAGE_KEY = 'aligned.google-form.v1';
export type DateOrder = 'dmy' | 'mdy';
export interface GoogleFormConfig { responderUrl: string; titleEntry: string; dateEntry: string; splitDate: boolean }
export type GoogleFormTemplateResult = { ok: true; config: GoogleFormConfig } | { ok: false; error: string };
export type GoogleFeedbackPreview = { ok: false; error: string } | {
  ok: true; rows: FeedbackResponse[]; totalCount: number; matchedCount: number; excludedCount: number; duplicateCount: number;
};

/** Accept only a deliberately prepared template, never a respondent's filled answers. */
export function parseGoogleFormTemplate(template: string): GoogleFormTemplateResult {
  const error = 'Use a Google Forms pre-filled link with only SESSION_TITLE as the session title and 2 January 2000 as the session date. Leave feedback answers blank.';
  try {
    if (template.length > 4096) return { ok: false, error: 'The form template link is too long.' };
    const url = new URL(template.trim());
    if (url.protocol !== 'https:' || url.host !== 'docs.google.com' || url.username || url.password || !/^\/forms\/d\/e\/[A-Za-z0-9_-]+\/viewform$/.test(url.pathname)) {
      return { ok: false, error: 'Use the full https://docs.google.com/forms/d/e/…/viewform responder link, not an editor or shortened link.' };
    }
    const entries = [...url.searchParams.entries()].filter(([key]) => key.startsWith('entry.'));
    if (new Set(entries.map(([key]) => key)).size !== entries.length) return { ok: false, error };
    const titles = entries.filter(([key, value]) => /^entry\.\d+$/.test(key) && value === 'SESSION_TITLE');
    if (titles.length !== 1) return { ok: false, error };
    const dates = entries.filter(([key, value]) => /^entry\.\d+$/.test(key) && value === '2000-01-02');
    let dateEntry = dates.length === 1 ? dates[0][0] : '';
    const splitDate = !dateEntry;
    if (splitDate) {
      const years = entries.filter(([key, value]) => /^entry\.\d+_year$/.test(key) && value === '2000');
      if (years.length !== 1) return { ok: false, error };
      dateEntry = years[0][0].replace(/_year$/, '');
      if (!['1', '01'].includes(url.searchParams.get(`${dateEntry}_month`) ?? '') || !['2', '02'].includes(url.searchParams.get(`${dateEntry}_day`) ?? '')) return { ok: false, error };
    }
    const expected = new Set([titles[0][0], ...(splitDate ? ['year', 'month', 'day'].map((part) => `${dateEntry}_${part}`) : [dateEntry])]);
    if (dateEntry === titles[0][0] || entries.length !== expected.size || entries.some(([key]) => !expected.has(key))) return { ok: false, error };
    return { ok: true, config: { responderUrl: `${url.origin}${url.pathname}`, titleEntry: titles[0][0], dateEntry, splitDate } };
  } catch {
    return { ok: false, error };
  }
}

export function buildGoogleFeedbackLink(config: GoogleFormConfig, session: Pick<TeachingSession, 'title' | 'date'>): string {
  if (!session.title.trim() || !hasValidIsoDate(session.date)) throw new Error('Set a valid session title and date in Capture first.');
  const url = new URL(config.responderUrl);
  url.searchParams.set('usp', 'pp_url');
  url.searchParams.set(config.titleEntry, session.title);
  if (config.splitDate) {
    const [year, month, day] = session.date.split('-');
    url.searchParams.set(`${config.dateEntry}_year`, year);
    url.searchParams.set(`${config.dateEntry}_month`, String(Number(month)));
    url.searchParams.set(`${config.dateEntry}_day`, String(Number(day)));
  } else {
    url.searchParams.set(config.dateEntry, session.date);
  }
  if (new TextEncoder().encode(url.href).length > 1600) throw new Error('This session title makes the QR link too long. Shorten the title in Capture.');
  return url.href;
}

function normalise(value: string): string { return value.trim().replace(/^\uFEFF/, '').toLowerCase().replace(/\s+/g, ' ').replace(/:$/, ''); }
function csvDate(raw: string, order: DateOrder): string | undefined {
  const value = raw.trim();
  if (hasValidIsoDate(value)) return value;
  const parts = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!parts) return undefined;
  const date = `${parts[3]}-${(order === 'dmy' ? parts[2] : parts[1]).padStart(2, '0')}-${(order === 'dmy' ? parts[1] : parts[2]).padStart(2, '0')}`;
  return hasValidIsoDate(date) ? date : undefined;
}

const columns = {
  timestamp: 'timestamp',
  title: 'session title',
  date: 'session date',
  clarity: 'how clear was the session?',
  usefulness: 'how useful was the session?',
  preConfidence: 'what was your confidence in the topic before the session?',
  postConfidence: 'what was your confidence in the topic after the session?',
  freeText: 'any other comments?',
} as const;
const scoreFields = ['clarity', 'usefulness', 'preConfidence', 'postConfidence'] as const;

/** Preview only. The caller must review and explicitly append the resulting rows. */
export function previewGoogleFeedbackCsv(csv: string, session: TeachingSession, dateOrder: DateOrder, sessions: readonly TeachingSession[]): GoogleFeedbackPreview {
  const fail = (error: string): GoogleFeedbackPreview => ({ ok: false, error });
  if (csv.length > 2_000_000) return fail('CSV is too large. Export a smaller file (under 2 MB).');
  if (!session.title.trim() || !hasValidIsoDate(session.date)) return fail('Set a valid session title and date in Capture first.');
  if (sessions.some((other) => other.id !== session.id && normalise(other.title) === normalise(session.title) && other.date === session.date)) {
    return fail('Another local session has the same title and date. Use distinct session titles before collecting or importing feedback.');
  }
  const parsed = parseCsvRows(csv);
  if ('error' in parsed) return fail(parsed.error);
  if (parsed.rows.length < 2) return fail('CSV needs a header and at least one response.');
  const headers = parsed.rows[0].map(normalise);
  if (headers.some((header) => !header) || new Set(headers).size !== headers.length) return fail('CSV has empty or duplicate column headings.');
  const index = Object.fromEntries(Object.entries(columns).map(([key, title]) => [key, headers.indexOf(title)])) as Record<keyof typeof columns, number>;
  const missing = Object.entries(index).filter(([, position]) => position < 0).map(([key]) => columns[key as keyof typeof columns]);
  if (missing.length) return fail(`Google Forms CSV is missing expected columns: ${missing.join('; ')}. Export the supported Teaching Feedback Form without renaming its questions.`);

  // A multiset, not a Set: distinct learners can submit identical answers in the same second.
  const alreadyImported = new Map<string, number>();
  for (const response of session.feedbackResponses) {
    if (typeof response.googleFormsImportKey === 'string') {
      const key = response.googleFormsImportKey;
      alreadyImported.set(key, (alreadyImported.get(key) ?? 0) + 1);
    }
  }
  const rows: FeedbackResponse[] = [];
  let matchedCount = 0;
  let duplicateCount = 0;
  for (let rowIndex = 1; rowIndex < parsed.rows.length; rowIndex++) {
    const cells = parsed.rows[rowIndex];
    if (cells.length !== headers.length) return fail(`Row ${rowIndex + 1} has an inconsistent number of columns.`);
    const date = csvDate(cells[index.date], dateOrder);
    if (!date) return fail(`Row ${rowIndex + 1} has an invalid session date. Check the CSV date order; supported dates are DD/MM/YYYY, MM/DD/YYYY or YYYY-MM-DD.`);
    const title = normalise(cells[index.title]);
    const timestamp = cells[index.timestamp].trim();
    if (!title || !timestamp) return fail(`Row ${rowIndex + 1} needs a session title and submission timestamp.`);
    const response: FeedbackResponse = {};
    for (const field of scoreFields) {
      const value = cells[index[field]].trim();
      if (value === '') continue;
      if (!/^[1-5]$/.test(value)) return fail(`Row ${rowIndex + 1}: ${columns[field]} must be a whole number from 1 to 5 or blank.`);
      response[field] = Number(value);
    }
    const comment = cells[index.freeText].trim();
    if (comment) response.freeText = comment;
    if (Object.keys(response).length === 0) return fail(`Row ${rowIndex + 1} has no feedback scores or comment.`);
    if (title !== normalise(session.title) || date !== session.date) continue;
    matchedCount++;
    const key = JSON.stringify(['google-forms-csv-v1', timestamp, title, date, ...scoreFields.map((field) => response[field] ?? null), comment]);
    const available = alreadyImported.get(key) ?? 0;
    if (available > 0) {
      alreadyImported.set(key, available - 1);
      duplicateCount++;
      continue;
    }
    response.googleFormsImportKey = key;
    response.googleFormsTimestamp = timestamp;
    rows.push(response);
  }
  const totalCount = parsed.rows.length - 1;
  return { ok: true, rows, totalCount, matchedCount, excludedCount: totalCount - matchedCount, duplicateCount };
}
