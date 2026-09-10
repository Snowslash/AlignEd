import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { checkDose, formatUkDate, parseUkDate, type TeachingSession } from '@/domain/core';
import { getCaptureValidationErrors } from '@/domain/workflow';
import type { SessionStageProps } from './workspace-types';

function numberValue(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p className="text-sm text-destructive" id={id} role="alert">{message}</p> : null;
}

export function CaptureStage({ session, onChange }: SessionStageProps) {
  const errors = getCaptureValidationErrors(session);
  const patch = (patchValue: Partial<TeachingSession>) => onChange({
    ...session,
    ...patchValue,
    rigour: {
      ...session.rigour,
      doseCheck: checkDose(patchValue.durationMinutes ?? session.durationMinutes, session.objectives),
    },
  });

  return (
    <section aria-labelledby="capture-stage-title">
      <Card className="border-border bg-card shadow-none ring-0">
        <CardHeader>
          <CardTitle><h2 data-workspace-stage-heading="capture" id="capture-stage-title" tabIndex={-1}>Capture</h2></CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2 lg:col-span-2">
            <Label htmlFor="capture-title">Session title</Label>
            <Input aria-describedby={errors.title ? 'capture-title-error' : undefined} aria-invalid={Boolean(errors.title)} id="capture-title" value={session.title} onChange={(event) => patch({ title: event.target.value })} />
            <FieldError id="capture-title-error" message={errors.title} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="capture-date">Date</Label>
            <Input aria-describedby={errors.date ? 'capture-date-error' : undefined} aria-invalid={Boolean(errors.date)} id="capture-date" inputMode="numeric" placeholder="dd/mm/yyyy" value={formatUkDate(session.date)} onChange={(event) => patch({ date: parseUkDate(event.target.value) })} />
            <FieldError id="capture-date-error" message={errors.date} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="capture-duration">Duration minutes</Label>
            <Input aria-describedby={errors.durationMinutes ? 'capture-duration-error' : undefined} aria-invalid={Boolean(errors.durationMinutes)} id="capture-duration" min={1} type="number" value={session.durationMinutes} onChange={(event) => patch({ durationMinutes: numberValue(event.target.value) })} />
            <FieldError id="capture-duration-error" message={errors.durationMinutes} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="capture-audience">Audience</Label>
            <Input aria-describedby={errors.audience ? 'capture-audience-error' : undefined} aria-invalid={Boolean(errors.audience)} id="capture-audience" value={session.audience} onChange={(event) => patch({ audience: event.target.value })} />
            <FieldError id="capture-audience-error" message={errors.audience} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="capture-level">Level</Label>
            <Input id="capture-level" value={session.level} onChange={(event) => patch({ level: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="capture-topic">Topic</Label>
            <Input id="capture-topic" value={session.topic} onChange={(event) => patch({ topic: event.target.value })} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="capture-setting">Setting</Label>
            <Input aria-describedby={errors.setting ? 'capture-setting-error' : undefined} aria-invalid={Boolean(errors.setting)} id="capture-setting" value={session.setting} onChange={(event) => patch({ setting: event.target.value })} />
            <FieldError id="capture-setting-error" message={errors.setting} />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
