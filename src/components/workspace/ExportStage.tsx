import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { buildFeedbackSummary, buildMarkdownExport } from '@/domain/core';
import { getExportWarnings } from '@/domain/workflow';
import type { SessionStageProps } from './workspace-types';

type ExportActionStatus = 'idle' | 'copy_success' | 'copy_failure' | 'download' | 'print' | 'failure';

function downloadMarkdown(filename: string, markdown: string) {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  try {
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}

function markdownFilename(title: string): string {
  const stem = title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'teaching-session';
  return `${stem}-evidence-pack.md`;
}

export function ExportStage({ session, onChange }: SessionStageProps) {
  const feedback = useMemo(() => buildFeedbackSummary(session.feedbackResponses), [session.feedbackResponses]);
  const markdown = useMemo(() => buildMarkdownExport(session, feedback, session.reflection), [feedback, session]);
  const warnings = useMemo(() => getExportWarnings(session), [session]);
  const [actionStatus, setActionStatus] = useState<ExportActionStatus>('idle');

  const copyMarkdown = async () => {
    setActionStatus('idle');
    try {
      await navigator.clipboard.writeText(markdown);
      setActionStatus('copy_success');
    } catch {
      setActionStatus('copy_failure');
    }
  };

  const download = () => {
    setActionStatus('idle');
    try {
      downloadMarkdown(markdownFilename(session.title), markdown);
      setActionStatus('download');
    } catch {
      setActionStatus('failure');
    }
  };

  const print = () => {
    setActionStatus('idle');
    try {
      window.print();
      setActionStatus('print');
    } catch {
      setActionStatus('failure');
    }
  };

  return (
    <section aria-labelledby="export-stage-title">
      <Card className="border-border bg-card shadow-none ring-0">
        <CardHeader>
          <CardTitle><h2 data-workspace-stage-heading="export" id="export-stage-title" tabIndex={-1}>Export</h2></CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <section aria-label="Export omissions" className="rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="font-heading text-base font-medium">Important omissions to review</h3>
            <p className="mt-1 text-sm text-muted-foreground">These are prompts for review only. They do not make this session invalid or disable export.</p>
            {warnings.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-muted-foreground" data-testid="export-warnings">
                {warnings.map((warning) => <li key={warning.code}>{warning.message}</li>)}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No current omission warnings were derived from this session.</p>
            )}
          </section>

          <div className="flex flex-wrap gap-2" data-print-hidden>
            <Button onClick={copyMarkdown} type="button">Copy Markdown</Button>
            <Button onClick={download} type="button" variant="outline">Download Markdown</Button>
            <Button onClick={print} type="button" variant="outline">Print or save PDF</Button>
          </div>

          {actionStatus === 'copy_success' && <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm" data-print-hidden data-testid="export-action-status" role="status">Markdown copied to clipboard.</p>}
          {actionStatus === 'copy_failure' && <p className="rounded-lg border border-destructive/45 bg-destructive/10 p-3 text-sm text-destructive" data-print-hidden data-testid="export-action-status" role="alert">Markdown could not be copied to the clipboard. Select the preview text and copy it manually.</p>}
          {actionStatus === 'download' && <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm" data-print-hidden data-testid="export-action-status" role="status">Download initiated. Your browser controls where the Markdown file is saved.</p>}
          {actionStatus === 'print' && <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm" data-print-hidden data-testid="export-action-status" role="status">Print dialog initiated. Use your browser or system dialog to print or save a PDF.</p>}
          {actionStatus === 'failure' && <p className="rounded-lg border border-destructive/45 bg-destructive/10 p-3 text-sm text-destructive" data-print-hidden data-testid="export-action-status" role="alert">The browser action could not be initiated. Use the Markdown preview instead.</p>}

          <div className="grid gap-2" data-print-hidden>
            <Label htmlFor="export-evidence-notes">Evidence notes / artefact locations</Label>
            <textarea className="min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground dark:bg-input/30" id="export-evidence-notes" onChange={(event) => onChange({ ...session, evidenceNotes: event.target.value })} placeholder="Attendance sheet, certificate, screenshot, observed-teaching note, or local file path." value={session.evidenceNotes} />
          </div>

          <details open className="rounded-lg border border-border bg-muted/20 p-4">
            <summary className="cursor-pointer font-medium" data-print-hidden>Markdown evidence pack preview</summary>
            <pre className="mt-4 max-h-[32rem] overflow-auto rounded-lg bg-foreground p-4 text-sm text-background" data-print-evidence-pack data-testid="markdown-preview">{markdown}</pre>
          </details>
        </CardContent>
      </Card>
    </section>
  );
}
