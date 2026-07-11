import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  buildFeedbackSummary,
  previewFeedbackCsv,
  type FeedbackCsvPreview,
  type FeedbackResponse,
} from '@/domain/core';
import type { SessionStageProps } from './workspace-types';

type FeedbackScoreField = 'clarity' | 'usefulness' | 'preConfidence' | 'postConfidence';
type CsvImportMode = 'append' | 'replace';

const scoreFields: Array<{ field: FeedbackScoreField; label: string }> = [
  { field: 'clarity', label: 'Clarity' },
  { field: 'usefulness', label: 'Usefulness' },
  { field: 'preConfidence', label: 'Confidence before' },
  { field: 'postConfidence', label: 'Confidence after' },
];

const selectClassName = 'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';
const textareaClassName = 'min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';

function emptyManualFeedback(): FeedbackResponse {
  return {};
}

function isValidScore(value: number): boolean {
  return Number.isFinite(value) && value >= 1 && value <= 5;
}

function responseLabel(count: number): string {
  return `${count} response${count === 1 ? '' : 's'}`;
}

function validateManualFeedback(manual: FeedbackResponse): { error?: string; response?: FeedbackResponse } {
  const response: FeedbackResponse = {};
  for (const field of scoreFields) {
    const value = manual[field.field];
    if (value === undefined) continue;
    if (typeof value !== 'number' || !isValidScore(value)) return { error: `${field.label} must be a number between 1 and 5, or left blank.` };
    response[field.field] = value;
  }
  const freeText = manual.freeText?.trim();
  const peerObservation = manual.peerObservation?.trim();
  if (freeText) response.freeText = freeText;
  if (peerObservation) response.peerObservation = peerObservation;
  if (Object.keys(response).length === 0) return { error: 'Enter at least one score or comment before adding a response.' };
  return { response };
}

