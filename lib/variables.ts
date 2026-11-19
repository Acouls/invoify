// Types
import { SignatureColor, SignatureFont } from "@/types";

/**
 * Environment
 */
export const ENV = process.env.NODE_ENV;

/**
 * Websites
 */
/**
 * Canonical origin, used for metadataBase, canonicals, hreflang, the sitemap
 * and JSON-LD.
 *
 * Read from the environment so a preview deployment or a future custom domain
 * does not need a code change — and, more importantly, so those deployments
 * stop advertising the production URL as their canonical. Falls back to the
 * current production host. No trailing slash.
 */
export const BASE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://invoify.vercel.app"
).replace(/\/$/, "");
export const AUTHOR_WEBSITE = "https://aliabb.vercel.app";
export const AUTHOR_GITHUB = "https://github.com/al1abb";

/**
 * API endpoints
 */
export const GENERATE_PDF_API = "/api/invoice/generate";
export const SEND_PDF_API = "/api/invoice/send";
export const EXPORT_INVOICE_API = "/api/invoice/export";
export const WARM_BROWSER_API = "/api/invoice/warm";

/**
 * External API endpoints
 */
export const CURRENCIES_API =
  "https://openexchangerates.org/api/currencies.json";

/**
 * Local storage
 */
export const LOCAL_STORAGE_INVOICE_DRAFT_KEY = "invoify:invoiceDraft";

/**
 * Trailing debounce for the draft autosave. Long enough that ordinary typing
 * never triggers a write, short enough that the "Saved" indicator settles while
 * the user is still looking at it.
 */
export const DRAFT_SAVE_DEBOUNCE_MS = 600;

/**
 * Tailwind
 */
export const TAILWIND_CDN =
  "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css";

/**
 * Google
 */
export const GOOGLE_SC_VERIFICATION = process.env.GOOGLE_SC_VERIFICATION;

/**
 * Nodemailer
 */
export const NODEMAILER_EMAIL = process.env.NODEMAILER_EMAIL;
export const NODEMAILER_PW = process.env.NODEMAILER_PW;

/**
 * I18N
 */
/**
 * Every locale the app ships, unordered. `LOCALES` below is the ordered list
 * that the switcher, the sitemap and next-intl's routing all read.
 */
const LOCALE_CATALOGUE = [
  { code: "en", name: "English" },
  { code: "az", name: "Azərbaycanca" },
  { code: "de", name: "Deutsch" },
  { code: "it", name: "Italiano" },
  { code: "es", name: "Español" },
  { code: "ca", name: "Català" },
  { code: "fr", name: "Français" },
  { code: "ar", name: "العربية" },
  { code: "pl", name: "Polish" },
  { code: "pt-BR", name: "Português (Brasil)" },
  { code: "tr", name: "Türkçe" },
  { code: "zh-CN", name: "简体中文" },
  { code: "ja", name: "日本語" },
  { code: "nb-NO", name: "Norwegian (bokmål)" },
  { code: "nn-NO", name: "Norwegian (nynorsk)" },
  // id.json and sr.json shipped in i18n/locales but were never registered
  // here, so those locales were unreachable and fell back to the default.
  { code: "id", name: "Bahasa Indonesia" },
  { code: "sr", name: "Српски" },
  { code: "he", name: "עברית" },
];

/**
 * Pinned to the top of the switcher by request. DEFAULT_LOCALE reads
 * LOCALES[0].code, so English must stay first of these two.
 */
const PINNED_LOCALES = ["en", "az"];

/**
 * The switcher shows each language under its own name, so that is what the
 * order is built from — sorting by English name would look arbitrary next to
 * "Deutsch" and "日本語".
 *
 * Intl.Collator's root order alphabetises the Latin-script names and then
 * groups the remaining scripts after them (Cyrillic, Hebrew, Arabic, then
 * Han/kana), which is a readable result for a mixed-script list. Computed once
 * at module load rather than per render.
 */
const localeCollator = new Intl.Collator("en", { sensitivity: "base" });

export const LOCALES = [
  ...PINNED_LOCALES.map(
    (code) => LOCALE_CATALOGUE.find((locale) => locale.code === code)!
  ),
  ...LOCALE_CATALOGUE.filter(
    (locale) => !PINNED_LOCALES.includes(locale.code)
  ).sort((a, b) => localeCollator.compare(a.name, b.name)),
];
export const DEFAULT_LOCALE = LOCALES[0].code;

/**
 * Writing direction per locale.
 *
 * Arabic has been in LOCALES since before this branch and has been rendering
 * right-to-left text inside a left-to-right layout the whole time — <html> was
 * emitted with `lang` but no `dir` at all. Hebrew joins it here, and both now
 * get a real direction.
 */
export const RTL_LOCALES = new Set(["ar", "he"]);

export const dirForLocale = (locale: string): "rtl" | "ltr" =>
  RTL_LOCALES.has(locale) ? "rtl" : "ltr";

/**
 * Signature variables
 */
export const SIGNATURE_COLORS: SignatureColor[] = [
  { name: "black", label: "Black", color: "rgb(0, 0, 0)" },
  { name: "dark blue", label: "Dark Blue", color: "rgb(0, 0, 128)" },
  {
    name: "crimson",
    label: "Crimson",
    color: "#DC143C",
  },
];

export const SIGNATURE_FONTS: SignatureFont[] = [
  {
    name: "Dancing Script",
    variable: "var(--font-dancing-script)",
  },
  { name: "Parisienne", variable: "var(--font-parisienne)" },
  {
    name: "Great Vibes",
    variable: "var(--font-great-vibes)",
  },
  {
    name: "Alex Brush",
    variable: "var(--font-alex-brush)",
  },
];

/**
 * Form date options
 */
