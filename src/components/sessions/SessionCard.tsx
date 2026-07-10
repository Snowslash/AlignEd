import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type TeachingSession, buildFeedbackSummary, formatUkDate, hasValidIsoDate, todayIso } from '@/domain/core';
import { getSuggestedSessionAction } from '@/domain/workflow';

interface SessionCardProps {
  session: TeachingSession;
  selected: boolean;
  onSelect: () => void;
}

export function SessionCard({ session, selected, onSelect }: SessionCardProps) {
  const feedback = buildFeedbackSummary(session.feedbackResponses);
  const suggestedAction = getSuggestedSessionAction(session, todayIso());
  const hasValidDate = hasValidIsoDate(session.date);

  return (
    <Button
      aria-pressed={selected}
      className="h-auto w-full items-start justify-start rounded-sm border border-border bg-card px-4 py-3 text-left text-card-foreground shadow-none hover:border-primary/45 hover:bg-secondary/55"
      data-selected={selected || undefined}
      onClick={onSelect}
      type="button"
      variant="ghost"
    >
      <span className="grid min-w-0 flex-1 gap-1 whitespace-normal">
        <span className="flex flex-wrap items-center justify-between gap-2">
          <strong className="font-heading text-base font-semibold leading-tight">{session.title}</strong>
          <Badge className="shrink-0" variant={selected ? 'default' : 'secondary'}>{hasValidDate ? formatUkDate(session.date) : 'Date needs review'}</Badge>
        </span>
        <span className="text-sm text-muted-foreground">{session.audience || 'Audience TBC'} · {session.setting}</span>
        <span className="text-xs text-muted-foreground">{feedback.responseCount} feedback response{feedback.responseCount === 1 ? '' : 's'}</span>
        <span className="text-sm font-medium text-primary">Next: {suggestedAction.label}</span>
        {!hasValidDate && <span className="text-xs text-destructive">Check the date before continuing.</span>}
      </span>
    </Button>
  );
}
