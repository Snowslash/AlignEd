import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';

const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface RestoreConfirmationProps {
  sessionCount: number;
  onCancel: () => void;
  onConfirm: () => void;
  onDownloadCurrentBackup: () => void;
}

export function RestoreConfirmation({
  sessionCount,
  onCancel,
  onConfirm,
  onDownloadCurrentBackup,
}: RestoreConfirmationProps) {
  const downloadBackupButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    downloadBackupButtonRef.current?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onCancel();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusableElements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(focusableSelector));
    const first = focusableElements[0];
    const last = focusableElements.at(-1);
    if (!first || !last) return;

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" role="presentation">
      <section
        aria-labelledby="restore-confirmation-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-sm border border-border bg-background p-5"
        onKeyDown={handleKeyDown}
        role="dialog"
      >
        <p className="text-sm font-medium text-destructive">Replacement restore</p>
        <h2 className="mt-1 font-heading text-xl font-semibold" id="restore-confirmation-title">Replace local session library</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          Detected {sessionCount} session{sessionCount === 1 ? '' : 's'} in this backup. Continuing will replace your current local session library; it will not merge sessions.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Download a current backup before replacing the library.</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button onClick={onDownloadCurrentBackup} ref={downloadBackupButtonRef} type="button" variant="outline">Download current backup</Button>
          <Button onClick={onCancel} type="button" variant="ghost">Cancel restore</Button>
          <Button onClick={onConfirm} type="button" variant="destructive">Replace local library</Button>
        </div>
      </section>
    </div>
  );
}
