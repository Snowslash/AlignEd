import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { formatUkDate, type TeachingSession } from '@/domain/core';
import {
  buildGoogleFeedbackLink, GOOGLE_FORM_STORAGE_KEY, parseGoogleFormTemplate,
  previewGoogleFeedbackCsv, type DateOrder, type GoogleFeedbackPreview,
} from '@/domain/google-feedback';
import type { SessionStageProps } from './workspace-types';

const textareaClass = 'min-h-24 w-full rounded-sm border border-input bg-transparent px-2.5 py-2 text-sm';
const selectClass = 'min-h-10 w-full rounded-sm border border-input bg-background px-2.5 text-sm';

function loadTemplate(): { value: string; error?: string } {
  try { return { value: localStorage.getItem(GOOGLE_FORM_STORAGE_KEY) ?? '' }; }
  catch { return { value: '', error: 'Could not read the form connection from this browser.' }; }
}

export function GoogleFeedbackPanel({ session, onChange, sessions = [session] }: SessionStageProps & { sessions?: readonly TeachingSession[] }) {
  const [initial] = useState(loadTemplate);
  const [savedTemplate, setSavedTemplate] = useState(initial.value);
  const [template, setTemplate] = useState(initial.value);
  const [connectionError, setConnectionError] = useState(initial.error);
  const [linkStatus, setLinkStatus] = useState('');
  const [actionError, setActionError] = useState('');
  const [csv, setCsv] = useState('');
  const [dateOrder, setDateOrder] = useState<DateOrder>('dmy');
  const [preview, setPreview] = useState<{ csv: string; dateOrder: DateOrder; sessionKey: string; result: GoogleFeedbackPreview }>();
  const [confirmed, setConfirmed] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [fileError, setFileError] = useState('');
  const fileRequest = useRef(0);
  const qrContainer = useRef<HTMLDivElement>(null);
  useEffect(() => () => { fileRequest.current++; }, [session.id]);

  const config = savedTemplate ? parseGoogleFormTemplate(savedTemplate) : undefined;
  let link = '';
  let linkError = config && !config.ok ? config.error : '';
  if (config?.ok) {
    try { link = buildGoogleFeedbackLink(config.config, session); }
    catch (error) { linkError = error instanceof Error ? error.message : 'Could not create the feedback link.'; }
  }
  const sessionKey = JSON.stringify([session.id, session.title, session.date, session.feedbackResponses, sessions.map(({ id, title, date }) => [id, title, date])]);
  const currentPreview = preview?.csv === csv && preview.dateOrder === dateOrder && preview.sessionKey === sessionKey ? preview.result : undefined;

  const saveConnection = () => {
    const result = parseGoogleFormTemplate(template);
    if (!result.ok) { setConnectionError(result.error); return; }
    try {
      localStorage.setItem(GOOGLE_FORM_STORAGE_KEY, template.trim());
      setSavedTemplate(template.trim());
      setConnectionError(undefined);
      setActionError('');
      setLinkStatus('Form connection saved in this browser. Check the form opens correctly before sharing.');
    } catch { setConnectionError('Could not save the form connection. Existing settings were left unchanged.'); }
  };

  const forgetConnection = () => {
    try {
      localStorage.removeItem(GOOGLE_FORM_STORAGE_KEY);
      setSavedTemplate(''); setTemplate(''); setConnectionError(undefined); setLinkStatus('Form connection removed. Google responses were not deleted.'); setActionError('');
    } catch { setConnectionError('Could not remove the saved form connection.'); }
  };

  const copyLink = async () => {
    setActionError(''); setLinkStatus('');
    try { await navigator.clipboard.writeText(link); setLinkStatus('Feedback link copied.'); }
    catch { setActionError('Could not copy the link. Select and copy the Feedback link field instead.'); }
  };

  const downloadQr = () => {
    setActionError(''); setLinkStatus('');
    try {
      const svg = qrContainer.current?.querySelector('svg');
      if (!svg) throw new Error('QR unavailable');
      const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml;charset=utf-8' }));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `aligned-feedback-${session.date}.svg`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setLinkStatus('QR download requested. Check the saved image before sharing.');
    } catch { setActionError('Could not download the QR code. Copy the feedback link instead.'); }
  };

  const resetPreview = () => { setPreview(undefined); setConfirmed(false); setImportStatus(''); };
  const changeCsv = (value: string) => { fileRequest.current++; setCsv(value); setFileError(''); resetPreview(); };
  const readFile = async (file?: File) => {
    const request = ++fileRequest.current;
    resetPreview(); setFileError(''); setCsv('');
    if (!file) return;
    if (file.size > 2_000_000) { setFileError('CSV is too large. Choose a file under 2 MB.'); return; }
    try {
      const text = await file.text();
      if (request === fileRequest.current) setCsv(text);
    } catch { if (request === fileRequest.current) setFileError('Could not read the CSV file. Existing feedback was left unchanged.'); }
  };
  const previewCsv = () => {
    setPreview({ csv, dateOrder, sessionKey, result: previewGoogleFeedbackCsv(csv, session, dateOrder, sessions) });
    setConfirmed(false); setImportStatus('');
  };
  const applyCsv = () => {
    if (!confirmed || !currentPreview?.ok || !currentPreview.rows.length) return;
    const fresh = previewGoogleFeedbackCsv(csv, session, dateOrder, sessions);
    if (!fresh.ok || JSON.stringify(fresh) !== JSON.stringify(currentPreview)) { resetPreview(); setFileError('The source changed. Preview and review it again.'); return; }
    onChange({ ...session, feedbackResponses: [...session.feedbackResponses, ...fresh.rows] });
    resetPreview();
    setImportStatus(`Appended ${fresh.rows.length} new response${fresh.rows.length === 1 ? '' : 's'}. Existing feedback and reflection were preserved.`);
  };

  return (
    <div className="min-w-0 space-y-4 border-b border-border pb-5" aria-label="Google Forms feedback">
      <h3 className="font-heading text-base font-medium">Collect with Google Forms</h3>
      <p className="text-sm text-muted-foreground">Google stores submitted feedback. AlignEd generates links and QR codes locally; responses only enter this browser when you import a CSV. No Google account connection or automatic sync. The prompts below do not change your Google Form’s questions.</p>
      <details className="rounded-sm border border-border p-3" open={!savedTemplate}>
        <summary className="cursor-pointer font-medium">Form connection settings</summary>
        <div className="mt-3 space-y-3">
          <p className="text-sm text-muted-foreground">In your Google Form, choose Pre-fill form. Enter <code>SESSION_TITLE</code> as the session title and <strong>2 January 2000</strong> as the date. Leave all feedback answers blank, get the full link and paste it below. The form needs to be published before learners can use it.</p>
          <Label htmlFor="google-form-template">Pre-filled form template</Label>
          <textarea className={textareaClass} id="google-form-template" value={template} onChange={(event) => { setTemplate(event.target.value); setConnectionError(undefined); }} placeholder="https://docs.google.com/forms/d/e/…/viewform?usp=pp_url&entry.…" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={saveConnection}>Save form connection</Button>
            {savedTemplate && <Button type="button" variant="outline" onClick={forgetConnection}>Remove form connection</Button>}
          </div>
          <p className="text-sm text-muted-foreground">Saved only in this browser, separately from session JSON backups. No shared form is built into AlignEd. Changing this link does not change or publish the Google Form.</p>
          {connectionError && <p role="alert" className="text-sm text-destructive">{connectionError}</p>}
        </div>
      </details>
      {linkError && <p role="alert" className="text-sm text-destructive">{linkError}</p>}
      {link && (
        <div className="grid min-w-0 gap-4 sm:grid-cols-[16rem_minmax(0,1fr)]">
          <div ref={qrContainer} className="max-w-64">
            <QRCodeSVG aria-label="Feedback QR code" role="img" value={link} size={256} level="M" marginSize={4} bgColor="#ffffff" fgColor="#000000" className="h-auto w-full" />
          </div>
          <div className="min-w-0 space-y-3">
            <p className="font-medium">{session.title} · {formatUkDate(session.date)}</p>
            <Label htmlFor="google-feedback-link">Feedback link</Label>
            <textarea className={textareaClass} id="google-feedback-link" readOnly value={link} />
            <div className="flex flex-wrap items-center gap-3">
              <a className="underline" href={link} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Open feedback form</a>
              <Button type="button" variant="outline" onClick={copyLink}>Copy feedback link</Button>
              <Button type="button" variant="outline" onClick={downloadQr}>Download QR SVG</Button>
            </div>
            <p className="text-sm text-muted-foreground">The link contains the session title and date. Check both pre-filled fields and signed-out access before sharing. Do not include identifiable clinical details. Learners can edit pre-filled fields; they are not proof of which session a response belongs to.</p>
          </div>
        </div>
      )}
      {linkStatus && <p role="status" className="text-sm">{linkStatus}</p>}
      {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
      <details className="rounded-sm border border-border p-3">
        <summary className="cursor-pointer font-medium">Import Google Forms CSV</summary>
        <div className="mt-3 space-y-4">
          <p className="text-sm text-muted-foreground">In Google Forms, open Responses → Download responses (.csv). Import the full export from the same form each time. Only the current session’s title and date are matched; other sessions are excluded. Extra columns are not stored.</p>
          <div className="grid gap-2">
            <Label htmlFor="google-feedback-file">Choose Google Forms CSV file</Label>
            <input className="block w-full min-w-0 text-sm" id="google-feedback-file" type="file" accept=".csv,text/csv" onChange={(event) => { void readFile(event.target.files?.[0]); event.target.value = ''; }} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="google-feedback-csv">Google Forms CSV</Label>
            <textarea className={textareaClass} id="google-feedback-csv" value={csv} onChange={(event) => changeCsv(event.target.value)} placeholder="Paste the CSV here, or choose its file above." />
          </div>
          <div className="grid max-w-sm gap-2">
            <Label htmlFor="google-feedback-date-order">CSV date order</Label>
            <select className={selectClass} id="google-feedback-date-order" value={dateOrder} onChange={(event) => { setDateOrder(event.target.value as DateOrder); resetPreview(); }}>
              <option value="dmy">Day/month/year (UK)</option>
              <option value="mdy">Month/day/year (US)</option>
            </select>
          </div>
          <Button type="button" variant="outline" onClick={previewCsv}>Preview Google responses</Button>
          {fileError && <p role="alert" className="text-sm text-destructive">{fileError}</p>}
          {currentPreview && !currentPreview.ok && <p role="alert" className="text-sm text-destructive">{currentPreview.error}</p>}
          {currentPreview?.ok && (
            <div className="min-w-0 space-y-3">
              <p className="text-sm" role="status">{currentPreview.totalCount} total; {currentPreview.matchedCount} matching; {currentPreview.excludedCount} from other sessions; {currentPreview.duplicateCount} already imported (exact row matches); {currentPreview.rows.length} new.</p>
              <p className="text-sm">Import destination: <strong>{session.title} · {formatUkDate(session.date)}</strong></p>
              {currentPreview.rows.length > 0 ? (
                <>
                  <div className="max-h-80 overflow-auto rounded-sm border border-border" tabIndex={0} role="region" aria-label="New Google responses preview">
                    <table className="w-full text-left text-sm">
                      <thead><tr>{['Submitted', 'Clarity', 'Usefulness', 'Before', 'After', 'Comments'].map((title) => <th key={title} className="p-2 font-medium">{title}</th>)}</tr></thead>
                      <tbody>{currentPreview.rows.map((response, index) => <tr className="border-t border-border" key={index}>
                        <td className="p-2">{response.googleFormsTimestamp}</td>
                        {['clarity', 'usefulness', 'preConfidence', 'postConfidence'].map((key) => <td className="p-2" key={key}>{response[key] ?? '—'}</td>)}
                        <td className="min-w-40 whitespace-pre-wrap break-words p-2">{response.freeText ?? '—'}</td>
                      </tr>)}</tbody>
                    </table>
                  </div>
                  <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />I have checked these responses belong to this session and the CSV date order is correct.</label>
                </>
              ) : <p className="text-sm">{currentPreview.matchedCount ? 'No new responses to import.' : 'No matching responses. Check the session title, date and CSV date order.'}</p>}
              <p className="text-sm text-muted-foreground">Exact repeated rows are skipped. Edited responses or changed timestamp formats are not automatically reconciled; review them against existing feedback before importing. Keep the original export as your source evidence.</p>
            </div>
          )}
          <Button type="button" disabled={!confirmed || !currentPreview?.ok || !currentPreview.rows.length} onClick={applyCsv}>Append new Google responses</Button>
          {importStatus && <p role="status" className="text-sm">{importStatus}</p>}
        </div>
      </details>
    </div>
  );
}
