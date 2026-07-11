export type BloomLevel = 'Remember' | 'Understand' | 'Apply' | 'Analyse' | 'Evaluate' | 'Create';
export type MillerLevel = 'Knows' | 'Knows how' | 'Shows how' | 'Does';
export type ActivityType = string;
export type AssessmentType = string;
export type EvidenceType = 'Attendance' | 'Feedback' | 'Reflection' | 'Certificate' | 'Photo/artefact';
export type DreyfusStage = 'Novice' | 'Advanced beginner' | 'Competent' | 'Proficient' | 'Expert';

export function hasValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export interface Objective {
  id: string;
  text: string;
  bloom: BloomLevel;
  miller?: MillerLevel;
  activity: ActivityType;
  assessment: AssessmentType;
  evidence: EvidenceType[];
  frameworkTags: string[];
  dreyfusStage?: DreyfusStage;
  observedStandard?: string;
}

export interface UtilityScoreInput {
  validity: number;
  reliability: number;
  educationalImpact: number;
  acceptability: number;
  cost: number;
}

export interface UtilityScore extends UtilityScoreInput {
  average: number;
  strengths: string[];
  cautions: string[];
  summary: string;
}

export interface FeedbackResponse {
  clarity?: number;
  usefulness?: number;
  preConfidence?: number;
  postConfidence?: number;
  freeText?: string;
  peerObservation?: string;
  [key: string]: string | number | undefined;
}

export interface FeedbackSummary {
  responseCount: number;
  averageClarity?: number;
  averageUsefulness?: number;
  averagePreConfidence?: number;
  averagePostConfidence?: number;
  averageConfidenceGain?: number;
  themes: string[];
  peerObservationCount: number;
  kirkpatrick: {
    reaction: string;
    learning: string;
    behaviour: string;
    results: string;
  };
}

export interface ReflectionDraft {
  model: 'Gibbs';
  sections: {
    description: string;
    feelings: string;
    evaluation: string;
    analysis: string;
    conclusion: string;
    actionPlan: string;
  };
  forwardEvaluationMeasure: string;
}

export interface TeachingSession {
  id: string;
  title: string;
  date: string;
  audience: string;
  level: string;
  topic: string;
  durationMinutes: number;
  setting: string;
  createdAt: string;
  updatedAt: string;
  objectives: Objective[];
  frameworkTags: string[];
  rigour: {
    enabled: boolean;
    utility: UtilityScoreInput;
    equityPrompt: string;
    doseCheck?: ReturnType<typeof checkDose>;
  };
  feedbackQuestions: string[];
  feedbackResponses: FeedbackResponse[];
  reflection: ReflectionDraft;
  evidenceNotes: string;
}

export interface QuickSessionInput {
  title: string;
  date: string;
  audience: string;
  topic: string;
  durationMinutes: number;
  setting: string;
  level?: string;
}

export const DEFAULT_FRAMEWORK_TAG = 'Generic teaching evidence';

const unmeasurableVerbs = ['understand', 'know', 'appreciate', 'learn', 'be aware of'];

