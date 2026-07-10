import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  type BloomLevel,
  checkDose,
  type DreyfusStage,
  type EvidenceType,
  flagObjectiveText,
  generateFeedbackQuestions,
  type MillerLevel,
  type Objective,
} from '@/domain/core';
import type { SessionStageProps } from './workspace-types';

const bloomLevels: BloomLevel[] = ['Remember', 'Understand', 'Apply', 'Analyse', 'Evaluate', 'Create'];
const millerLevels: MillerLevel[] = ['Knows', 'Knows how', 'Shows how', 'Does'];
const evidenceTypes: EvidenceType[] = ['Attendance', 'Feedback', 'Reflection', 'Certificate', 'Photo/artefact'];
const dreyfusStages: DreyfusStage[] = ['Novice', 'Advanced beginner', 'Competent', 'Proficient', 'Expert'];
const selectClassName = 'h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30';
const textareaClassName = 'min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30';

export function PlanStage({ session, onChange }: SessionStageProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const dose = checkDose(session.durationMinutes, session.objectives);

  const commitObjectives = (objectives: Objective[]) => {
    onChange({
      ...session,
      objectives,
      feedbackQuestions: generateFeedbackQuestions(objectives),
      rigour: { ...session.rigour, doseCheck: checkDose(session.durationMinutes, objectives) },
    });
  };

  const addObjective = () => {
    commitObjectives([...session.objectives, {
      id: `objective-${Date.now()}`,
      text: 'By the end of this session, ...',
      bloom: 'Apply',
      activity: 'Case discussion',
      assessment: 'Feedback form',
      evidence: ['Feedback', 'Reflection'],
      frameworkTags: ['Generic teaching evidence'],
    }]);
  };

  const patchObjective = (id: string, patch: Partial<Objective>) => {
    commitObjectives(session.objectives.map((objective) => objective.id === id ? { ...objective, ...patch } : objective));
  };

  const removeObjective = (id: string) => {
    commitObjectives(session.objectives.filter((objective) => objective.id !== id));
  };

  const toggleAdvanced = () => {
    const nextOpen = !advancedOpen;
    setAdvancedOpen(nextOpen);
    onChange({ ...session, rigour: { ...session.rigour, enabled: nextOpen } });
  };

  return (
    <section aria-labelledby="plan-stage-title">
      <Card className="border-border bg-card shadow-none ring-0">
        <CardHeader>
          <CardTitle><h2 data-workspace-stage-heading="plan" id="plan-stage-title" tabIndex={-1}>Plan</h2></CardTitle>
          <CardDescription>Define one meaningful objective with its level, activity, assessment and intended evidence. Advanced prompts are optional.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex justify-end">
            <Button onClick={addObjective} type="button" variant="outline">Add objective</Button>
          </div>

          <div className="space-y-4">
            {session.objectives.map((objective, index) => {
              const flags = flagObjectiveText(objective.text);
              const objectiveId = objective.id.replace(/[^a-zA-Z0-9_-]/g, '-');
              return (
                <Card className="border-border bg-muted/20 shadow-none ring-0" key={objective.id} size="sm">
                  <CardHeader className="flex flex-row items-center justify-between gap-3">
                    <CardTitle>Objective {index + 1}</CardTitle>
                    {session.objectives.length > 1 && <Button onClick={() => removeObjective(objective.id)} size="sm" type="button" variant="ghost">Remove</Button>}
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2 md:col-span-2">
                      <Label htmlFor={`${objectiveId}-text`}>Objective text</Label>
                      <textarea className={textareaClassName} id={`${objectiveId}-text`} value={objective.text} onChange={(event) => patchObjective(objective.id, { text: event.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`${objectiveId}-bloom`}>Bloom level</Label>
                      <select className={selectClassName} id={`${objectiveId}-bloom`} value={objective.bloom} onChange={(event) => patchObjective(objective.id, { bloom: event.target.value as BloomLevel })}>
                        {bloomLevels.map((value) => <option key={value}>{value}</option>)}
                      </select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`${objectiveId}-framework`}>Framework tag</Label>
                      <Input id={`${objectiveId}-framework`} value={objective.frameworkTags.join(', ')} onChange={(event) => patchObjective(objective.id, { frameworkTags: event.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`${objectiveId}-activity`}>Activity</Label>
                      <Input id={`${objectiveId}-activity`} placeholder="Case discussion, bedside, skills station..." value={objective.activity} onChange={(event) => patchObjective(objective.id, { activity: event.target.value })} />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor={`${objectiveId}-assessment`}>Assessment</Label>
                      <Input id={`${objectiveId}-assessment`} placeholder="Feedback form, observed practice, verbal Qs..." value={objective.assessment} onChange={(event) => patchObjective(objective.id, { assessment: event.target.value })} />
                    </div>
                    <fieldset className="grid gap-3 rounded-lg border border-border bg-background p-3 md:col-span-2">
                      <legend className="px-1 text-sm font-medium">Intended evidence to attach</legend>
                      <p className="text-sm text-muted-foreground">These ticks are the evidence types you expect to attach to the portfolio entry; they feed the Markdown evidence pack.</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {evidenceTypes.map((value) => (
                          <Label className="font-normal" key={value}>
                            <input checked={objective.evidence.includes(value)} onChange={(event) => {
                              const evidence = event.target.checked ? [...objective.evidence, value] : objective.evidence.filter((item) => item !== value);
                              patchObjective(objective.id, { evidence });
                            }} type="checkbox" />
                            {value}
                          </Label>
                        ))}
                      </div>
                    </fieldset>
                    {advancedOpen && (
                      <div className="grid gap-4 rounded-lg border border-border bg-background p-3 md:col-span-2 md:grid-cols-3">
                        <div className="grid gap-2">
                          <Label htmlFor={`${objectiveId}-miller`}>Miller level</Label>
                          <select className={selectClassName} id={`${objectiveId}-miller`} value={objective.miller || ''} onChange={(event) => patchObjective(objective.id, { miller: event.target.value ? event.target.value as MillerLevel : undefined })}>
                            <option value="">Not set</option>
                            {millerLevels.map((value) => <option key={value}>{value}</option>)}
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`${objectiveId}-dreyfus`}>Dreyfus learner stage</Label>
                          <select className={selectClassName} id={`${objectiveId}-dreyfus`} value={objective.dreyfusStage || ''} onChange={(event) => patchObjective(objective.id, { dreyfusStage: event.target.value ? event.target.value as DreyfusStage : undefined })}>
                            <option value="">Not set</option>
                            {dreyfusStages.map((value) => <option key={value}>{value}</option>)}
                          </select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor={`${objectiveId}-observed-standard`}>Observed standard</Label>
                          <Input id={`${objectiveId}-observed-standard`} placeholder="e.g. safe simple interrupted sutures with supervision" value={objective.observedStandard || ''} onChange={(event) => patchObjective(objective.id, { observedStandard: event.target.value })} />
                        </div>
                      </div>
                    )}
                    {flags.length > 0 && <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 p-3 text-sm text-foreground md:col-span-2">{flags.join(' ')}</p>}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="rounded-sm border border-border bg-muted/30 p-4">
            <Button aria-controls="plan-advanced-options" aria-expanded={advancedOpen} aria-label="Advanced mode" className="border-primary bg-primary/10 text-primary hover:bg-primary/20 dark:bg-primary/15" onClick={toggleAdvanced} type="button" variant="outline">Advanced mode</Button>
            <p className="mt-2 text-sm text-muted-foreground">Optional prompts for more defensible planning; they do not block Plan readiness.</p>
            {advancedOpen && (
              <div className="mt-4 grid gap-4 border-t border-border pt-4 md:grid-cols-2" id="plan-advanced-options">
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="plan-equity-prompt">Equity prompt</Label>
                  <textarea className={textareaClassName} id="plan-equity-prompt" placeholder="Was teaching and feedback equitable across learner groups?" value={session.rigour.equityPrompt} onChange={(event) => onChange({ ...session, rigour: { ...session.rigour, equityPrompt: event.target.value } })} />
                </div>
                <p className="rounded-lg border border-border bg-background p-3 text-sm md:col-span-2"><strong>Dose check:</strong> {dose.message}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
