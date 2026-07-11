import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface BackupRestorePanelProps {
  importStatus: string;
  focusImportRequest: number;
  onDownloadBackup: () => void;
  onImportBackup: (raw: string) => void;
}

export function BackupRestorePanel({
  importStatus,
  focusImportRequest,
  onDownloadBackup,
  onImportBackup,
}: BackupRestorePanelProps) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [fileReadError, setFileReadError] = useState('');

  useEffect(() => {
    if (focusImportRequest > 0) importInputRef.current?.focus();
  }, [focusImportRequest]);

  return (
    <Card className="bg-transparent shadow-none ring-0">
      <CardHeader>
        <CardTitle><h2 className="font-heading text-lg font-semibold">Application backup</h2></CardTitle>
        <CardDescription>JSON backs up the AlignEd library. Markdown export remains the portfolio-facing artefact.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-end gap-3">
        <Button onClick={onDownloadBackup} type="button" variant="outline">Download JSON backup</Button>
        <div className="grid min-w-64 gap-2">
          <Label htmlFor="home-json-import">Import JSON backup</Label>
          <Input id="home-json-import" ref={importInputRef} type="file" accept="application/json" onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            setFileReadError('');
            void file.text()
              .then(onImportBackup)
              .catch(() => setFileReadError('Could not read backup file. Choose another JSON backup and try again.'));
          }} />
        </div>
        {fileReadError && <div className="rounded-sm border border-destructive/45 bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">{fileReadError}</div>}
        {importStatus && <div className="rounded-lg border border-border bg-muted px-3 py-2 text-sm" role="status">{importStatus}</div>}
      </CardContent>
    </Card>
  );
}