export function makeId(prefix = 'session'): string {
  const cryptoObj = globalThis.crypto;
  if (cryptoObj && 'randomUUID' in cryptoObj) {
    return `${prefix}-${cryptoObj.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}


export function formatUkDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return isoDate;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

export function parseUkDate(displayDate: string): string {
  const trimmed = displayDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(trimmed);
  if (!match) return trimmed;
  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  const rawYear = match[3];
  const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
  return `${year}-${month}-${day}`;
}

export function todayIso(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function buildQuickSession(input: QuickSessionInput): TeachingSession {
  const now = new Date().toISOString();
  const date = parseUkDate(input.date || todayIso());
  const objectiveText = 'By the end of this session, ...';
  const objective: Objective = {
    id: makeId('objective'),
    text: objectiveText,
    bloom: 'Apply',
    activity: 'Case discussion',
    assessment: 'Feedback form',
    evidence: ['Feedback', 'Reflection'],
    frameworkTags: [DEFAULT_FRAMEWORK_TAG],
  };
  const base: TeachingSession = {
    id: makeId('session'),
    title: input.title.trim() || 'Untitled teaching session',
    date,
    audience: input.audience.trim() || 'Learners',
    level: input.level?.trim() || 'Mixed',
    topic: input.topic.trim() || 'Teaching session',
    durationMinutes: Number.isFinite(input.durationMinutes) && input.durationMinutes > 0 ? input.durationMinutes : 30,
    setting: input.setting.trim() || 'Clinical teaching',
    createdAt: now,
    updatedAt: now,
    objectives: [objective],
    frameworkTags: [DEFAULT_FRAMEWORK_TAG],
    rigour: {
      enabled: false,
      utility: { validity: 3, reliability: 3, educationalImpact: 3, acceptability: 4, cost: 4 },
      equityPrompt: '',
      doseCheck: checkDose(input.durationMinutes || 30, [objective]),
    },
    feedbackQuestions: generateFeedbackQuestions([objective]),
    feedbackResponses: [],
    reflection: emptyGibbsReflection(input.title || 'Untitled teaching session'),
    evidenceNotes: '',
  };
  return { ...base, reflection: buildGibbsReflectionDraft(base, buildFeedbackSummary([])) };
}

export function generateFeedbackQuestions(objectives: Objective[]): string[] {
  const meaningfulObjective = objectives[0]?.text
    ?.replace(/^By the end of (this|the) session,?\s*/i, '')
    .replace(/^the learner will be able to\s*/i, '')
    .trim();
  const objectiveQuestion = meaningfulObjective && meaningfulObjective !== '...'
    ? `After this session, how confident do you feel with: ${meaningfulObjective}?`
    : 'After this session, how confident do you feel about the main learning point?';
  return [
    'How clear was the session? (1-5)',
    'How useful was the session for your practice? (1-5)',
    'Confidence before the session (1-5)',
    'Confidence after the session (1-5)',
    objectiveQuestion,
    'One thing to change next time',
  ];
}

export function flagObjectiveText(text: string): string[] {
  const lower = text.toLowerCase();
  const hits = unmeasurableVerbs.filter((verb) => new RegExp(`\\b${verb.replace(/ /g, '\\s+')}\\b`, 'i').test(lower));
  if (hits.length === 0) return [];
  return ['Use an observable verb', `Avoid unmeasurable wording: ${hits.map((v) => `“${v}”`).join(', ')}.`];
}

export function checkDose(durationMinutes: number, objectives: Array<Pick<Objective, 'id'>>): { status: 'pass' | 'warning'; message: string; suggestedMax: number } {
  const suggestedMax = Math.max(1, Math.floor(durationMinutes / 20));
  if (objectives.length <= suggestedMax) {
    return { status: 'pass', message: `${objectives.length} objective${objectives.length === 1 ? '' : 's'} in ${durationMinutes} min is plausible.`, suggestedMax };
  }
  return {
    status: 'warning',
    message: `${objectives.length} objectives in ${durationMinutes} min may overload the session; consider ${suggestedMax} objective${suggestedMax === 1 ? '' : 's'} for this duration.`,
    suggestedMax,
  };
}

export function checkAlignment(_objective: Pick<Objective, 'miller' | 'assessment'>): { status: 'pass' | 'warning'; message: string } {
  // Alignment engine deliberately disabled while we redesign the free-text
  // activity/objective/assessment logic. Keep this function as a stable seam
  // for the future engine, but do not produce automated warnings for now.
  return {
    status: 'pass',
    message: 'Alignment engine deferred; review activity/objective/assessment alignment manually for now.',
  };
}

const utilityLabels: Record<keyof UtilityScoreInput, string> = {
  validity: 'validity',
  reliability: 'reliability',
  educationalImpact: 'educational impact',
  acceptability: 'acceptability',
  cost: 'cost',
};

export function scoreUtility(input: UtilityScoreInput): UtilityScore {
  const entries = Object.entries(input) as Array<[keyof UtilityScoreInput, number]>;
  const average = Number((entries.reduce((sum, [, value]) => sum + value, 0) / entries.length).toFixed(1));
  const strengths = entries.filter(([, value]) => value >= 4).map(([key]) => utilityLabels[key]);
  const cautions = entries.filter(([, value]) => value <= 2).map(([key]) => utilityLabels[key]);
  const summary = `Utility average ${average}/5. Strengths: ${strengths.join(', ') || 'none yet'}. Cautions: ${cautions.join(', ') || 'none flagged'}.`;
  return { ...input, average, strengths, cautions, summary };
}

function normaliseHeader(header: string): string {
  return header.trim().replace(/^\uFEFF/, '').toLowerCase().replace(/\s+/g, '_');
}

export type FeedbackCsvPreview =
  | { ok: true; headers: string[]; rowCount: number; rows: FeedbackResponse[] }
  | { ok: false; error: string; headers: string[]; rowCount: 0; rows: [] };

const feedbackHeaderAliases: Record<string, keyof Pick<FeedbackResponse, 'clarity' | 'usefulness' | 'preConfidence' | 'postConfidence' | 'freeText' | 'peerObservation'>> = {
  clarity: 'clarity',
  usefulness: 'usefulness',
  pre_confidence: 'preConfidence',
  preconfidence: 'preConfidence',
  confidence_before: 'preConfidence',
  post_confidence: 'postConfidence',
  postconfidence: 'postConfidence',
  confidence_after: 'postConfidence',
  one_change: 'freeText',
  free_text: 'freeText',
  comment: 'freeText',
  comments: 'freeText',
  peer_observation: 'peerObservation',
  observed_teaching: 'peerObservation',
};

function parseCsvRows(csv: string): { rows: string[][] } | { error: string } {
  const rows: string[][] = [];
  let cells: string[] = [];
  let cell = '';
  let quoted = false;

  const finishRow = () => {
    cells.push(cell.trim());
    if (cells.some((value) => value.length > 0)) rows.push(cells);
    cells = [];
    cell = '';
  };

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    if (char === '"') {
      if (quoted && csv[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ',' && !quoted) {
      cells.push(cell.trim());
      cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && csv[index + 1] === '\n') index += 1;
      finishRow();
    } else {
      cell += char;
    }
  }

  if (quoted) return { error: 'CSV contains an unbalanced quote. Close the quoted value and preview again.' };
  finishRow();
  return { rows };
}

function previewError(error: string, headers: string[] = []): FeedbackCsvPreview {
  return { ok: false, error, headers, rowCount: 0, rows: [] };
}

function parseFeedbackScore(value: string, header: string, rowNumber: number): number | undefined | string {
  if (!value) return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 5) {
    return `Row ${rowNumber} has an invalid ${header} score. Use a number from 1 to 5, or leave it blank.`;
  }
  return parsed;
}

export function previewFeedbackCsv(csv: string): FeedbackCsvPreview {
  const parsed = parseCsvRows(csv);
  if ('error' in parsed) return previewError(parsed.error);
  if (parsed.rows.length === 0) return previewError('CSV needs a usable header row before it can be previewed.');

  const headers = parsed.rows[0].map(normaliseHeader);
  if (headers.some((header) => !header)) return previewError('CSV needs a usable header row with named columns.', headers);
  const duplicateHeader = headers.find((header, index) => headers.indexOf(header) !== index);
  if (duplicateHeader) return previewError(`CSV has duplicate header "${duplicateHeader}". Rename one column and preview again.`, headers);
  if (!headers.some((header) => header in feedbackHeaderAliases)) {
    return previewError('CSV needs at least one recognised feedback header, such as clarity or usefulness.', headers);
  }
  if (parsed.rows.length === 1) return previewError('CSV has no feedback rows. Add at least one response below the header and preview again.', headers);

  const rows: FeedbackResponse[] = [];
  for (let index = 1; index < parsed.rows.length; index += 1) {
    const cells = parsed.rows[index];
    const rowNumber = index + 1;
    if (cells.length !== headers.length) {
      return previewError(`Row ${rowNumber} has an inconsistent number of cells. It has ${cells.length}; the header has ${headers.length}.`, headers);
    }
    const response: FeedbackResponse = {};
    for (let cellIndex = 0; cellIndex < headers.length; cellIndex += 1) {
      const header = headers[cellIndex];
      const value = cells[cellIndex] ?? '';
      const field = feedbackHeaderAliases[header];
      if (field === 'clarity' || field === 'usefulness' || field === 'preConfidence' || field === 'postConfidence') {
        const score = parseFeedbackScore(value, header.replace(/_/g, ' '), rowNumber);
        if (typeof score === 'string') return previewError(score, headers);
        if (score !== undefined) response[field] = score;
      } else if (field === 'freeText' || field === 'peerObservation') {
        if (value) response[field] = value;
      } else if (value) {
        response[header] = value;
      }
    }
    if (Object.keys(response).length > 0) rows.push(response);
  }
  if (rows.length === 0) return previewError('CSV has no feedback rows with values. Add a response or remove blank rows and preview again.', headers);
  return { ok: true, headers, rowCount: rows.length, rows };
}

export function parseFeedbackCsv(csv: string): FeedbackResponse[] {
  const preview = previewFeedbackCsv(csv);
  return preview.ok ? preview.rows : [];
}

function average(values: Array<number | undefined>): number | undefined {
  const nums = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (nums.length === 0) return undefined;
  return Number((nums.reduce((sum, value) => sum + value, 0) / nums.length).toFixed(1));
}

export function buildFeedbackSummary(rows: FeedbackResponse[]): FeedbackSummary {
  const avgPre = average(rows.map((row) => row.preConfidence));
  const avgPost = average(rows.map((row) => row.postConfidence));
  const confidenceGain = avgPre !== undefined && avgPost !== undefined ? Number((avgPost - avgPre).toFixed(1)) : undefined;
  const themes = rows.map((row) => row.freeText?.trim()).filter((text): text is string => Boolean(text));
  const peerObservationCount = rows.filter((row) => row.peerObservation?.trim()).length;
  return {
    responseCount: rows.length,
    averageClarity: average(rows.map((row) => row.clarity)),
    averageUsefulness: average(rows.map((row) => row.usefulness)),
    averagePreConfidence: avgPre,
    averagePostConfidence: avgPost,
    averageConfidenceGain: confidenceGain,
    themes,
    peerObservationCount,
    kirkpatrick: {
      reaction: rows.length ? `${rows.length} learner response${rows.length === 1 ? '' : 's'} captured; usefulness average ${average(rows.map((row) => row.usefulness)) ?? 'not scored'}/5.` : 'No learner reaction data imported yet.',
      learning: confidenceGain !== undefined ? `Mean confidence changed by ${confidenceGain > 0 ? '+' : ''}${confidenceGain}.` : 'No pre/post confidence data imported yet.',
      behaviour: 'Set a forward measure: what will learners do differently next time you observe them?',
      results: 'Results-level outcome not expected for a single teaching session; record later evidence only if it genuinely exists.',
    },
  };
}

function emptyGibbsReflection(title: string): ReflectionDraft {
  return {
    model: 'Gibbs',
    sections: {
      description: `Briefly describe the teaching session: ${title}.`,
      feelings: 'What did you notice about learner engagement and your delivery?',
      evaluation: 'What went well, what was less useful, and what does the feedback show?',
      analysis: 'Why might this have happened? Link the feedback to teaching design, alignment, and learner needs.',
      conclusion: 'What would you keep, stop, or change?',
      actionPlan: 'Next time, change one specific thing and define how you will evaluate whether it worked.',
    },
    forwardEvaluationMeasure: 'Measure one concrete behaviour or confidence change at the next session.',
  };
}

export function buildGibbsReflectionDraft(session: TeachingSession, feedback: FeedbackSummary): ReflectionDraft {
  return {
    model: 'Gibbs',
    sections: {
      description: `${session.title} was delivered on ${formatUkDate(session.date)} for ${session.audience} in ${session.setting}. Topic: ${session.topic}.`,
      feelings: 'Record briefly how the session felt to deliver and whether the learners seemed safe, engaged and appropriately challenged.',
      evaluation: feedback.responseCount
        ? `Feedback: ${feedback.kirkpatrick.reaction} ${feedback.kirkpatrick.learning} Themes to consider: ${feedback.themes.join('; ') || 'none recorded'}.`
        : 'Feedback has not been imported yet; evaluate against intended objectives and add learner response data when available.',
      analysis: `Use this section to connect the evidence to teaching design quality. Kirkpatrick behaviour measure: ${feedback.kirkpatrick.behaviour}`,
      conclusion: 'Summarise the main learning point for your teaching practice, not just what happened in the room.',
      actionPlan: `Next time, make one targeted change and evaluate it. Suggested forward measure: ${feedback.averageConfidenceGain !== undefined ? 'repeat pre/post confidence and compare the confidence gain' : 'collect pre/post confidence plus one observed behaviour'}.`,
    },
    forwardEvaluationMeasure: feedback.averageConfidenceGain !== undefined ? 'Repeat pre/post confidence measurement and compare learner confidence gain.' : 'Collect pre/post confidence and one observed-practice measure next time.',
  };
}

export function buildReflectionSuggestion(session: TeachingSession, feedback: FeedbackSummary): ReflectionDraft {
  return buildGibbsReflectionDraft(session, feedback);
}

function mdList(items: string[]): string {
  return items.length ? items.map((item) => `- ${item}`).join('\n') : '- None recorded';
}

function buildMarkdownExportWithoutForwardEvaluationMeasure(session: TeachingSession, feedback = buildFeedbackSummary(session.feedbackResponses), reflection = buildGibbsReflectionDraft(session, feedback)): string {
  const dose = checkDose(session.durationMinutes, session.objectives);
  const objectives = session.objectives.map((objective, index) => {
    const flags = flagObjectiveText(objective.text);
    return `### Objective ${index + 1}\n\n${objective.text}\n\n- Bloom: ${objective.bloom}\n- Miller: ${objective.miller || 'Not set'}\n- Activity: ${objective.activity}\n- Assessment: ${objective.assessment}\n- Evidence: ${objective.evidence.join(', ')}\n- Framework tags: ${objective.frameworkTags.join(', ') || DEFAULT_FRAMEWORK_TAG}\n- Objective wording: ${flags.length ? flags.join(' ') : 'No unmeasurable verb warning.'}`;
  }).join('\n\n');
  if (feedback.responseCount === 0) {
    return `# Teaching evidence pack: ${session.title}\n\nGenerated by AlignEd. Local/private artefact.\n\n## Session snapshot\n\n- Date: ${formatUkDate(session.date)}\n- Audience: ${session.audience}\n- Level: ${session.level}\n- Topic: ${session.topic}\n- Duration: ${session.durationMinutes} minutes\n- Setting: ${session.setting}\n- Framework tags: ${session.frameworkTags.join(', ') || DEFAULT_FRAMEWORK_TAG}\n\n## Objectives and education mapping\n\n${objectives}\n\n## Advanced planning notes\n\n- Advanced mode: ${session.rigour.enabled ? 'enabled' : 'off'}\n- Dose check: ${dose.status} — ${dose.message}\n- Equity prompt: ${session.rigour.equityPrompt || 'Not yet recorded'}\n\n## Feedback summary\n\nNo learner feedback was recorded. No learner response, average, or learner outcome is reported.\n\n## Reflection scaffold\n\n### Description\n${reflection.sections.description}\n\n### Feelings\n${reflection.sections.feelings}\n\n### Evaluation\n${reflection.sections.evaluation}\n\n### Analysis\n${reflection.sections.analysis}\n\n### Conclusion\n${reflection.sections.conclusion}\n\n### Action plan\n${reflection.sections.actionPlan}\n\n## Evidence notes\n\n${session.evidenceNotes || 'Add attendance, certificate, screenshot/photo, or observed-teaching evidence location here.'}\n`;
  }
  return `# Teaching evidence pack: ${session.title}\n\nGenerated by AlignEd. Local/private artefact.\n\n## Session snapshot\n\n- Date: ${formatUkDate(session.date)}\n- Audience: ${session.audience}\n- Level: ${session.level}\n- Topic: ${session.topic}\n- Duration: ${session.durationMinutes} minutes\n- Setting: ${session.setting}\n- Framework tags: ${session.frameworkTags.join(', ') || DEFAULT_FRAMEWORK_TAG}\n\n## Objectives and education mapping\n\n${objectives}\n\n## Advanced planning notes\n\n- Advanced mode: ${session.rigour.enabled ? 'enabled' : 'off'}\n- Dose check: ${dose.status} — ${dose.message}\n- Equity prompt: ${session.rigour.equityPrompt || 'Not yet recorded'}\n\n## Feedback summary\n\n- Responses: ${feedback.responseCount}\n- Average clarity: ${feedback.averageClarity ?? 'not scored'}\n- Average usefulness: ${feedback.averageUsefulness ?? 'not scored'}\n- Average pre-confidence: ${feedback.averagePreConfidence ?? 'not scored'}\n- Average post-confidence: ${feedback.averagePostConfidence ?? 'not scored'}\n- Average confidence gain: ${feedback.averageConfidenceGain ?? 'not scored'}\n- Peer/observed teaching comments: ${feedback.peerObservationCount}\n\nThemes:\n${mdList(feedback.themes)}\n\n## Kirkpatrick evaluation spine\n\n- Reaction: ${feedback.kirkpatrick.reaction}\n- Learning: ${feedback.kirkpatrick.learning}\n- Behaviour: ${feedback.kirkpatrick.behaviour}\n- Results: ${feedback.kirkpatrick.results}\n\n## Reflection scaffold\n\n### Description\n${reflection.sections.description}\n\n### Feelings\n${reflection.sections.feelings}\n\n### Evaluation\n${reflection.sections.evaluation}\n\n### Analysis\n${reflection.sections.analysis}\n\n### Conclusion\n${reflection.sections.conclusion}\n\n### Action plan\n${reflection.sections.actionPlan}\n\n## Evidence notes\n\n${session.evidenceNotes || 'Add attendance, certificate, screenshot/photo, or observed-teaching evidence location here.'}\n`;
}

