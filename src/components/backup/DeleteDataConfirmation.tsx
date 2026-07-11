import { useEffect, useRef } from 'react';
import type { KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';

const focusableSelector = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DeleteDataConfirmationProps {
  sessionCount: number;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteDataConfirmation({ sessionCount, onCancel, onConfirm }: DeleteDataConfirmationProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
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
        aria-labelledby="delete-data-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-sm border border-border bg-background p-5"
        onKeyDown={handleKeyDown}
        role="dialog"
      >
        <p className="text-sm font-medium text-destructive">Permanent deletion</p>
        <h2 className="mt-1 font-heading text-xl font-semibold" id="delete-data-title">Delete all local data</h2>
        <p className="mt-3 text-sm text-muted-foreground">
          This will delete {sessionCount} locally stored session{sessionCount === 1 ? '' : 's'} from this browser. This cannot be undone.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">Download a JSON backup first if you may need these records later.</p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button onClick={onCancel} ref={cancelButtonRef} type="button" variant="outline">Cancel deletion</Button>
          <Button onClick={onConfirm} type="button" variant="destructive">Delete local data</Button>
        </div>
      </section>
    </div>
  );
}
