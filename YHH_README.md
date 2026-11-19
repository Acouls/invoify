# YHH Job App — v1 (test build)

John's phone app for finished Build-A-Bear jobs. Forked from Invoify
(`al1abb/invoify`, MIT — license kept in `LICENSE`). Andrew is the system
administrator; John does data entry only. **This is a test build for Andrew
only — John does not touch it yet, and the Tally form stays in place.**

## What it does

1. John fills in one finished job: Store Number, Street Address,
   Mall/Location, City/State/ZIP, PO Number, Completion Date, Work Performed,
   Trip Charge, Materials, Labor (total auto-calculated), Photos (up to 10 MB).
2. On **Submit Job** the app reserves the invoice number from Andrew's sheet,
   builds the invoice PDF with that number, and sends the job (fields + PDF +
   photos) to Andrew through a Google Apps Script webhook → Intake tab in the
   Google Sheet + Drive folder + email.
3. John sees a confirmation with the invoice number and total.

## What it does NOT do (v1)

- No tracker logic, no payment tracking, no quotes, no client portal.
- The Master Invoice Tracker stays in the Google Sheet where it already lives.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:3000 — or:
npm run build    # production build
npm start        # serve the production build on :3000
```

## Local test mode (current state)

No webhook is configured yet (`NEXT_PUBLIC_YHH_WEBHOOK_URL` is empty), so the
app runs in **local test mode**: submissions get a clearly-marked DEMO invoice
number (`DEMO-1774`, `DEMO-1775`, …) and nothing leaves the phone. The PDF
still builds and downloads, and the job is saved on the phone. That is the
intended v1 state — Andrew tests it himself first.

## Going live (when v1 proves itself)

1. Deploy `apps-script-webhook.gs` (steps in the file header): Sheet ID,
   Intake tab, Drive folder, notify email. Note the starting number — the
   last real invoice was 1773, so the first reserved number is 1774.
2. Copy `.env.local.example` to `.env.local` and set
   `NEXT_PUBLIC_YHH_WEBHOOK_URL` to the script's `/exec` URL.
3. `npm run build && npm start` (or deploy to Vercel — free tier).
4. Test with a fake job first (Store #999, PO 110000000), then one real job
   with the old email flow as backup. Two clean real jobs → decide whether
   to retire the Tally form.

## Setup still needed before John uses it

- **Company details**: Your Honest Handyman's street address / city / phone
  are not on file anywhere, so they are NOT invented here. Fill them in once
  in the form's "Company details" section — the draft autosave keeps them on
  the phone. They print on the invoice.
- **GitHub account**: to hold the fork under Andrew's name (this copy is
  local-only; nothing has been pushed).
- **Vercel deploy**: free tier, so John can add it to his home screen.

## Files changed from upstream Invoify

- `lib/schemas.ts` — added `JobDetailsSchema` + `job` on the invoice;
  `invoiceNumber` may start empty (reserved at submit).
- `lib/variables.ts` — YHH sender/receiver defaults (Build-A-Bear HQ address
  from the YHH email report), YHH template (14), webhook URL, demo base 1774.
- `lib/yhh.ts` — NEW: total math, number reservation, webhook submit.
- `app/components/invoice/form/JobForm.tsx` — NEW: the job form.
- `app/components/invoice/InvoiceForm.tsx` — renders JobForm (wizard gone).
- `app/components/templates/invoice-pdf/layouts/YHH.tsx` — NEW: template 14.
- `app/components/templates/invoice-pdf/registry.ts` — registered template 14.
- `contexts/InvoiceContext.tsx` — submit flow: reserve → PDF → send →
  confirm; `generatePdfBlob` split out of `generatePdf`; `newInvoice`
  preserves the sender (company) block; empty `paymentInformation`
  removed from defaults (it can never validate blank — see below).
- `app/[locale]/page.tsx` — marketing content + wizard provider removed.
- `app/components/layout/BaseNavbar.tsx` — "YHH Job App / Test build".
- `i18n/locales/en.json` — submit button now reads "Submit Job".
- `apps-script-webhook.gs` — NEW: the Apps Script webhook (not deployed).
- `.env.local.example` — NEW.

## What was verified (Nov 19, 2026, fake jobs, Puppeteer + Chromium)

- Baseline upstream build passed before any changes; `npx tsc --noEmit`
  clean and production build succeeds after the changes.
- API test: POST `/api/invoice/generate` with the fake job (Store #999,
  PO 110000000, trip $85 + materials $120.50 + labor $240) → 200,
  1-page PDF (59,152 bytes); `pdftotext` confirms #DEMO-1774, Build-A-Bear
  bill-to, Store #999, PO #110000000, all three charge lines, Subtotal /
  TOTAL $445.50.
- Browser end-to-end (mobile viewport 390×844): filled the real form,
  total live-updated to $445.50, submitted → "Local test saved — invoice
  #DEMO-1774" confirmation + Download PDF / Start New Job buttons.
- Second submit in the same session: Store #998 → **DEMO-1775** (number
  steps forward by exactly one from local saves), total $175.00. Company
  details survive "Start New Job" — John doesn't retype his address.
- Screenshots: `/tmp/yhh-e2e/01-filled.png`, `/tmp/yhh-e2e/02-submitted.png`.

## Fixes found during verification

- **Submit was blocked by upstream's empty `paymentInformation` defaults.**
  Upstream ships `paymentInformation: {bankName: "", ...}` and the schema
  requires all three fields non-empty, so the form could never validate
  with them blank. YHH jobs have no payment info, so the object is omitted
  from `FORM_DEFAULT_VALUES` entirely (it's optional in the schema). The
  PDF's payment block already hides itself when absent.
- **`newInvoice` used to wipe the company details** — fixed to preserve
  the sender block across jobs (see verification above).

- Photos in the draft autosave can exceed browser storage quota (up to 10 MB
  of base64); if that happens the draft just doesn't report "Saved" — the
  job itself is unaffected.
- No offline queue yet: if the webhook is unreachable at submit, the job
  stays on the phone with an error and a retry — it is never silently lost,
  but it is not auto-retried.
- The webhook URL is the only secret (no auth token in v1). If it leaks,
  redeploy the script to get a new URL.
