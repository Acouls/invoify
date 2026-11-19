/**
 * YHH Job App — Google Apps Script webhook.
 *
 * Receives finished jobs from John's phone app and lands them where Andrew
 * lives: the Intake tab of the Google Sheet, a Drive folder with the PDF and
 * photos, and an email to Andrew.
 *
 * SETUP (Andrew, one time):
 * 1. Open the Google Sheet that holds the invoice tracker. Add a tab named
 *    exactly "Intake" (the script creates the header row itself).
 * 2. Extensions → Apps Script. Delete the default code, paste this file.
 * 3. Fill in CONFIG below: SPREADSHEET_ID (from the sheet's URL),
 *    DRIVE_FOLDER_NAME (created if it doesn't exist), NOTIFY_EMAIL.
 * 4. Deploy → New deployment → Web app. "Execute as: Me",
 *    "Who has access: Anyone". Copy the /exec URL.
 * 5. In the app's .env.local set NEXT_PUBLIC_YHH_WEBHOOK_URL to that URL
 *    and redeploy/restart the app.
 *
 * INVOICE NUMBERING — the load-bearing rule:
 * The number lives in Script Properties (YHH_LAST_INVOICE_NUMBER) and only
 * ever moves forward here, never on the phone. reserveNumber hands out the
 * next number and records it immediately, so two jobs can never share one.
 * Duplicate numbers already blocked Build-A-Bear payment once (INV#1667–
 * 1672) — that is what this prevents. Starting value 1773: the last invoice
 * issued before this app existed was 1773, so the first reserved number is
 * 1774. If the tracker disagrees, change LAST_INVOICE_NUMBER below BEFORE
 * the first real job, not after.
 *
 * Do NOT deploy this anywhere else and do NOT share the /exec URL publicly:
 * anyone with it could submit jobs. (v1 has no auth token; the URL itself is
 * the secret. If it ever leaks, redeploy to get a new URL.)
 */

// ---- CONFIG — fill these in before deploying ---------------------------
var CONFIG = {
  // ID from the tracker sheet's URL: /d/<THIS>/edit
  SPREADSHEET_ID: "PASTE_YOUR_SHEET_ID_HERE",
  INTAKE_TAB: "Intake",
  // Created in Andrew's Drive if it doesn't exist yet.
  DRIVE_FOLDER_NAME: "YHH Job Submissions",
  NOTIFY_EMAIL: "couls8411@gmail.com",
  // Last invoice number issued before this app. First reserved = 1774.
  LAST_INVOICE_NUMBER: 1773,
};

var INTAKE_HEADERS = [
  "Invoice #",
  "Submitted At",
  "Store #",
  "Street Address",
  "Mall / Location",
  "City, State, ZIP",
  "PO #",
  "Completion Date",
  "Work Performed",
  "Trip Charge",
  "Materials",
  "Labor",
  "Total",
  "PDF Link",
  "Photos",
];

// ---- Entry points --------------------------------------------------------

function doGet() {
  return json_({ ok: true, app: "yhh-job-webhook", actions: ["reserveNumber", "submitJob"] });
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents || "{}");
    if (body.action === "reserveNumber") return json_(reserveNumber_());
    if (body.action === "submitJob") return json_(submitJob_(body));
    return json_({ ok: false, error: "Unknown action: " + body.action });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

// ---- Actions ------------------------------------------------------------

/** Hand out the next invoice number and record it immediately. */
function reserveNumber_() {
  var props = PropertiesService.getScriptProperties();
  var last = Number(props.getProperty("YHH_LAST_INVOICE_NUMBER"));
  if (!last || isNaN(last)) last = CONFIG.LAST_INVOICE_NUMBER;
  var next = last + 1;
  props.setProperty("YHH_LAST_INVOICE_NUMBER", String(next));
  return { ok: true, invoiceNumber: String(next) };
}

