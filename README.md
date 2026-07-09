# AlignEd

A small browser app for planning teaching, capturing feedback and turning a taught session into a portfolio-ready evidence pack.

It is designed for clinicians who need to capture the essentials after teaching: what was taught, who attended, the intended objectives, feedback, reflection and evidence locations.

## What it does

- Logs a taught session quickly.
- Helps write simple learning objectives.
- Tracks the evidence you plan to attach: attendance, feedback, reflection, certificate or photo/artefact.
- Captures learner feedback manually or by CSV import.
- Summarises feedback using clarity, usefulness and pre/post confidence.
- Provides a Gibbs-style reflection scaffold.
- Exports a Markdown evidence pack that can be saved, printed or copied into a portfolio system.
- Stores data locally in your browser.

## What it does not do

- It does not upload data anywhere.
- It does not provide accounts, sharing or cloud sync.
- It does not collect feedback from phones by QR code in the current local build.
- It does not replace your judgement about what is appropriate portfolio evidence.
- It is not intended for patient-identifiable information.

## Privacy and safety

This app runs in the browser and stores sessions in browser `localStorage`. There is no backend in this version.

Do not enter patient-identifiable information. If you use examples, keep them generic and anonymised.

Use the JSON backup button before clearing browser data or moving to another machine.

## Feedback workflow

The recommended workflow for this build is:

1. Ask the learner questions verbally or on paper.
2. Type each response into the feedback page.
3. Use CSV import only if you already have spreadsheet data.
4. Review the generated feedback summary before exporting.

A future hosted version could use a QR code that points to a real form endpoint. The local app deliberately does not show a QR collection link because `localhost` cannot safely collect phone submissions by itself.

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
- Use “Copy Markdown export” or “Download .md” on the Reflection/export page to save an evidence pack for one session.

The JSON backup is for app data. The Markdown export is for your portfolio evidence record.

## Project status

This is an early local-first tool. It is suitable for testing the teaching-evidence workflow locally. It is not a hosted multi-user service.

Before publishing a public hosted version, add a real feedback collection route, clear privacy wording and a deployment-specific review of data handling.

## Development notes

Main scripts:

```bash
npm run dev      # start Vite locally
npm run lint     # run oxlint
npm test         # run Vitest
npm run build    # create a production build
npm run check    # lint, test and build
```

AlignEd is built with React, TypeScript and Vite.