export function buildMarkdownExport(session: TeachingSession, feedback = buildFeedbackSummary(session.feedbackResponses), reflection = buildGibbsReflectionDraft(session, feedback)): string {
  const markdown = buildMarkdownExportWithoutForwardEvaluationMeasure(session, feedback, reflection);
  const forwardEvaluationMeasure = reflection.forwardEvaluationMeasure || 'Not yet recorded';
  return markdown.replace(
    '\n## Evidence notes',
    `\n## Forward evaluation measure\n\n${forwardEvaluationMeasure}\n\n## Evidence notes`,
  );
}

export function buildCsvTemplate(): string {
  return 'clarity,usefulness,pre_confidence,post_confidence,one_change,peer_observation\n5,5,2,4,"Keep the skills practice","Clear observed teaching"';
}

export function buildDemoSession(): TeachingSession {
  const session = buildQuickSession({
    title: 'Compartment syndrome and basic wound closure',
    date: '2026-07-02',
    audience: 'FY1 doctors',
    topic: 'Compartment syndrome and suturing',
    durationMinutes: 45,
    setting: 'Ward plus skills corner',
    level: 'FY1',
  });
  session.rigour.enabled = true;
  session.rigour.utility = { validity: 4, reliability: 2, educationalImpact: 5, acceptability: 4, cost: 5 };
  session.rigour.equityPrompt = 'Check whether every learner had hands-on practice and feedback, not only the most confident learner.';
  session.objectives = [
    {
      id: makeId('objective'),
      text: 'Recognise the red flags of compartment syndrome',
      bloom: 'Understand',
      miller: 'Knows how',
      activity: 'Case discussion',
      assessment: 'Verbal Qs',
      evidence: ['Feedback', 'Reflection'],
      frameworkTags: [DEFAULT_FRAMEWORK_TAG],
    },
    {
      id: makeId('objective'),
      text: 'Perform simple interrupted sutures on a simulated wound pad',
      bloom: 'Apply',
      miller: 'Shows how',
      activity: 'Skills station',
      assessment: 'Observed practice',
      evidence: ['Attendance', 'Feedback'],
      frameworkTags: [DEFAULT_FRAMEWORK_TAG],
      dreyfusStage: 'Novice',
    },
  ];
  session.feedbackQuestions = generateFeedbackQuestions(session.objectives);
  session.feedbackResponses = parseFeedbackCsv('clarity,usefulness,pre_confidence,post_confidence,one_change,peer_observation\n5,5,2,4,"More time with suturing","Clear, safe instruction"\n4,5,3,4,"Add another case",""');
  session.rigour.doseCheck = checkDose(session.durationMinutes, session.objectives);
  session.reflection = buildGibbsReflectionDraft(session, buildFeedbackSummary(session.feedbackResponses));
  session.evidenceNotes = 'Demo data only — not real portfolio evidence.';
  return session;
}

