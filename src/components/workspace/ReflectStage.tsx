import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { buildFeedbackSummary, buildReflectionSuggestion, type ReflectionDraft } from '@/domain/core';
import type { SessionStageProps } from './workspace-types';

type ReflectionField = keyof ReflectionDraft['sections'] | 'forwardEvaluationMeasure';

const reflectionFields: Array<{ field: ReflectionField; label: string }> = [
  { field: 'description', label: 'Description' },
  { field: 'feelings', label: 'Feelings' },
  { field: 'evaluation', label: 'Evaluation' },
  { field: 'analysis', label: 'Analysis' },
  { field: 'conclusion', label: 'Conclusion' },
  { field: 'actionPlan', label: 'Action plan' },
  { field: 'forwardEvaluationMeasure', label: 'Forward evaluation measure' },
];

const textareaClassName = 'min-h-28 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30';

function reflectionValue(reflection: ReflectionDraft, field: ReflectionField): string {
  return field === 'forwardEvaluationMeasure' ? reflection.forwardEvaluationMeasure : reflection.sections[field];
}

export function ReflectStage({ session, onChange }: SessionStageProps) {
  const feedback = useMemo(() => buildFeedbackSummary(session.feedbackResponses), [session.feedbackResponses]);
  const suggestion = useMemo(
    () => feedback.responseCount > 0 ? buildReflectionSuggestion(session, feedback) : undefined,
    [feedback, session],
  );
  const [dismissedFields, setDismissedFields] = useState<Set<ReflectionField>>(() => new Set());

  useEffect(() => {
    setDismissedFields(new Set());
  }, [session.feedbackResponses]);

  const differingSuggestionFields = suggestion
    ? reflectionFields.filter(({ field }) => reflectionValue(suggestion, field) !== reflectionValue(session.reflection, field))
    : [];
  const visibleSuggestionFields = differingSuggestionFields.filter(({ field }) => !dismissedFields.has(field));

  const patchField = (field: ReflectionField, value: string) => {
    const reflection = field === 'forwardEvaluationMeasure'
      ? { ...session.reflection, forwardEvaluationMeasure: value }
      : { ...session.reflection, sections: { ...session.reflection.sections, [field]: value } };
    onChange({ ...session, reflection });
  };

  return (
    <section aria-labelledby="reflect-stage-title">
      <Card className="border-border bg-card shadow-none ring-0">
        <CardHeader>
          <CardTitle><h2 data-workspace-stage-heading="reflect" id="reflect-stage-title" tabIndex={-1}>Reflect</h2></CardTitle>
          <CardDescription>Write a portfolio-usable Gibbs reflection. This remains your editable text whether or not learner feedback was collected.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {feedback.responseCount > 0 ? (
            <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground" role="status">
              {differingSuggestionFields.length === 0
                ? 'Your current reflection already matches the current feedback-informed draft. No generated changes are available to apply.'
                : visibleSuggestionFields.length > 0
                  ? 'Feedback-informed generated suggestions are available. They are drafts, not reviewed or authored reflection; compare and apply individual fields only when useful.'
                  : 'Generated differences were kept or dismissed. Your current text is unchanged.'}
            </p>
          ) : (
            <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              No learner feedback is recorded. You can still write and save a complete reflection from the session evidence you have.
            </p>
          )}

          <div className="grid gap-4">
            {reflectionFields.map(({ field, label }) => {
              const id = `reflect-${field}`;
              return (
                <div className="grid gap-2" key={field}>
                  <Label htmlFor={id}>{label}</Label>
                  <textarea className={textareaClassName} id={id} onChange={(event) => patchField(field, event.target.value)} value={reflectionValue(session.reflection, field)} />
                </div>
              );
            })}
          </div>

          {suggestion && visibleSuggestionFields.length > 0 && (
            <section aria-label="Generated reflection suggestions" className="space-y-4 border-t border-border pt-5">
              <div>
                <h3 className="font-heading text-xl font-semibold tracking-tight">Generated suggestions</h3>
                <p className="mt-1 text-sm text-muted-foreground">Each generated draft is previewed against your current text. Applying one does not change any other field.</p>
              </div>
              <div className="grid gap-4">
                {visibleSuggestionFields.map(({ field, label }) => (
                  <Card className="border-border bg-muted/20 shadow-none ring-0" key={field} size="sm">
                    <CardHeader>
                      <CardTitle>Generated suggestion: {label}</CardTitle>
                      <CardDescription>Generated draft — not authored or reviewed by you.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                      <div className="grid gap-1 rounded-lg border border-border bg-background p-3 text-sm">
                        <strong>Current</strong>
                        <p className="whitespace-pre-wrap">{reflectionValue(session.reflection, field) || 'No text entered.'}</p>
                      </div>
                      <div className="grid gap-1 rounded-lg border border-border bg-background p-3 text-sm">
                        <strong>Suggested</strong>
                        <p className="whitespace-pre-wrap">{reflectionValue(suggestion, field)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button onClick={() => patchField(field, reflectionValue(suggestion, field))} type="button">Apply to {label}</Button>
                        <Button onClick={() => setDismissedFields((current) => new Set(current).add(field))} type="button" variant="outline">Keep current {label}</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
