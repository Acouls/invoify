"use client";

import { useEffect, useRef, useState } from "react";

// RHF
import { useFormContext, useWatch } from "react-hook-form";

// ShadCn
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Components
import { BaseButton, FormInput } from "@/app/components";

// Contexts
import { useInvoiceContext } from "@/contexts/InvoiceContext";

// Helpers
import { computeJobTotal } from "@/lib/yhh";
import { YHH_MAX_PHOTO_BYTES } from "@/lib/schemas";

// Types
import type { InvoiceType, JobType } from "@/types";

// Icons
import { Camera, CheckCircle2, AlertTriangle, X } from "lucide-react";

/** Local date -> "YYYY-MM-DD" for <input type="date"> (local, not UTC). */
function toInputDate(value: unknown): string {
    if (value instanceof Date && !isNaN(value.getTime())) {
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, "0");
        const d = String(value.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return value.slice(0, 10);
    }
    return "";
}

function formatMoney(amount: number): string {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
    }).format(amount);
}

/**
 * Amount input display: the form holds 0 for "not entered yet", but the
 * field should look empty rather than showing 0.00 that John has to clear.
 */
function amountInputValue(value: unknown): string | number {
    if (value === 0 || value === "" || value === undefined || value === null) {
        return "";
    }
    return value as number;
}

/**
 * YHH Job Completion — the only form in this app.
 *
 * One scrolling column, big touch targets, no wizard steps: John is standing
 * in a store when he fills this in. The job fields are the source of truth;
 * the invoice fields Invoify needs (line items, PO number, dates, notes) are
 * derived from them by syncDerived() below, so the PDF preview and the totals
 * stay in step without John typing anything twice.
 *
 * Labels are hardcoded English: this is a one-user field app for John in
 * Texas, not the multi-language generator it was forked from.
 */