export function serialiseSessions(sessions: TeachingSession[]): string {
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), sessions }, null, 2);
}

export function deserialiseSessions(raw: string): TeachingSession[] {
  const parsed = JSON.parse(raw) as unknown;
  const sessions = Array.isArray(parsed)
    ? parsed
    : isBackupEnvelope(parsed)
      ? parsed.sessions
      : undefined;
  if (!Array.isArray(sessions)) throw new Error('Import file must be a version-1 backup or legacy session array.');
  const imported = sessions.map((session, index) => normaliseImportedSession(session, index));
  const seenIds = new Set<string>();
  for (const session of imported) {
    if (seenIds.has(session.id)) throw new Error(`Backup contains duplicate session ID: ${session.id}.`);
    seenIds.add(session.id);
  }
  return imported;
}

function isBackupEnvelope(value: unknown): value is { version: number; sessions: unknown[] } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (record.version !== 1) throw new Error('Unsupported backup version. Only version 1 backups are supported.');
  return Array.isArray(record.sessions);
}

function normaliseImportedSession(value: unknown, index: number): TeachingSession {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Session ${index + 1} is not a valid record.`);
  const session = value as Partial<TeachingSession>;
  const requiredStrings: Array<keyof TeachingSession> = ['id', 'title', 'date', 'audience', 'topic', 'setting', 'createdAt', 'updatedAt'];
  for (const key of requiredStrings) {
    if (typeof session[key] !== 'string' || !session[key].trim()) throw new Error(`Session ${index + 1} is missing ${key}.`);
  }
  if (!hasValidIsoDate(session.date!)) throw new Error(`Session ${index + 1} has an invalid date.`);
  if (!Number.isFinite(session.durationMinutes) || session.durationMinutes! <= 0) throw new Error(`Session ${index + 1} has an invalid duration.`);
  if (!Array.isArray(session.objectives) || !session.objectives.every(isValidObjective)) throw new Error(`Session ${index + 1} has invalid objectives.`);
  if (!Array.isArray(session.feedbackResponses) || !session.feedbackResponses.every(isValidFeedbackResponse)) throw new Error(`Session ${index + 1} has invalid feedback responses.`);
  if (session.reflection && !isValidReflection(session.reflection)) throw new Error(`Session ${index + 1} has an invalid reflection.`);

  return {
    ...session,
    level: typeof session.level === 'string' ? session.level : 'Mixed',
    frameworkTags: Array.isArray(session.frameworkTags) ? session.frameworkTags : [DEFAULT_FRAMEWORK_TAG],
    feedbackQuestions: Array.isArray(session.feedbackQuestions) ? session.feedbackQuestions : generateFeedbackQuestions(session.objectives),
    rigour: session.rigour ?? { enabled: false, utility: { validity: 3, reliability: 3, educationalImpact: 3, acceptability: 4, cost: 4 }, equityPrompt: '' },
    reflection: session.reflection ?? emptyGibbsReflection(session.title!),
    evidenceNotes: typeof session.evidenceNotes === 'string' ? session.evidenceNotes : '',
  } as TeachingSession;
}

function isValidObjective(value: unknown): value is Objective {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  return ['id', 'text', 'bloom', 'activity', 'assessment'].every((key) => typeof item[key] === 'string')
    && Array.isArray(item.evidence) && item.evidence.every((evidence) => typeof evidence === 'string')
    && Array.isArray(item.frameworkTags) && item.frameworkTags.every((tag) => typeof tag === 'string');
}

function isValidFeedbackResponse(value: unknown): value is FeedbackResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const scoreFields = new Set(['clarity', 'usefulness', 'preConfidence', 'postConfidence']);
  const textFields = new Set(['freeText', 'peerObservation']);
  return Object.entries(value as Record<string, unknown>).every(([key, entry]) => {
    if (scoreFields.has(key)) return typeof entry === 'number' && Number.isFinite(entry) && entry >= 1 && entry <= 5;
    if (textFields.has(key)) return typeof entry === 'string';
    return typeof entry === 'string' || (typeof entry === 'number' && Number.isFinite(entry));
  });
}

function isValidReflection(value: unknown): value is ReflectionDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const reflection = value as Record<string, unknown>;
  if (reflection.model !== 'Gibbs' || typeof reflection.forwardEvaluationMeasure !== 'string' || !reflection.sections || typeof reflection.sections !== 'object') return false;
  const sections = reflection.sections as Record<string, unknown>;
  return ['description', 'feelings', 'evaluation', 'analysis', 'conclusion', 'actionPlan'].every((key) => typeof sections[key] === 'string');
}
