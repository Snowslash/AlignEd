import { hasValidIsoDate, type Objective, type TeachingSession } from './core';

export type StageState = 'not_started' | 'in_progress' | 'ready' | 'attention_needed';
export type SessionTiming = 'upcoming' | 'past' | 'invalid';
export type SuggestedResumeStage = 'capture' | 'plan' | 'feedback' | 'reflect';
export type CaptureValidationField = 'title' | 'date' | 'audience' | 'setting' | 'durationMinutes';
export type CaptureValidationErrors = Partial<Record<CaptureValidationField, string>>;
export type ExportWarningCode = 'incomplete_capture' | 'incomplete_objectives' | 'no_feedback' | 'no_evidence_notes';

export interface ExportWarning {
  code: ExportWarningCode;
  message: string;
  blocking: false;
}

export interface SuggestedSessionAction {
  stage: SuggestedResumeStage;
  label: 'Review Capture details' | 'Continue planning' | 'Add feedback' | 'Review reflection';
}

type CaptureFields = Pick<TeachingSession, CaptureValidationField>;

const placeholderObjectiveText = /^by the end of this session,?\s*\.\.\.$/i;
const placeholderSessionText = new Set(['untitled teaching session', 'teaching session', 'learners', 'clinical teaching']);

function hasMeaningfulText(value: string): boolean {
  const text = value.trim().toLowerCase();
  return Boolean(text) && !placeholderSessionText.has(text);
}

export function getCaptureValidationErrors(session: CaptureFields): CaptureValidationErrors {
  const errors: CaptureValidationErrors = {};
  if (!hasMeaningfulText(session.title)) errors.title = 'Enter a session title.';
  if (!hasValidIsoDate(session.date)) errors.date = 'Enter a valid calendar date.';
  if (!hasMeaningfulText(session.audience)) errors.audience = 'Enter an audience.';
  if (!hasMeaningfulText(session.setting)) errors.setting = 'Enter a setting.';
  if (!Number.isFinite(session.durationMinutes) || session.durationMinutes <= 0) errors.durationMinutes = 'Enter a duration greater than zero.';
  return errors;
}

function isMeaningfulObjective(objective: Objective): boolean {
  const text = objective.text.trim();
  return Boolean(text) && !placeholderObjectiveText.test(text);
}

function isReadyObjective(objective: Objective): boolean {
  return isMeaningfulObjective(objective)
    && Boolean(objective.bloom?.trim())
    && Boolean(objective.activity.trim())
    && Boolean(objective.assessment.trim())
    && objective.evidence.length > 0;
}

export function getCaptureState(session: TeachingSession): StageState {
  const errors = getCaptureValidationErrors(session);
  if (errors.date) return 'attention_needed';
  return Object.keys(errors).length === 0 ? 'ready' : 'in_progress';
}

export function getPlanningState(session: TeachingSession): StageState {
  if (session.objectives.length === 0) return 'not_started';
  return session.objectives.some(isReadyObjective) ? 'ready' : 'in_progress';
}

export function getFeedbackState(session: TeachingSession): StageState {
  return session.feedbackResponses.length === 0 ? 'not_started' : 'ready';
}

export function getSessionTiming(session: TeachingSession, today: string): SessionTiming {
  if (!hasValidIsoDate(session.date)) return 'invalid';
  return session.date > today ? 'upcoming' : 'past';
}

export function getSuggestedResumeStage(session: TeachingSession, today: string): SuggestedResumeStage {
  if (getCaptureState(session) !== 'ready') return 'capture';
  if (getPlanningState(session) !== 'ready') return 'plan';
  if (getSessionTiming(session, today) === 'upcoming') return 'plan';
  if (session.feedbackResponses.length === 0) return 'feedback';
  return 'reflect';
}

export function getSuggestedSessionAction(session: TeachingSession, today: string): SuggestedSessionAction {
  const stage = getSuggestedResumeStage(session, today);
  const labelByStage = {
    capture: 'Review Capture details',
    plan: 'Continue planning',
    feedback: 'Add feedback',
    reflect: 'Review reflection',
  } satisfies Record<SuggestedResumeStage, SuggestedSessionAction['label']>;
  return { stage, label: labelByStage[stage] };
}

function compareSessionText(left: TeachingSession, right: TeachingSession): number {
  const titleComparison = left.title.localeCompare(right.title, 'en-GB');
  return titleComparison || left.id.localeCompare(right.id, 'en-GB');
}

export function sortSessionsForHome(sessions: TeachingSession[], today: string): TeachingSession[] {
  return sessions
    .map((session, index) => ({ session, index, timing: getSessionTiming(session, today) }))
    .sort((left, right) => {
      const groupOrder: Record<SessionTiming, number> = { upcoming: 0, past: 1, invalid: 2 };
      const groupComparison = groupOrder[left.timing] - groupOrder[right.timing];
      if (groupComparison) return groupComparison;

      if (left.timing === 'upcoming' && right.timing === 'upcoming') {
        const dateComparison = left.session.date.localeCompare(right.session.date);
        if (dateComparison) return dateComparison;
      }
      if (left.timing === 'past' && right.timing === 'past') {
        const dateComparison = right.session.date.localeCompare(left.session.date);
        if (dateComparison) return dateComparison;
      }

      return compareSessionText(left.session, right.session) || left.index - right.index;
    })
    .map(({ session }) => session);
}

export function getExportWarnings(session: TeachingSession): ExportWarning[] {
  const warnings: ExportWarning[] = [];
  if (getCaptureState(session) !== 'ready') {
    warnings.push({
      code: 'incomplete_capture',
      message: 'Core capture details are incomplete or need review before relying on this evidence pack.',
      blocking: false,
    });
  }
  if (getPlanningState(session) !== 'ready') {
    warnings.push({
      code: 'incomplete_objectives',
      message: 'Objectives are incomplete or still use placeholder text.',
      blocking: false,
    });
  }
  if (session.feedbackResponses.length === 0) {
    warnings.push({
      code: 'no_feedback',
      message: 'No learner feedback was recorded. Export remains available without learner averages or outcomes.',
      blocking: false,
    });
  }
  if (!session.evidenceNotes.trim()) {
    warnings.push({
      code: 'no_evidence_notes',
      message: 'No evidence notes or artefact locations are recorded.',
      blocking: false,
    });
  }
  return warnings;
}
