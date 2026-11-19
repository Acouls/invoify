// YHH job app — submit flow helpers.
//
// The invoice number is the load-bearing rule of this app: it comes from
// Andrew's sheet, never from the phone. Duplicate numbers already blocked
// Build-A-Bear payment once (INV#1667–1672), so the number is reserved from
// the webhook BEFORE the PDF is built, and the phone never invents one.
//
// While NEXT_PUBLIC_YHH_WEBHOOK_URL is unset the app runs in LOCAL TEST mode:
// the number is a clearly-marked DEMO number and nothing leaves the phone.
// That is the v1 state — Andrew tests it himself before any webhook exists.

import { YHH_DEMO_BASE_NUMBER, YHH_WEBHOOK_URL } from "@/lib/variables";

// Types
import type { JobType } from "@/types";

export type YhhSubmissionMode = "webhook" | "local-test";

export type ReservedNumber = {
    number: string;
    mode: YhhSubmissionMode;
};

/** Trip + Materials + Labor. The total is always computed, never typed. */
export function computeJobTotal(job: Pick<JobType, "tripCharge" | "materials" | "labor">): number {
    const total =
        Number(job.tripCharge || 0) +
        Number(job.materials || 0) +
        Number(job.labor || 0);
    // Money to the cent — avoids 0.1 + 0.2 style artefacts in the total.
    return Math.round(total * 100) / 100;
}

/**
 * Reserve the next invoice number from Andrew's sheet via the webhook.
 *
 * `localCount` is how many jobs this phone has already submitted locally, so
 * demo numbers still step forward (DEMO-1774, DEMO-1775, …) instead of
 * repeating. Demo numbers are never real invoice numbers.
 */
export async function reserveInvoiceNumber(localCount: number): Promise<ReservedNumber> {
    if (!YHH_WEBHOOK_URL) {
        return {
            number: `DEMO-${YHH_DEMO_BASE_NUMBER + localCount}`,
            mode: "local-test",
        };
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        // text/plain on purpose: Apps Script web apps do not answer CORS
        // preflights, and application/json would trigger one. The script
        // parses the body as JSON regardless of the content type.
        const response = await fetch(YHH_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ action: "reserveNumber" }),
            signal: controller.signal,
        }).finally(() => clearTimeout(timeout));

        if (!response.ok) throw new Error(`Webhook replied ${response.status}`);

        const data = (await response.json()) as { invoiceNumber?: unknown };
        if (typeof data.invoiceNumber !== "string" || !data.invoiceNumber.trim()) {
            throw new Error("Webhook did not return an invoice number");
        }

        return { number: data.invoiceNumber.trim(), mode: "webhook" };
    } catch (err) {
        // Never block a finished job on the network: fall back to a demo
        // number and say so plainly, so Andrew can re-number it from the
        // sheet instead of the job silently carrying a made-up number.
        console.error("Could not reserve invoice number:", err);
        return {
            number: `DEMO-${YHH_DEMO_BASE_NUMBER + localCount}`,
            mode: "local-test",
        };
    }
}

export type JobSubmission = {
    invoiceNumber: string;
    job: JobType;
    total: number;
    /** PDF bytes as base64 (no data: prefix). */
    pdfBase64: string;
    submittedAt: string;
};

/**
 * Send a finished job to Andrew through the webhook. Returns ok:false with a
 * plain-English reason instead of throwing, so the form can keep the job and
 * offer a retry instead of losing it.
 */
export async function submitJobToWebhook(
    submission: JobSubmission
): Promise<{ ok: boolean; error?: string }> {
    if (!YHH_WEBHOOK_URL) {
        return { ok: false, error: "No webhook configured — running in local test mode." };
    }

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        // text/plain on purpose: Apps Script web apps do not answer CORS
        // preflights, and application/json would trigger one.
        const response = await fetch(YHH_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify({ action: "submitJob", ...submission }),
            signal: controller.signal,
        }).finally(() => clearTimeout(timeout));

        if (!response.ok) {
            return { ok: false, error: `Webhook replied ${response.status}` };
        }

        const data = (await response.json()) as { ok?: unknown; error?: unknown };
        if (data.ok === false) {
            return {
                ok: false,
                error: typeof data.error === "string" ? data.error : "Webhook rejected the job",
            };
        }

        return { ok: true };
    } catch (err) {
        return {
            ok: false,
            error:
                err instanceof Error && err.name === "AbortError"
                    ? "Timed out talking to the sheet — the job is still on this phone, try again."
                    : "Could not reach the sheet — the job is still on this phone, try again.",
        };
    }
}

export function blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const result = reader.result as string;
            // Strip the "data:application/pdf;base64," prefix.
            resolve(result.slice(result.indexOf(",") + 1));
        };
        reader.onerror = () => reject(new Error("Could not read the PDF"));
        reader.readAsDataURL(blob);
    });
}
