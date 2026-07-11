import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { CaptureValidationErrors } from '@/domain/workflow';
import type { EntryMode, QuickFormState } from './types';

interface SessionEntryPanelProps {
  mode: EntryMode;
  form: QuickFormState;
  onChange: (form: QuickFormState) => void;
  onCancel: () => void;
  onSave: () => void;
  errors: CaptureValidationErrors;
}

function FieldError({ id, message }: { id: string; message?: string }) {
  return message ? <p className="text-sm text-destructive" id={id} role="alert">{message}</p> : null;
}

export function SessionEntryPanel({ mode, form, onChange, onCancel, onSave, errors }: SessionEntryPanelProps) {
  const hadErrors = useRef(false);
  const retrospective = mode === 'retrospective';
  const title = retrospective ? 'Log teaching I have just done' : 'Plan an upcoming session';
  const description = retrospective
    ? 'Capture the factual minimum now. Objectives, feedback and reflection can wait.'
    : 'Set up the session and continue directly into objectives and intended evidence.';

  useEffect(() => {
    const hasErrors = Object.keys(errors).length > 0;
    if (hasErrors && !hadErrors.current) {
      const firstInvalidField = ['title', 'date', 'durationMinutes', 'audience', 'setting']
        .find((field) => Boolean(errors[field as keyof CaptureValidationErrors]));
      const idByField = {
        title: 'entry-title',
        date: 'entry-date',
        durationMinutes: 'entry-duration',
        audience: 'entry-audience',
        setting: 'entry-setting',
      } as const;
      if (firstInvalidField) document.getElementById(idByField[firstInvalidField as keyof typeof idByField])?.focus();
    }
    hadErrors.current = hasErrors;
  }, [errors]);

  return (
    <section className="mx-auto mt-6 max-w-5xl" aria-labelledby="session-entry-title">
      <Button className="mb-4 -ml-2" onClick={onCancel} type="button" variant="ghost">
        <ArrowLeft data-icon="inline-start" />
        Back to sessions
      </Button>
      <Card className="border-border bg-card shadow-none ring-0">
        <CardHeader className="border-b border-border pb-5">
          <div className="space-y-2">
            <Badge variant="secondary">{retrospective ? 'Quick capture' : 'Upcoming teaching'}</Badge>
            <CardTitle>
              <h2 className="font-heading text-2xl font-semibold tracking-tight" id="session-entry-title">{title}</h2>
            </CardTitle>
            <CardDescription className="max-w-2xl text-base">{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={(event) => {
            event.preventDefault();
            onSave();
          }}>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-2 lg:col-span-2">
              <Label htmlFor="entry-title">Session title</Label>
              <Input aria-describedby={errors.title ? 'entry-title-error' : undefined} aria-invalid={Boolean(errors.title)} autoFocus id="entry-title" value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} placeholder="Ward suturing" />
              <FieldError id="entry-title-error" message={errors.title} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="entry-date">Date</Label>
              <Input aria-describedby={errors.date ? 'entry-date-error' : undefined} aria-invalid={Boolean(errors.date)} id="entry-date" value={form.date} onChange={(event) => onChange({ ...form, date: event.target.value })} placeholder="dd/mm/yyyy" inputMode="numeric" />
              <FieldError id="entry-date-error" message={errors.date} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="entry-duration">Duration minutes</Label>
              <Input aria-describedby={errors.durationMinutes ? 'entry-duration-error' : undefined} aria-invalid={Boolean(errors.durationMinutes)} id="entry-duration" value={form.durationMinutes} onChange={(event) => onChange({ ...form, durationMinutes: Number(event.target.value) })} type="number" />
              <FieldError id="entry-duration-error" message={errors.durationMinutes} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="entry-audience">Audience</Label>
              <Input aria-describedby={errors.audience ? 'entry-audience-error' : undefined} aria-invalid={Boolean(errors.audience)} id="entry-audience" value={form.audience} onChange={(event) => onChange({ ...form, audience: event.target.value })} placeholder="FY1 doctors" />
              <FieldError id="entry-audience-error" message={errors.audience} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="entry-level">Level</Label>
                <Input id="entry-level" value={form.level} onChange={(event) => onChange({ ...form, level: event.target.value })} placeholder="FY1 / CT1 / mixed" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="entry-topic">Topic</Label>
                <Input id="entry-topic" value={form.topic} onChange={(event) => onChange({ ...form, topic: event.target.value })} placeholder="Simple interrupted sutures" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="entry-setting">Setting</Label>
                <Input aria-describedby={errors.setting ? 'entry-setting-error' : undefined} aria-invalid={Boolean(errors.setting)} id="entry-setting" value={form.setting} onChange={(event) => onChange({ ...form, setting: event.target.value })} placeholder="Ward / seminar / skills corner" />
                <FieldError id="entry-setting-error" message={errors.setting} />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
              <p className="text-sm text-muted-foreground">Stored in this browser only after save. Do not enter patient-identifiable information.</p>
              <Button size="lg" type="submit">
                {retrospective ? 'Save session' : 'Save and continue to planning'}
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}