const JobForm = () => {
    const { control, setValue, getValues } = useFormContext<InvoiceType>();
    const { submission, downloadPdf, newInvoice } = useInvoiceContext();

    const job = useWatch({ control, name: "job" }) as JobType | undefined;
    const [photoError, setPhotoError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const trip = Number(job?.tripCharge || 0);
    const materials = Number(job?.materials || 0);
    const labor = Number(job?.labor || 0);
    const total = computeJobTotal({
        tripCharge: trip,
        materials,
        labor,
    });
    const photos = job?.photos ?? [];
    const photoBytes = photos.reduce((sum, p) => sum + (p.size || 0), 0);

    /**
     * Mirror the job into the invoice fields the PDF pipeline reads.
     * Runs on mount and whenever a job field changes. It only ever writes
     * details.*, never job.*, so it cannot loop on itself.
     */
    useEffect(() => {
        if (!job) return;

        const items = (
            [
                { name: "Trip Charge", amount: trip },
                { name: "Materials", amount: materials },
                { name: "Labor", amount: labor },
            ] as const
        )
            .filter((line) => line.amount > 0)
            .map((line) => ({
                name: line.name,
                description: "",
                quantity: 1,
                unitPrice: line.amount,
                total: line.amount,
            }));

        setValue("details.items", items, {
            shouldDirty: true,
            shouldValidate: false,
        });
        setValue("details.purchaseOrderNumber", job.poNumber ?? "", {
            shouldDirty: true,
            shouldValidate: false,
        });
        setValue("details.additionalNotes", job.workPerformed ?? "", {
            shouldDirty: true,
            shouldValidate: false,
        });

        // Runtime value is a Date (or a "YYYY-MM-DD" string from the date
        // input); the inferred type says string, so go through unknown.
        const rawDate: unknown = job.completionDate;
        const completion =
            rawDate instanceof Date
                ? rawDate
                : new Date(String(rawDate ?? ""));
        if (!isNaN(completion.getTime())) {
            setValue("details.invoiceDate", completion as unknown as string, {
                shouldDirty: true,
                shouldValidate: false,
            });
            setValue("details.dueDate", completion as unknown as string, {
                shouldDirty: true,
                shouldValidate: false,
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [job]);

    const addPhotos = (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setPhotoError(null);

        const current = getValues("job.photos") ?? [];
        let used = current.reduce((sum, p) => sum + (p.size || 0), 0);
        const additions: JobType["photos"] = [];

        const readFile = (file: File) =>
            new Promise<JobType["photos"][number] | null>((resolve) => {
                if (!file.type.startsWith("image/")) {
                    setPhotoError(`"${file.name}" is not an image — skipped.`);
                    return resolve(null);
                }
                if (used + file.size > YHH_MAX_PHOTO_BYTES) {
                    setPhotoError(
                        "Photos are capped at 10 MB total (same as the Tally form) — some were skipped."
                    );
                    return resolve(null);
                }
                used += file.size;
                const reader = new FileReader();
                reader.onload = () =>
                    resolve({
                        name: file.name,
                        size: file.size,
                        dataUrl: reader.result as string,
                    });
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
            });

        void Promise.all(Array.from(files).map(readFile)).then((results) => {
            const ok = results.filter(
                (r): r is NonNullable<typeof r> => r !== null
            );
            if (ok.length > 0) {
                setValue("job.photos", [...current, ...additions, ...ok], {
                    shouldDirty: true,
                    shouldValidate: false,
                });
            }
        });
    };

    const removePhoto = (index: number) => {
        const current = getValues("job.photos") ?? [];
        setValue(
            "job.photos",
            current.filter((_, i) => i !== index),
            { shouldDirty: true, shouldValidate: false }
        );
    };

    const invoiceNumber = useWatch({ control, name: "details.invoiceNumber" });

    return (
        <div className="@container min-w-0">
            <div className="mx-auto max-w-2xl">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <h1 className="text-xl font-semibold">YHH Job Completion</h1>
                    <span className="text-sm font-medium text-muted-foreground">
                        {invoiceNumber
                            ? `#${invoiceNumber}`
                            : "Invoice # assigned on submit"}
                    </span>
                </div>
                <p className="mb-5 text-sm text-muted-foreground">
                    Fill in the finished job and hit Submit Job — the app
                    builds the invoice PDF and sends it to Andrew.
                </p>

                {/* Test mode is a fact about this build, not a setting: while
                    no webhook is configured nothing leaves this phone. */}
                {submission.mode === "local-test" && (
                    <div className="mb-5 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                            <strong>Local test mode.</strong> No webhook is
                            configured yet, so submissions stay on this phone
                            with a DEMO invoice number. Nothing is sent to
                            Andrew.
                        </span>
                    </div>
                )}

                <div className="flex flex-col gap-4">
                    <FormInput
                        name="job.storeNumber"
                        label="Store Number"
                        placeholder="e.g. 258"
                        inputMode="numeric"
                        vertical
                    />
                    <FormInput
                        name="job.streetAddress"
                        label="Street Address"
                        placeholder="Store street address"
                        vertical
                    />
                    <FormInput
                        name="job.mallLocation"
                        label="Mall / Location"
                        placeholder="e.g. Ingram Park Mall"
                        vertical
                    />
                    <FormInput
                        name="job.cityStateZip"
                        label="City, State, ZIP"
                        placeholder="e.g. San Antonio, TX 78238"
                        vertical
                    />
                    <FormInput
                        name="job.poNumber"
                        label="PO Number"
                        placeholder="e.g. 110043298"
                        vertical
                    />

                    <FormField
                        control={control}
                        name="job.completionDate"
                        render={({ field }) => (
                            <FormItem className="w-full min-w-0">
                                <FormLabel>Completion Date:</FormLabel>
                                <FormControl>
                                    <Input
                                        type="date"
                                        value={toInputDate(field.value)}
                                        onChange={(e) =>
                                            field.onChange(e.target.value)
                                        }
                                        className="w-full"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={control}
                        name="job.workPerformed"
                        render={({ field }) => (
                            <FormItem className="w-full min-w-0">
                                <FormLabel>Work Performed:</FormLabel>
                                <FormControl>
                                    <Textarea
                                        {...field}
                                        value={field.value ?? ""}
                                        placeholder="What was done at the store?"
                                        rows={4}
                                        className="w-full"
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="rounded-md border border-border p-4">
                        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            Charges
                        </h2>
                        <div className="flex flex-col gap-4">
                            <FormField
                                control={control}
                                name="job.tripCharge"
                                render={({ field }) => (
                                    <FormItem className="w-full min-w-0">
                                        <FormLabel>Trip Charge:</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                inputMode="decimal"
                                                min={0}
                                                step="0.01"
                                                placeholder="0.00"
                                                value={amountInputValue(
                                                    field.value
                                                )}
                                                onChange={(e) =>
                                                    field.onChange(
                                                        e.target.value === ""
                                                            ? 0
                                                            : parseFloat(
                                                                  e.target.value
                                                              )
                                                    )
                                                }
                                                className="w-full"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name="job.materials"
                                render={({ field }) => (
                                    <FormItem className="w-full min-w-0">
                                        <FormLabel>Materials:</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                inputMode="decimal"
                                                min={0}
                                                step="0.01"
                                                placeholder="0.00"
                                                value={amountInputValue(
                                                    field.value
                                                )}
                                                onChange={(e) =>
                                                    field.onChange(
                                                        e.target.value === ""
                                                            ? 0
                                                            : parseFloat(
                                                                  e.target.value
                                                              )
                                                    )
                                                }
                                                className="w-full"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={control}
                                name="job.labor"
                                render={({ field }) => (
                                    <FormItem className="w-full min-w-0">
                                        <FormLabel>Labor:</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                inputMode="decimal"
                                                min={0}
                                                step="0.01"
                                                placeholder="0.00"
                                                value={amountInputValue(
                                                    field.value
                                                )}
                                                onChange={(e) =>
                                                    field.onChange(
                                                        e.target.value === ""
                                                            ? 0
                                                            : parseFloat(
                                                                  e.target.value
                                                              )
                                                    )
                                                }
                                                className="w-full"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                            <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                                Total
                            </span>
                            <span className="text-xl font-bold tabular-nums">
                                {formatMoney(total)}
                            </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                            Total is calculated — trip + materials + labor.
                        </p>
                    </div>

                    <div className="rounded-md border border-border p-4">
                        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            Photos
                        </h2>
                        <p className="mb-3 text-xs text-muted-foreground">
                            {photos.length === 0
                                ? "Add photos of the finished work (up to 10 MB total)."
                                : `${photos.length} photo${photos.length === 1 ? "" : "s"} — ${(
                                      photoBytes / 1024 / 1024
                                  ).toFixed(1)} MB of 10 MB.`}
                        </p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            capture="environment"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                addPhotos(e.target.files);
                                e.target.value = "";
                            }}
                        />
                        <BaseButton
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Camera className="h-4 w-4" />
                            Add Photos
                        </BaseButton>
                        {photoError && (
                            <p className="mt-2 text-sm text-destructive">
                                {photoError}
                            </p>
                        )}
                        {photos.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {photos.map((photo, i) => (
                                    <div
                                        key={`${photo.name}-${i}`}
                                        className="relative h-20 w-20 overflow-hidden rounded-md border border-border"
                                    >
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={photo.dataUrl}
                                            alt={photo.name}
                                            className="h-full w-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            aria-label={`Remove ${photo.name}`}
                                            onClick={() => removePhoto(i)}
                                            className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <details className="rounded-md border border-border p-4">
                        <summary className="cursor-pointer text-sm font-semibold">
                            Company details — fill in once, saved on this phone
                        </summary>
                        <p className="mb-3 mt-1 text-xs text-muted-foreground">
                            Your Honest Handyman&apos;s address and phone print
                            on the invoice. Fill them in once; the draft
                            autosave keeps them.
                        </p>
                        <div className="flex flex-col gap-4">
                            <FormInput
                                name="sender.name"
                                label="Company Name"
                                vertical
                            />
                            <FormInput
                                name="sender.address"
                                label="Street Address"
                                vertical
                            />
                            <FormInput
                                name="sender.city"
                                label="City"
                                vertical
                            />
                            <FormInput
                                name="sender.zipCode"
                                label="ZIP Code"
                                vertical
                            />
                            <FormInput
                                name="sender.country"
                                label="Country"
                                vertical
                            />
                            <FormInput
                                name="sender.email"
                                label="Email"
                                vertical
                            />
                            <FormInput
                                name="sender.phone"
                                label="Phone"
                                vertical
                            />
                        </div>
                    </details>

                    {submission.status === "sent" && (
                        <div className="flex items-start gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900">
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                                <strong>
                                    Job sent — invoice #
                                    {submission.invoiceNumber}.
                                </strong>{" "}
                                Andrew has it: {formatMoney(submission.total ?? 0)}{" "}
                                for Store #{job?.storeNumber}. The PDF is
                                downloaded below if you need a copy.
                            </span>
                        </div>
                    )}

                    {submission.status === "local-test" && (
                        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>
                                <strong>
                                    Local test saved — invoice #
                                    {submission.invoiceNumber}.
                                </strong>{" "}
                                Nothing was sent (no webhook yet). Total{" "}
                                {formatMoney(submission.total ?? 0)}. Use
                                Download PDF below for a copy.
                            </span>
                        </div>
                    )}

                    {submission.status === "error" && (
                        <div className="rounded-md border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
                            <strong>Couldn&apos;t send the job.</strong>{" "}
                            {submission.message ??
                                "The job is still on this phone — nothing was lost. Check connection and submit again."}
                        </div>
                    )}

                    {(submission.status === "sent" ||
                        submission.status === "local-test") && (
                        <div className="flex flex-wrap gap-2">
                            <BaseButton type="button" onClick={downloadPdf}>
                                Download PDF
                            </BaseButton>
                            <BaseButton
                                type="button"
                                variant="outline"
                                onClick={newInvoice}
                            >
                                Start New Job
                            </BaseButton>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JobForm;
