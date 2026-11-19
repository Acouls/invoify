"use client";

// Components
import { JobForm } from "@/app/components";

/**
 * YHH Job Completion form.
 *
 * This fork is a single-purpose field app, not the multi-step invoice
 * generator it came from: one scrolling column (see JobForm), no wizard.
 * The form element and submit handling live in InvoiceMain, which calls
 * InvoiceContext.onFormSubmit — the YHH flow (reserve number, build PDF,
 * send to Andrew) — so this component is only the fields.
 */
const InvoiceForm = () => {
    return (
        <div className="min-w-0 shell:flex shell:min-h-0 shell:flex-col shell:border-e shell:border-border shell:bg-card">
            <div className="mx-auto max-w-2xl shell:min-h-0 shell:overflow-y-auto shell:p-5 xl:mx-0">
                <JobForm />
            </div>
        </div>
    );
};

export default InvoiceForm;
