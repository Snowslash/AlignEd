import { useEffect, useState } from 'react';
import './App.css';
import {
  type BloomLevel,
  type DreyfusStage,
  type EvidenceType,
  type FeedbackResponse,
  type MillerLevel,
  type Objective,
  type TeachingSession,
  buildCsvTemplate,
  buildDemoSession,
  buildFeedbackSummary,
  buildGibbsReflectionDraft,
  buildMarkdownExport,
  buildQuickSession,
  checkDose,
  deserialiseSessions,
  flagObjectiveText,
  formatUkDate,
  generateFeedbackQuestions,
  parseUkDate,
  parseFeedbackCsv,
  serialiseSessions,
  todayIso,
} from './domain/core';

const STORAGE_KEY = 'aligned.sessions.v1';
const LEGACY_STORAGE_KEY = 'teaching-portfolio-tracker.sessions.v1';
const bloomLevels: BloomLevel[] = ['Remember', 'Understand', 'Apply', 'Analyse', 'Evaluate', 'Create'];
const millerLevels: MillerLevel[] = ['Knows', 'Knows how', 'Shows how', 'Does'];
const evidenceTypes: EvidenceType[] = ['Attendance', 'Feedback', 'Reflection', 'Certificate', 'Photo/artefact'];
const dreyfusStages: DreyfusStage[] = ['Novice', 'Advanced beginner', 'Competent', 'Proficient', 'Expert'];

interface QuickFormState {
  title: string;
  date: string;
  audience: string;
  level: string;
  topic: string;
  durationMinutes: number;
  setting: string;
}

type WorkflowStep = 'details' | 'planning' | 'feedback' | 'reflection';

const workflowSteps: Array<{ id: WorkflowStep; label: string; eyebrow: string }> = [
  { id: 'details', label: 'Session details', eyebrow: '1' },
  { id: 'planning', label: 'Planning', eyebrow: '2' },
  { id: 'feedback', label: 'Feedback', eyebrow: '3' },
  { id: 'reflection', label: 'Reflection/export', eyebrow: '4' },
];

const emptyQuickForm = (): QuickFormState => ({
  title: '',
  date: formatUkDate(todayIso()),
  audience: '',
  level: '',
  topic: '',
  durationMinutes: 30,
  setting: 'Ward teaching',
});

function loadSessions(): TeachingSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? deserialiseSessions(raw) : [];
  } catch {
    return [];
  }
}

