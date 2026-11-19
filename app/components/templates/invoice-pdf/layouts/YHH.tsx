import TemplateFrame, {
    templateCtx,
    type TemplateProps,
} from "../TemplateFrame";
import {
    ContactFooter,
    ItemsTable,
    TotalsBlock,
} from "../parts";

/**
 * Dates arrive in two shapes: a Date (live preview, straight from the form)
 * or a display string (PDF render, after the zod transform). Normalise both
 * to a short readable date instead of printing a Date object's toString().
 */
function displayDate(value: unknown): string {
    if (value instanceof Date && !isNaN(value.getTime())) {
        return value.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }
    if (typeof value === "string" && value) {
        if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                });
            }
        }
        return value;
    }
    return "";
}

/**
 * YHH — the Your Honest Handyman job invoice (template 14, the default in
 * this fork).
 *
 * A plain, official-looking job invoice for Build-A-Bear AP: company header,
 * bill-to, the job block (store, PO, mall, site address, completion date),
 * the work performed, then the three charges — Trip, Materials, Labor — and
 * the total. No tax/discount/shipping rows: YHH jobs don't have them.
 *
 * Reads the job fields when present; falls back to the generic invoice
 * fields so an invoice saved without a job still renders instead of
 * crashing. Photos are listed by name/count only — the full images go to
 * Andrew through the webhook, not into the PDF.
 */
export default function YHH(props: TemplateProps) {
    const ctx = templateCtx(props);
    const { data, labels, theme, scale } = ctx;
    const job = data.job;
    const photos = job?.photos ?? [];

    const addressLines = [
        data.sender.address,
        [data.sender.city, data.sender.zipCode].filter(Boolean).join(" "),
        data.sender.country,
    ].filter(Boolean);

    return (
        <TemplateFrame ctx={ctx}>
            <header className="flex items-start justify-between gap-6 border-b-2 pb-4"
                style={{ borderColor: theme.accentColor }}
            >
                <div>
                    <p
                        className={`${scale.heading} font-bold uppercase tracking-tight text-gray-900`}
                    >
                        {data.sender.name || "Your Honest Handyman Inc"}
                    </p>
                    {addressLines.map((line) => (
                        <p key={line} className={`${scale.body} text-gray-600`}>
                            {line}
                        </p>
                    ))}
                    {data.sender.email && (
                        <p className={`${scale.body} text-gray-600`}>
                            {data.sender.email}
                        </p>
                    )}
                    {data.sender.phone && (
                        <p className={`${scale.body} text-gray-600`}>
                            {data.sender.phone}
                        </p>
                    )}
                </div>
                <div className="text-end">
                    <div
                        className={`${scale.heading} font-semibold uppercase tracking-tight text-gray-900`}
                    >
                        Invoice
                    </div>
                    <p className={`${scale.body} mt-0.5 font-semibold tabular-nums text-gray-900`}>
                        #{data.details.invoiceNumber || "—"}
                    </p>
                    <p className={`${scale.body} mt-0.5 text-gray-500`}>
                        {displayDate(data.details.invoiceDate)}
                    </p>
                </div>
            </header>

            <div className={`${scale.sectionGap} grid gap-6 sm:grid-cols-2`}>
                <div>
                    <p
                        className={`${scale.label} font-semibold uppercase tracking-wider text-gray-500`}
                    >
                        {labels.billTo}
                    </p>
                    <p className={`${scale.body} mt-1 font-semibold text-gray-900`}>
                        {data.receiver.name}
                    </p>
                    {data.receiver.address && (
                        <p className={`${scale.body} text-gray-700`}>
                            {data.receiver.address}
                        </p>
                    )}
                    <p className={`${scale.body} text-gray-700`}>
                        {[data.receiver.city, data.receiver.zipCode]
                            .filter(Boolean)
                            .join(", ")}
                    </p>
                    {data.receiver.email && (
                        <p className={`${scale.body} text-gray-700`}>
                            {data.receiver.email}
                        </p>
                    )}
                    {data.receiver.phone && (
                        <p className={`${scale.body} text-gray-700`}>
                            {data.receiver.phone}
                        </p>
                    )}
                </div>

                <div>
                    <p
                        className={`${scale.label} font-semibold uppercase tracking-wider text-gray-500`}
                    >
                        Job
                    </p>
                    <div className={`${scale.body} mt-1 space-y-0.5 text-gray-700`}>
                        {job?.storeNumber && (
                            <p>
                                <span className="font-semibold text-gray-900">
                                    Store #:{" "}
                                </span>
                                {job.storeNumber}
                            </p>
                        )}
                        {job?.poNumber && (
                            <p>
                                <span className="font-semibold text-gray-900">
                                    PO #:{" "}
                                </span>
                                {job.poNumber}
                            </p>
                        )}
                        {job?.mallLocation && (
                            <p>
                                <span className="font-semibold text-gray-900">
                                    Location:{" "}
                                </span>
                                {job.mallLocation}
                            </p>
                        )}
                        {job?.streetAddress && <p>{job.streetAddress}</p>}
                        {job?.cityStateZip && <p>{job.cityStateZip}</p>}
                        {job?.completionDate && (
                            <p>
                                <span className="font-semibold text-gray-900">
                                    Completed:{" "}
                                </span>
                                {displayDate(job.completionDate)}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {job?.workPerformed && (
                <div className={scale.sectionGap}>
                    <p
                        className={`${scale.label} font-semibold uppercase tracking-wider text-gray-500`}
                    >
                        Work Performed
                    </p>
                    <p
                        className={`${scale.body} mt-1 whitespace-pre-line text-gray-800`}
                    >
                        {job.workPerformed}
                    </p>
                </div>
            )}

            <div className={scale.sectionGap}>
                <ItemsTable ctx={ctx} variant="filled" />
            </div>

            <div className={`${scale.sectionGap} flex justify-end`}>
                <div className="w-full sm:w-1/2">
                    <TotalsBlock ctx={ctx} emphasis="fill" />
                </div>
            </div>

            {photos.length > 0 && (
                <div className={scale.sectionGap}>
                    <p className={`${scale.label} text-gray-500`}>
                        Photos attached with this job ({photos.length}):
                    </p>
                    <p className={`${scale.body} mt-0.5 text-gray-600`}>
                        {photos.map((p) => p.name).join(", ")}
                    </p>
                </div>
            )}

            <div className={`${scale.sectionGap} flex items-end justify-between gap-6`}>
                <ContactFooter ctx={ctx} />
                <p className={`${scale.body} text-gray-500`}>
                    Thank you for your business.
                </p>
            </div>
        </TemplateFrame>
    );
}
