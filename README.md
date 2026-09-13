# AlignEd

A small browser app for planning teaching, capturing feedback and turning a taught session into a portfolio-ready evidence pack.

It is designed for clinicians who need to capture the essentials after teaching: what was taught, who attended, the intended objectives, feedback, reflection and evidence locations.

Live project page: https://aligned.sangeev.me

Live app: https://aligned.sangeev.me/app/

## What it does

- Logs a taught session quickly.
- Helps write simple learning objectives. Bloom and Miller classifications are optional in Advanced mode; they do not gate readiness.
- Tracks the evidence you plan to attach: attendance, feedback, reflection, certificate or photo/artefact.
- Generates session-specific links and QR codes for your own Google Form, then imports its feedback by CSV. Manual entry and generic CSV import remain available.
- Summarises feedback using clarity, usefulness and pre/post confidence.
- Provides a Gibbs-style reflection scaffold.
- Exports a Markdown evidence pack that can be saved, printed or copied into a portfolio system.
- Stores data locally in your browser.

## What it does not do

- It does not upload your portfolio. Optional feedback links open Google Forms with the session title and date; Google collects learner submissions.
- It does not provide accounts, sharing or cloud sync.
- It does not host forms or automatically fetch responses from Google.
- It does not replace your judgement about what is appropriate portfolio evidence.
- It is not intended for patient-identifiable information.

## Privacy and safety

This app runs in the browser and stores sessions in browser `localStorage`. There is no AlignEd backend. Google Forms is an optional external collection service: its responses remain in Google until you delete them there. Deleting local AlignEd data does not delete Google responses.

Do not enter patient-identifiable information. If you use examples, keep them generic and anonymised.

Use the JSON backup button before clearing browser data or moving to another machine.

## Feedback workflow

### Google Form → session QR → reviewed CSV

1. Prepare your own teaching feedback form with the question titles below. Use a date question for the session date, whole-number 1–5 ratings and an optional paragraph comment. Disable email collection and respondent-visible summaries for an anonymous/no-email pilot; avoid names and patient-identifiable information. If you want no-login access, also avoid “Limit to 1 response” and check access signed out. These Google settings are not controlled by AlignEd.
2. In Google Forms choose **Pre-fill form**. Put exactly `SESSION_TITLE` in the session title and **2 January 2000** in the date. Leave ratings/comments blank and copy the generated full responder link.
3. In a session’s **Feedback → Form connection settings**, paste this template and save. AlignEd substitutes that session’s title/date and generates its QR locally. The template is browser-local, not built into the public app, and is **not included in session JSON backups**. Keep a separate copy for a new browser/device.
4. Publish the Google Form yourself. Open the generated link while signed out and verify the pre-filled title/date and access **before sharing**. The learner can edit these fields. A QR is not an access check or proof of session identity. The objective prompts in AlignEd do not update the external form.
5. After teaching, use **Google Forms → Responses → Download responses (.csv)**. Import the full export from the same form using **Feedback → Import Google Forms CSV**. Choose the file or paste the CSV and check UK/US date order (ISO dates work in either mode).
6. Preview the matching title/date, excluded-session and duplicate counts and new response rows. Confirm they belong to this session, then append. Existing feedback and authored reflection are preserved. Same-title/same-date local sessions must be given distinct titles before collecting/importing feedback.
7. Review the feedback summary and evidence pack. Retain the original CSV as source evidence and use JSON backups for your local portfolio.

Supported CSV headings (case/whitespace and a trailing colon are tolerated):

```text
Timestamp
Session title:
Session date:
How clear was the session?
How useful was the session?
What was your confidence in the topic before the session?
What was your confidence in the topic after the session?
Any other comments?
```

Extra columns are not stored. Scores must be blank or whole numbers 1–5. Invalid rows block the import rather than silently dropping data. Exact repeated rows are skipped, including after JSON restore, while separate identical same-second submissions are retained. CSV has no stable Google response ID: edited answers, changed timestamps or a different export format are not automatically reconciled. Review such changes against existing feedback rather than treating duplicate detection as evidence verification. Use files below 2 MB.

For paper/verbal feedback, enter each response manually. The existing generic CSV route supports its usual short headers; Google-shaped CSVs are directed to the reviewed session-filtering route instead.

## Run locally

Requirements:

- Node.js
- npm

Install dependencies:

```bash
npm install
```

Start the local development server:

```bash
npm run dev
```

Then open the local URL printed by Vite. It is usually:

```text
http://127.0.0.1:5173/
```

The root is the public project page. Open `http://127.0.0.1:5173/app/` for the tracker.

## Build and verify

Run the full project check:

```bash
npm run check
```

This runs:

```bash
npm run lint
npm test
npm run build
```

Build output is written to `dist/`. The `dist/` directory is ignored by git.

## Data export and backup

Inside the app:

- Use “Download JSON backup” to save all sessions.
- Use “Import JSON backup” to restore a previous backup.
- Use the distinct **Reflect** stage to write and revise the Gibbs reflection.
- Use **Copy Markdown**, **Download Markdown** or **Print or save PDF** in the **Export** stage to save an evidence pack for one session.

The JSON backup is for app data. The Markdown export is for your portfolio evidence record. Legacy framework tags remain in saved sessions and JSON backups but are no longer shown in the editor or evidence pack. Advanced planning metadata is included in the pack only while Advanced mode is enabled; turning it off does not delete saved values or rewrite authored reflections.

## Project status

This is an early local-first tool published as a static browser app. It is not a multi-user service and has no accounts, backend, sharing or cloud sync.

The public host does not change the portfolio storage boundary: sessions remain in the current browser. The optional Google Forms route has a separate external response-storage boundary and must be checked with the form owner before a live collection trial.

## Licence

AlignEd is released under the MIT License. See `LICENSE`.

## Development notes

Main scripts:

```bash
npm run dev      # start Vite locally
npm run lint     # run oxlint
npm test         # run Vitest
npm run build    # create a production build
npm run check    # lint, test and build
```

AlignEd is built with React, TypeScript, Vite and Tailwind CSS. The interface uses local shadcn/ui component source under `src/components/ui/`; migration from the original custom CSS is intentionally incremental so each workflow slice remains tested.