export const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "long",
  day: "numeric",
};

export const SHORT_DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
};

/**
 * Form defaults
 */
/**
 * YHH — Your Honest Handyman job app.
 *
 * Webhook that receives finished jobs (Apps Script, see apps-script-webhook.gs
 * at the project root). Set NEXT_PUBLIC_YHH_WEBHOOK_URL in .env.local once
 * the script is deployed. While it is empty the app runs in LOCAL TEST mode:
 * the invoice number is a clearly-marked DEMO number and nothing is sent.
 */
export const YHH_WEBHOOK_URL =
    process.env.NEXT_PUBLIC_YHH_WEBHOOK_URL || "";

/** First invoice number after the 1773 already issued; the sheet owns the sequence. */
export const YHH_DEMO_BASE_NUMBER = 1774;

/** Contact for new-job notifications. Andrew's Gmail unless he says otherwise. */
export const YHH_NOTIFY_EMAIL = "couls8411@gmail.com";

export const FORM_DEFAULT_VALUES = {
  sender: {
    // Name and email are on record (yourhonesthandyman@gmail.com). The street
    // address / city / phone are NOT on file anywhere — Andrew fills them in
    // once in the form's "Company details" section; the draft autosave keeps
    // them on the phone afterwards. Nothing here is invented.
    name: "Your Honest Handyman Inc",
    address: "",
    zipCode: "",
    city: "",
    country: "",
    email: "yourhonesthandyman@gmail.com",
    phone: "",
    customInputs: [],
  },
  receiver: {
    // Build-A-Bear Workshop HQ, from the YHH email report (Blake Lauria,
    // Facilities Coordinator). AP email per Andrew's own contact list.
    name: "Build-A-Bear Workshop",
    address: "415 S. 18th St, Suite 200",
    zipCode: "63103",
    city: "St. Louis",
    country: "USA",
    email: "AcctsPay@buildabear.com",
    phone: "314-423-8000 x5467",
    customInputs: [],
  },
  details: {
    invoiceLogo: "",
    invoiceNumber: "",
    // Dates are Date objects at runtime (as the original date pickers set
    // them); the zod schema transforms them to display strings on submit,
    // so the inferred type says string. Cast, as readDraft does elsewhere.
    invoiceDate: new Date() as unknown as string,
    dueDate: new Date() as unknown as string,
    items: [
      {
        name: "",
        description: "",
        quantity: 0,
        unitPrice: 0,
        total: 0,
      },
    ],
    currency: "USD",
    language: "English",
    taxDetails: {
      amount: 0,
      amountType: "amount",
      taxID: "",
    },
    discountDetails: {
      amount: 0,
      amountType: "amount",
    },
    shippingDetails: {
      cost: 0,
      costType: "amount",
    },
    // No paymentInformation here on purpose: the schema requires all three
    // bank fields when the object is present, and YHH jobs have no payment
    // info. Upstream shipped empty strings for these, which can never
    // validate — leaving the object out entirely is the valid state.
    additionalNotes: "",
    paymentTerms: "Net 30",
    totalAmountInWords: "",
    pdfTemplate: 14,
    // `as const` so fontId/density keep their literal types and satisfy the
    // enums in ThemeSchema rather than widening to string.
    theme: {
      accentColor: "#1F2937",
      fontId: "plexSans",
      density: "comfortable",
    } as const,
  },
  job: {
    storeNumber: "",
    streetAddress: "",
    mallLocation: "",
    cityStateZip: "",
    poNumber: "",
    completionDate: new Date() as unknown as string,
    workPerformed: "",
    tripCharge: 0,
    materials: 0,
    labor: 0,
    photos: [],
  },
};

/**
 * ? DEV Only
 * Form auto fill values for testing
 */
export const FORM_FILL_VALUES = {
  sender: {
    name: "John Doe",
    address: "123 Main St",
    zipCode: "12345",
    city: "Anytown",
    country: "USA",
    email: "johndoe@example.com",
    phone: "123-456-7890",
  },
  receiver: {
    name: "Jane Smith",
    address: "456 Elm St",
    zipCode: "54321",
    city: "Other Town",
    country: "Canada",
    email: "janesmith@example.com",
    phone: "987-654-3210",
  },
  details: {
    invoiceLogo: "",
    invoiceNumber: "INV0001",
    invoiceDate: new Date(),
    dueDate: new Date(),
    items: [
      {
        name: "Product 1",
        description: "Description of Product 1",
        quantity: 4,
        unitPrice: 50,
        total: 200,
      },
      {
        name: "Product 2",
        description: "Description of Product 2",
        quantity: 5,
        unitPrice: 50,
        total: 250,
      },
      {
        name: "Product 3",
        description: "Description of Product 3",
        quantity: 5,
        unitPrice: 80,
        total: 400,
      },
    ],
    currency: "USD",
    language: "English",
    taxDetails: {
      amount: 15,
      amountType: "percentage",
      taxID: "987654321",
    },
    discountDetails: {
      amount: 5,
      amountType: "percentage",
    },
    shippingDetails: {
      cost: 5,
      costType: "percentage",
    },
    paymentInformation: {
      bankName: "Bank Inc.",
      accountName: "John Doe",
      accountNumber: "445566998877",
    },
    additionalNotes: "Thank you for your business",
    paymentTerms: "Net 30",
    signature: {
      data: "",
    },
    subTotal: "850",
    totalAmount: "850",
    totalAmountInWords: "Eight Hundred Fifty",
    pdfTemplate: 1,
    // `as const` so fontId/density keep their literal types and satisfy the
    // enums in ThemeSchema rather than widening to string.
    theme: {
      accentColor: "#4F46E5",
      fontId: "outfit",
      density: "comfortable",
    } as const,
  },
};