export function FeedbackStage({ session, onChange }: SessionStageProps) {
  const [manual, setManual] = useState<FeedbackResponse>(emptyManualFeedback);
  const [manualError, setManualError] = useState<string>();
  const [csv, setCsv] = useState('');
  const [csvPreview, setCsvPreview] = useState<FeedbackCsvPreview>();
  const [csvStatus, setCsvStatus] = useState<string>();
  const [importMode, setImportMode] = useState<CsvImportMode>('append');
  const [replaceConfirmationNeeded, setReplaceConfirmationNeeded] = useState(false);
  const feedback = buildFeedbackSummary(session.feedbackResponses);

  const commitFeedbackResponses = (feedbackResponses: FeedbackResponse[]) => {
    onChange({ ...session, feedbackResponses });
  };

  const patchScore = (field: FeedbackScoreField, rawValue: string) => {
    const value = rawValue === '' ? undefined : Number(rawValue);
    setManual((current) => ({ ...current, [field]: value }));
    if (value !== undefined && !isValidScore(value)) {
      setManualError(`${scoreFields.find((item) => item.field === field)?.label} must be a number between 1 and 5, or left blank.`);
    } else {
      setManualError(undefined);
    }
  };

  const addManualResponse = () => {
    const result = validateManualFeedback(manual);
    if (result.error || !result.response) {
      setManualError(result.error);
      return;
    }
    commitFeedbackResponses([...session.feedbackResponses, result.response]);
    setManual(emptyManualFeedback());
    setManualError(undefined);
  };

  const previewCsv = () => {
    setCsvPreview(previewFeedbackCsv(csv));
    setCsvStatus(undefined);
    setReplaceConfirmationNeeded(false);
  };

  const updateCsv = (value: string) => {
    setCsv(value);
    setCsvPreview(undefined);
    setCsvStatus(undefined);
    setReplaceConfirmationNeeded(false);
  };

  const consumeCsvPreview = (status: string) => {
    setCsvPreview(undefined);
    setReplaceConfirmationNeeded(false);
    setCsvStatus(status);
  };

  const applyCsv = () => {
    if (!csvPreview?.ok) return;
    if (importMode === 'append') {
      commitFeedbackResponses([...session.feedbackResponses, ...csvPreview.rows]);
      consumeCsvPreview(`Appended ${responseLabel(csvPreview.rowCount)}.`);
      return;
    }
    if (session.feedbackResponses.length > 0) {
      setReplaceConfirmationNeeded(true);
      return;
    }
    commitFeedbackResponses(csvPreview.rows);
    consumeCsvPreview(`Replaced ${responseLabel(session.feedbackResponses.length)} with ${responseLabel(csvPreview.rowCount)}.`);
  };

  const confirmReplace = () => {
    if (!csvPreview?.ok) return;
    commitFeedbackResponses(csvPreview.rows);
    consumeCsvPreview(`Replaced ${session.feedbackResponses.length} existing response${session.feedbackResponses.length === 1 ? '' : 's'} with ${responseLabel(csvPreview.rowCount)}.`);
  };

  return (
    <section aria-labelledby="feedback-stage-title">
      <Card className="border-border bg-card shadow-none ring-0">
        <CardHeader>
          <CardTitle><h2 data-workspace-stage-heading="feedback" id="feedback-stage-title" tabIndex={-1}>Feedback capture</h2></CardTitle>
          <CardDescription>Record responses manually first, then use CSV only when you already have spreadsheet data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">This browser-only app does not collect phone responses by QR. Ask learners verbally or on paper, then record each response here.</p>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <Card className="border-border bg-muted/20 shadow-none ring-0" size="sm">
              <CardHeader>
                <CardTitle>Learner questions</CardTitle>
                <CardDescription>Use these prompts during or after the session.</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal space-y-2 pl-5 text-sm">
                  {session.feedbackQuestions.map((question) => <li key={question}>{question}</li>)}
                </ol>
              </CardContent>
            </Card>

            <Card className="border-border bg-muted/20 shadow-none ring-0" size="sm">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle>Add one response</CardTitle>
                  <CardDescription>All scores are optional; add at least one score or comment.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {scoreFields.map(({ field, label }) => (
                    <div className="grid gap-2" key={field}>
                      <Label htmlFor={`feedback-${field}`}>{label}</Label>
                      <Input aria-describedby={manualError ? 'feedback-manual-error' : undefined} aria-invalid={manual[field] !== undefined && (typeof manual[field] !== 'number' || !isValidScore(manual[field]))} id={`feedback-${field}`} max={5} min={1} onChange={(event) => patchScore(field, event.target.value)} type="number" value={manual[field] ?? ''} />
                    </div>
                  ))}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="feedback-one-change">One thing to change</Label>
                  <textarea aria-describedby={manualError ? 'feedback-manual-error' : undefined} className={textareaClassName} id="feedback-one-change" onChange={(event) => {
                    setManual((current) => ({ ...current, freeText: event.target.value }));
                    setManualError(undefined);
                  }} placeholder="More time for practice, clearer examples, slower pace..." value={manual.freeText ?? ''} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="feedback-peer-observation">Peer / observed teaching note</Label>
                  <textarea aria-describedby={manualError ? 'feedback-manual-error' : undefined} className={textareaClassName} id="feedback-peer-observation" onChange={(event) => {
                    setManual((current) => ({ ...current, peerObservation: event.target.value }));
                    setManualError(undefined);
                  }} placeholder="Optional comment from supervisor, peer, or observer." value={manual.peerObservation ?? ''} />
                </div>
                <div className="flex justify-end">
                  <Button onClick={addManualResponse} type="button">Add manual response</Button>
                </div>
                {manualError && <p className="rounded-lg border border-destructive/45 bg-destructive/10 p-3 text-sm text-destructive" id="feedback-manual-error" role="alert">{manualError}</p>}
              </CardContent>
            </Card>
          </div>

          <details className="rounded-lg border border-border bg-muted/20 p-4">
            <summary className="cursor-pointer font-medium">Import CSV instead</summary>
            <div className="mt-4 space-y-4">
              <p className="text-sm text-muted-foreground">Paste CSV, preview the parsed response count, choose Append or Replace, then apply. Previewing never changes stored feedback.</p>
              <div className="grid gap-2">
                <Label htmlFor="feedback-csv">CSV feedback import</Label>
                <textarea className={textareaClassName} id="feedback-csv" onChange={(event) => updateCsv(event.target.value)} placeholder="clarity,usefulness,pre_confidence,post_confidence,one_change\n5,4,2,4,More practice" value={csv} />
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <Button onClick={previewCsv} type="button" variant="outline">Preview CSV</Button>
                <div className="grid gap-2">
                  <Label htmlFor="feedback-csv-mode">CSV import mode</Label>
                  <select className={selectClassName} id="feedback-csv-mode" onChange={(event) => {
                    setImportMode(event.target.value as CsvImportMode);
                    setReplaceConfirmationNeeded(false);
                  }} value={importMode}>
                    <option value="append">Append (default)</option>
                    <option value="replace">Replace all existing responses</option>
                  </select>
                </div>
                <Button disabled={!csvPreview?.ok} onClick={applyCsv} type="button">Apply CSV</Button>
              </div>
              {csvPreview?.ok && <p className="rounded-lg border border-border bg-background p-3 text-sm" role="status">Parsed {csvPreview.rowCount} response{csvPreview.rowCount === 1 ? '' : 's'}. {importMode === 'append' ? 'Applying will append them to stored feedback.' : 'Applying will replace stored feedback after confirmation if responses already exist.'}</p>}
              {csvPreview && !csvPreview.ok && <p className="rounded-lg border border-destructive/45 bg-destructive/10 p-3 text-sm text-destructive" role="alert">{csvPreview.error}</p>}
              {csvStatus && <p className="rounded-lg border border-border bg-background p-3 text-sm" role="status">{csvStatus}</p>}
              {replaceConfirmationNeeded && (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/45 bg-destructive/10 p-3">
                  <p className="text-sm text-destructive">Replacing will remove the current stored feedback.</p>
                  <Button onClick={confirmReplace} type="button" variant="destructive">Replace {session.feedbackResponses.length} existing response{session.feedbackResponses.length === 1 ? '' : 's'}</Button>
                </div>
              )}
            </div>
          </details>

          <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4" data-testid="feedback-summary">
            <span><strong>{feedback.responseCount}</strong> responses</span>
            <span><strong>{feedback.averageClarity ?? '—'}</strong> clarity</span>
            <span><strong>{feedback.averageUsefulness ?? '—'}</strong> usefulness</span>
            <span><strong>{feedback.averageConfidenceGain ?? '—'}</strong> confidence change</span>
          </div>
          <div className="space-y-2">
            <h3 className="font-heading text-base font-medium">Kirkpatrick spine</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><strong className="text-foreground">Reaction:</strong> {feedback.kirkpatrick.reaction}</li>
              <li><strong className="text-foreground">Learning:</strong> {feedback.kirkpatrick.learning}</li>
              <li><strong className="text-foreground">Behaviour:</strong> {feedback.kirkpatrick.behaviour}</li>
              <li><strong className="text-foreground">Results:</strong> {feedback.kirkpatrick.results}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