/**
 * Land a finished job: Intake row + PDF/photos in Drive + email to Andrew.
 * Expects: invoiceNumber, job {storeNumber, streetAddress, mallLocation,
 * cityStateZip, poNumber, completionDate, workPerformed, tripCharge,
 * materials, labor, photos[{name, size, dataUrl}]}, total, pdfBase64,
 * submittedAt.
 */
function submitJob_(body) {
  var job = body.job || {};
  var invoiceNumber = String(body.invoiceNumber || "");
  if (!invoiceNumber) throw new Error("Missing invoiceNumber");
  if (!job.storeNumber) throw new Error("Missing storeNumber");

  var sheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID).getSheetByName(CONFIG.INTAKE_TAB);
  if (!sheet) throw new Error('No tab named "' + CONFIG.INTAKE_TAB + '" in the sheet');

  var folder = getOrCreateFolder_(CONFIG.DRIVE_FOLDER_NAME);

  // PDF
  var pdfBlob = Utilities.newBlob(
    Utilities.base64Decode(body.pdfBase64 || ""),
    "application/pdf",
    "INV-" + invoiceNumber + " Store " + job.storeNumber + " PO " + (job.poNumber || "") + ".pdf"
  );
  var pdfFile = folder.createFile(pdfBlob);

  // Photos
  var photoLinks = [];
  (job.photos || []).forEach(function (photo, i) {
    if (!photo.dataUrl) return;
    var base64 = String(photo.dataUrl).split(",").pop();
    var mime = "image/jpeg";
    var match = String(photo.dataUrl).match(/^data:(image\/[a-z0-9.+-]+);base64,/i);
    if (match) mime = match[1];
    var file = folder.createFile(
      Utilities.newBlob(
        Utilities.base64Decode(base64),
        mime,
        "INV-" + invoiceNumber + " photo " + (i + 1) + " " + (photo.name || "photo")
      )
    );
    photoLinks.push(file.getUrl());
  });

  // Intake row
  if (sheet.getLastRow() === 0) sheet.appendRow(INTAKE_HEADERS);
  sheet.appendRow([
    invoiceNumber,
    body.submittedAt || new Date().toISOString(),
    job.storeNumber,
    job.streetAddress || "",
    job.mallLocation || "",
    job.cityStateZip || "",
    job.poNumber || "",
    job.completionDate || "",
    job.workPerformed || "",
    Number(job.tripCharge || 0),
    Number(job.materials || 0),
    Number(job.labor || 0),
    Number(body.total || 0),
    pdfFile.getUrl(),
    photoLinks.join("\n"),
  ]);

  // Email Andrew
  var total = Number(body.total || 0).toFixed(2);
  MailApp.sendEmail({
    to: CONFIG.NOTIFY_EMAIL,
    subject: "New YHH job — Invoice #" + invoiceNumber + " Store " + job.storeNumber + " ($" + total + ")",
    body:
      "New job from John:\n\n" +
      "Invoice #: " + invoiceNumber + "\n" +
      "Store #: " + job.storeNumber + "\n" +
      "PO #: " + (job.poNumber || "") + "\n" +
      "Location: " + (job.mallLocation || "") + " — " + (job.streetAddress || "") + ", " + (job.cityStateZip || "") + "\n" +
      "Completed: " + (job.completionDate || "") + "\n" +
      "Work: " + (job.workPerformed || "") + "\n\n" +
      "Trip: $" + Number(job.tripCharge || 0).toFixed(2) + "\n" +
      "Materials: $" + Number(job.materials || 0).toFixed(2) + "\n" +
      "Labor: $" + Number(job.labor || 0).toFixed(2) + "\n" +
      "Total: $" + total + "\n\n" +
      "PDF: " + pdfFile.getUrl() + "\n" +
      (photoLinks.length ? "Photos: " + photoLinks.join("\n") + "\n" : "Photos: none\n"),
  });

  return { ok: true, invoiceNumber: invoiceNumber, pdfUrl: pdfFile.getUrl() };
}

// ---- Helpers ------------------------------------------------------------

function getOrCreateFolder_(name) {
  var folders = DriveApp.getFoldersByName(name);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(name);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