function persistSessions(sessions: TeachingSession[]) {
  localStorage.setItem(STORAGE_KEY, serialiseSessions(sessions));
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function updateSession(sessions: TeachingSession[], updated: TeachingSession): TeachingSession[] {
  return sessions.map((session) => (session.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : session));
}

function SessionCard({ session, selected, onSelect }: { session: TeachingSession; selected: boolean; onSelect: () => void }) {
  const feedback = buildFeedbackSummary(session.feedbackResponses);
  return (
    <button className={`session-card ${selected ? 'selected' : ''}`} onClick={onSelect} type="button">
      <span className="eyebrow">{formatUkDate(session.date)} · {session.durationMinutes} min</span>
      <strong>{session.title}</strong>
      <span>{session.audience || 'Audience TBC'} · {session.setting}</span>
      <span>{session.objectives.length} objective{session.objectives.length === 1 ? '' : 's'} · {feedback.responseCount} feedback response{feedback.responseCount === 1 ? '' : 's'}</span>
    </button>
  );
}

function StepNavigation({ currentStep, onChange }: { currentStep: WorkflowStep; onChange: (step: WorkflowStep) => void }) {
  return (
    <nav className="stepper" aria-label="Teaching evidence workflow">
      {workflowSteps.map((step) => (
        <button key={step.id} className={`step-pill ${currentStep === step.id ? 'selected' : ''}`} onClick={() => onChange(step.id)} type="button">
          <span>{step.eyebrow}</span>
          {step.label}
        </button>
      ))}
    </nav>
  );
}

function StepControls({ currentStep, onChange }: { currentStep: WorkflowStep; onChange: (step: WorkflowStep) => void }) {
  const index = workflowSteps.findIndex((step) => step.id === currentStep);
  const previous = workflowSteps[index - 1];
  const next = workflowSteps[index + 1];
  return (
    <div className="step-controls">
      {previous ? <button className="ghost" onClick={() => onChange(previous.id)} type="button">Back: {previous.label}</button> : <span />}
      {next ? <button onClick={() => onChange(next.id)} type="button">Next: {next.label}</button> : <span />}
    </div>
  );
}

function SessionDetailsPanel({ session, onChange }: { session: TeachingSession; onChange: (session: TeachingSession) => void }) {
  return (
    <section className="panel session-overview">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Step 1</p>
          <h2>Session details</h2>
        </div>
        <span className="pill">{session.frameworkTags.join(', ')}</span>
      </div>
      <p className="hint step-intro">Start with the factual session metadata. This is the minimum useful capture before planning, feedback, and reflection.</p>
      <div className="grid four">
        <label>Title<input value={session.title} onChange={(event) => onChange({ ...session, title: event.target.value })} /></label>
        <label>Date<input value={formatUkDate(session.date)} onChange={(event) => onChange({ ...session, date: parseUkDate(event.target.value) })} placeholder="dd/mm/yyyy" inputMode="numeric" /></label>
        <label>Audience<input value={session.audience} onChange={(event) => onChange({ ...session, audience: event.target.value })} /></label>
        <label>Level<input value={session.level} onChange={(event) => onChange({ ...session, level: event.target.value })} /></label>
        <label>Topic<input value={session.topic} onChange={(event) => onChange({ ...session, topic: event.target.value })} /></label>
        <label>Duration<input type="number" value={session.durationMinutes} onChange={(event) => onChange({ ...session, durationMinutes: Number(event.target.value), rigour: { ...session.rigour, doseCheck: checkDose(Number(event.target.value), session.objectives) } })} /></label>
        <label>Setting<input value={session.setting} onChange={(event) => onChange({ ...session, setting: event.target.value })} /></label>
        <label>Framework tags<input value={session.frameworkTags.join(', ')} onChange={(event) => onChange({ ...session, frameworkTags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} /></label>
      </div>
    </section>
  );
}

function ObjectiveEditor({ session, onChange }: { session: TeachingSession; onChange: (session: TeachingSession) => void }) {
  const addObjective = () => {
    const objective: Objective = {
      id: `objective-${Date.now()}`,
      text: 'By the end of this session, ...',
      bloom: 'Apply',
      activity: 'Case discussion',
      assessment: 'Feedback form',
      evidence: ['Feedback', 'Reflection'],
      frameworkTags: ['Generic teaching evidence'],
    };
    const objectives = [...session.objectives, objective];
    onChange({
      ...session,
      objectives,
      feedbackQuestions: generateFeedbackQuestions(objectives),
      rigour: { ...session.rigour, doseCheck: checkDose(session.durationMinutes, objectives) },
    });
  };

  const patchObjective = (id: string, patch: Partial<Objective>) => {
    const objectives = session.objectives.map((objective) => objective.id === id ? { ...objective, ...patch } : objective);
    onChange({
      ...session,
      objectives,
      feedbackQuestions: generateFeedbackQuestions(objectives),
      rigour: { ...session.rigour, doseCheck: checkDose(session.durationMinutes, objectives) },
    });
  };

  const removeObjective = (id: string) => {
    const objectives = session.objectives.filter((objective) => objective.id !== id);
    onChange({ ...session, objectives, feedbackQuestions: generateFeedbackQuestions(objectives), rigour: { ...session.rigour, doseCheck: checkDose(session.durationMinutes, objectives) } });
  };

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Step 2</p>
          <h2>Planning</h2>
        </div>
        <button onClick={addObjective} type="button">Add objective</button>
      </div>
      <p className="hint">Keep this fast. The default loop only needs Bloom, activity, assessment and evidence. Advanced mode adds extra planning prompts only when needed.</p>
      <div className="objective-list">
        {session.objectives.map((objective, index) => {
          const flags = flagObjectiveText(objective.text);
          return (
            <article className="objective" key={objective.id}>
              <div className="objective-title">
                <strong>Objective {index + 1}</strong>
                {session.objectives.length > 1 && <button className="ghost danger" onClick={() => removeObjective(objective.id)} type="button">Remove</button>}
              </div>
              <label>
                Objective text
                <textarea value={objective.text} onChange={(event) => patchObjective(objective.id, { text: event.target.value })} />
              </label>
              <div className="grid four">
                <label>Bloom
                  <select value={objective.bloom} onChange={(event) => patchObjective(objective.id, { bloom: event.target.value as BloomLevel })}>
                    {bloomLevels.map((value) => <option key={value}>{value}</option>)}
                  </select>
                </label>
                <label>Activity
                  <input value={objective.activity} onChange={(event) => patchObjective(objective.id, { activity: event.target.value })} placeholder="Case discussion, bedside, skills station..." />
                </label>
                <label>Assessment
                  <input value={objective.assessment} onChange={(event) => patchObjective(objective.id, { assessment: event.target.value })} placeholder="Feedback form, observed practice, verbal Qs..." />
                </label>
                <label>Framework tag
                  <input value={objective.frameworkTags.join(', ')} onChange={(event) => patchObjective(objective.id, { frameworkTags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} />
                </label>
              </div>
              <div className="evidence-block">
                <div>
                  <strong>Evidence to attach</strong>
                  <p className="hint">These ticks are the evidence types you expect to attach to the portfolio entry; they feed the Markdown evidence pack.</p>
                </div>
                <div className="checkbox-row">
                  {evidenceTypes.map((value) => (
                    <label key={value} className="check"><input checked={objective.evidence.includes(value)} onChange={(event) => {
                      const evidence = event.target.checked ? [...objective.evidence, value] : objective.evidence.filter((item) => item !== value);
                      patchObjective(objective.id, { evidence });
                    }} type="checkbox" /> {value}</label>
                  ))}
                </div>
              </div>
              {session.rigour.enabled && (
                <div className="rigour-inline">
                  <label>Miller
                    <select value={objective.miller || ''} onChange={(event) => patchObjective(objective.id, { miller: event.target.value ? event.target.value as MillerLevel : undefined })}>
                      <option value="">Not set</option>
                      {millerLevels.map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>Dreyfus learner stage
                    <select value={objective.dreyfusStage || ''} onChange={(event) => patchObjective(objective.id, { dreyfusStage: event.target.value ? event.target.value as DreyfusStage : undefined })}>
                      <option value="">Not set</option>
                      {dreyfusStages.map((value) => <option key={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>Observed standard
                    <input value={objective.observedStandard || ''} onChange={(event) => patchObjective(objective.id, { observedStandard: event.target.value })} placeholder="e.g. safe simple interrupted sutures with supervision" />
                  </label>
                </div>
              )}
              {/* Alignment engine disabled while free-text activity/objective/assessment rules are redesigned. */}
              {flags.map((flag) => <div className="notice warning" key={flag}>{flag}</div>)}
            </article>
          );
        })}
      </div>
      <div className="advanced-planning">
        <label className="switch"><input checked={session.rigour.enabled} onChange={(event) => onChange({ ...session, rigour: { ...session.rigour, enabled: event.target.checked } })} type="checkbox" /> Advanced mode</label>
        <p className="hint">Optional planning prompts for when the session needs more defensible evidence.</p>
        <div className={`notice ${checkDose(session.durationMinutes, session.objectives).status}`}>{checkDose(session.durationMinutes, session.objectives).message}</div>
        {session.rigour.enabled && (
          <label>Equity prompt
            <textarea value={session.rigour.equityPrompt} onChange={(event) => onChange({ ...session, rigour: { ...session.rigour, equityPrompt: event.target.value } })} placeholder="Was teaching/feedback equitable across learner groups?" />
          </label>
        )}
      </div>
    </section>
  );
}

const emptyManualFeedback = (): FeedbackResponse => ({
  clarity: 5,
  usefulness: 5,
  preConfidence: 3,
  postConfidence: 4,
  freeText: '',
  peerObservation: '',
});

function numberValue(value: string): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function FeedbackPanel({ session, onChange }: { session: TeachingSession; onChange: (session: TeachingSession) => void }) {
  const [csv, setCsv] = useState(buildCsvTemplate());
  const [manual, setManual] = useState<FeedbackResponse>(() => emptyManualFeedback());
  const feedback = buildFeedbackSummary(session.feedbackResponses);

  const commitFeedbackResponses = (feedbackResponses: FeedbackResponse[]) => {
    onChange({ ...session, feedbackResponses, reflection: buildGibbsReflectionDraft(session, buildFeedbackSummary(feedbackResponses)) });
  };

  const addManualResponse = () => {
    const response: FeedbackResponse = {
      clarity: manual.clarity,
      usefulness: manual.usefulness,
      preConfidence: manual.preConfidence,
      postConfidence: manual.postConfidence,
      freeText: manual.freeText?.trim() || undefined,
      peerObservation: manual.peerObservation?.trim() || undefined,
    };
    commitFeedbackResponses([...session.feedbackResponses, response]);
    setManual(emptyManualFeedback());
  };

  const importCsv = () => {
    const feedbackResponses = parseFeedbackCsv(csv);
    commitFeedbackResponses(feedbackResponses);
  };

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Step 3</p>
          <h2>Feedback capture</h2>
        </div>
      </div>
      <p className="hint step-intro">Recommended for now: type responses in during or after the session. A QR code only makes sense once there is a hosted form or backend; the local app cannot collect phone submissions safely by itself.</p>
      <div className="grid two feedback-layout">
        <div className="feedback-card">
          <h3>Learner questions</h3>
          <ol className="questions">{session.feedbackQuestions.map((question) => <li key={question}>{question}</li>)}</ol>
          <div className="notice">Best route today: ask these questions verbally or on paper, then add each response below. If you already have spreadsheet data, use CSV import.</div>
        </div>
        <div className="feedback-card">
          <div className="section-heading compact">
            <h3>Add one response</h3>
            <button onClick={addManualResponse} type="button">Add manual response</button>
          </div>
          <div className="grid four">
            <label>Clarity
              <input min={1} max={5} type="number" value={manual.clarity ?? ''} onChange={(event) => setManual({ ...manual, clarity: numberValue(event.target.value) })} />
            </label>
            <label>Usefulness
              <input min={1} max={5} type="number" value={manual.usefulness ?? ''} onChange={(event) => setManual({ ...manual, usefulness: numberValue(event.target.value) })} />
            </label>
            <label>Confidence before
              <input min={1} max={5} type="number" value={manual.preConfidence ?? ''} onChange={(event) => setManual({ ...manual, preConfidence: numberValue(event.target.value) })} />
            </label>
            <label>Confidence after
              <input min={1} max={5} type="number" value={manual.postConfidence ?? ''} onChange={(event) => setManual({ ...manual, postConfidence: numberValue(event.target.value) })} />
            </label>
          </div>
          <label>One thing to change
            <textarea value={manual.freeText ?? ''} onChange={(event) => setManual({ ...manual, freeText: event.target.value })} placeholder="More time for practice, clearer examples, slower pace..." />
          </label>
          <label>Peer / observed teaching note
            <textarea value={manual.peerObservation ?? ''} onChange={(event) => setManual({ ...manual, peerObservation: event.target.value })} placeholder="Optional comment from supervisor, peer, or observer." />
          </label>
        </div>
      </div>
      <details className="csv-import">
        <summary>Import CSV instead</summary>
        <label>CSV feedback import
          <textarea className="csv" value={csv} onChange={(event) => setCsv(event.target.value)} />
        </label>
        <button onClick={importCsv} type="button">Import CSV</button>
      </details>
      <div className="summary-grid">
        <span><strong>{feedback.responseCount}</strong> responses</span>
        <span><strong>{feedback.averageClarity ?? '—'}</strong> clarity</span>
        <span><strong>{feedback.averageUsefulness ?? '—'}</strong> usefulness</span>
        <span><strong>{feedback.averageConfidenceGain ?? '—'}</strong> confidence gain</span>
      </div>
      <h3>Kirkpatrick spine</h3>
      <ul className="compact-list">
        <li><strong>Reaction:</strong> {feedback.kirkpatrick.reaction}</li>
        <li><strong>Learning:</strong> {feedback.kirkpatrick.learning}</li>
        <li><strong>Behaviour:</strong> {feedback.kirkpatrick.behaviour}</li>
        <li><strong>Results:</strong> {feedback.kirkpatrick.results}</li>
      </ul>
    </section>
  );
}

function ExportPanel({ session, onChange }: { session: TeachingSession; onChange: (session: TeachingSession) => void }) {
  const feedback = buildFeedbackSummary(session.feedbackResponses);
  const reflection = session.reflection;
  const markdown = buildMarkdownExport(session, feedback, reflection);
  const [copied, setCopied] = useState(false);

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Step 4</p>
          <h2>Reflection and evidence pack</h2>
        </div>
        <div className="button-row">
          <button onClick={copyMarkdown} type="button">Copy Markdown export</button>
          <button onClick={() => downloadText(`${session.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-evidence-pack.md`, markdown)} type="button">Download .md</button>
          <button onClick={() => window.print()} type="button">Print / save PDF</button>
        </div>
      </div>
      {copied && <div className="notice pass">Markdown copied to clipboard.</div>}
      <div className="reflection-grid">
        {Object.entries(reflection.sections).map(([key, value]) => {
          const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
          return (
            <article key={key}>
              <label>{label}
                <textarea value={value} onChange={(event) => onChange({
                  ...session,
                  reflection: {
                    ...session.reflection,
                    sections: { ...session.reflection.sections, [key]: event.target.value },
                  },
                })} />
              </label>
            </article>
          );
        })}
      </div>
      <label>Evidence notes / artefact locations
        <textarea value={session.evidenceNotes} onChange={(event) => onChange({ ...session, evidenceNotes: event.target.value })} placeholder="Attendance sheet, certificate, screenshot, observed-teaching note, or local file path." />
      </label>
      <details>
        <summary>Preview Markdown export</summary>
        <pre>{markdown}</pre>
      </details>
    </section>
  );
}

export default function App() {
  const [sessions, setSessions] = useState<TeachingSession[]>(() => loadSessions());
  const [selectedId, setSelectedId] = useState<string | undefined>(() => loadSessions()[0]?.id);
  const [form, setForm] = useState<QuickFormState>(() => emptyQuickForm());
  const [importStatus, setImportStatus] = useState('');
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('details');
  const selected = sessions.find((session) => session.id === selectedId) ?? sessions[0];

  useEffect(() => {
    persistSessions(sessions);
  }, [sessions]);

  const saveQuickSession = () => {
    const session = buildQuickSession(form);
    const next = [session, ...sessions];
    setSessions(next);
    setSelectedId(session.id);
    setCurrentStep('details');
    setForm(emptyQuickForm());
  };

  const addDemo = () => {
    const session = buildDemoSession();
    const next = [session, ...sessions];
    setSessions(next);
    setSelectedId(session.id);
    setCurrentStep('details');
  };

  const patchSelected = (session: TeachingSession) => {
    setSessions(updateSession(sessions, session));
    setSelectedId(session.id);
  };

  const importJson = (raw: string) => {
    try {
      const imported = deserialiseSessions(raw);
      setSessions(imported);
      setSelectedId(imported[0]?.id);
      setCurrentStep('details');
      setImportStatus(`Imported ${imported.length} session${imported.length === 1 ? '' : 's'} from backup.`);
    } catch (error) {
      setImportStatus(error instanceof Error ? error.message : 'Could not import sessions');
      alert(error instanceof Error ? error.message : 'Could not import sessions');
    }
  };

  return (
    <main>
      <header className="hero-shell">
        <div>
          <p className="eyebrow">Local/private working artefact</p>
          <h1>AlignEd</h1>
          <p className="lede">Plan a teaching session, capture feedback and export a clean evidence pack.</p>
        </div>
      </header>

      <section className="panel quick-log" aria-labelledby="quick-log-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">First journey</p>
            <h2 id="quick-log-title">I taught a session today</h2>
          </div>
          <button type="button" onClick={saveQuickSession}>Save session</button>
        </div>
        <div className="grid four">
          <label>Session title
            <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ward suturing" />
          </label>
          <label>Date
            <input value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} placeholder="dd/mm/yyyy" inputMode="numeric" />
          </label>
          <label>Audience
            <input value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })} placeholder="FY1 doctors" />
          </label>
          <label>Level
            <input value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })} placeholder="FY1 / CT1 / mixed" />
          </label>
          <label>Topic
            <input value={form.topic} onChange={(event) => setForm({ ...form, topic: event.target.value })} placeholder="Simple interrupted sutures" />
          </label>
          <label>Duration minutes
            <input value={form.durationMinutes} min={5} onChange={(event) => setForm({ ...form, durationMinutes: Number(event.target.value) })} type="number" />
          </label>
          <label>Setting
            <input value={form.setting} onChange={(event) => setForm({ ...form, setting: event.target.value })} placeholder="Ward / seminar / skills corner" />
          </label>
        </div>
      </section>

      <div className="workspace">
        <aside className="sidebar">
          <div className="section-heading compact">
            <h2>Sessions</h2>
            <button className="ghost" onClick={addDemo} type="button">Add demo data</button>
          </div>
          {sessions.length === 0 && <p className="empty">No sessions yet. Save the quick form or add demo data.</p>}
          <div className="session-list">
            {sessions.map((session) => <SessionCard key={session.id} selected={session.id === selected?.id} session={session} onSelect={() => setSelectedId(session.id)} />)}
          </div>
          <div className="import-export">
            <button onClick={() => downloadText('aligned-backup.json', serialiseSessions(sessions))} type="button">Download JSON backup</button>
            <label className="file-label">Import JSON backup
              <input type="file" accept="application/json" onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                file.text().then(importJson);
              }} />
            </label>
            {importStatus && <div className="notice pass" role="status">{importStatus}</div>}
          </div>
        </aside>

        <div className="detail">
          {!selected && (
            <section className="panel empty-state">
              <h2>Ready when the teaching is done</h2>
              <p>Use the quick form above to capture the minimum viable session, then add rigour only if it helps the evidence pack.</p>
            </section>
          )}
          {selected && (
            <>
              <StepNavigation currentStep={currentStep} onChange={setCurrentStep} />
              {currentStep === 'details' && <SessionDetailsPanel session={selected} onChange={patchSelected} />}
              {currentStep === 'planning' && <ObjectiveEditor session={selected} onChange={patchSelected} />}
              {currentStep === 'feedback' && <FeedbackPanel session={selected} onChange={patchSelected} />}
              {currentStep === 'reflection' && <ExportPanel session={selected} onChange={patchSelected} />}
              <StepControls currentStep={currentStep} onChange={setCurrentStep} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
