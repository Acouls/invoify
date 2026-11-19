// Components
import { InvoiceMain } from "@/app/components";

/**
 * YHH Job Completion — the whole app is the job form.
 *
 * The Invoify marketing content below the fold (LandingContent) and the
 * wizard provider are gone: this fork is a single-purpose field app for
 * John, not a public invoice generator.
 */
export default async function Home() {
    return (
        <>
            {/* `pb-28 xl:pb-10` clears the sticky MobileActionBar, which only
                renders below xl. */}
            <main className="container py-6 pb-28 md:py-10 xl:pb-10 shell:max-w-none shell:px-0 shell:py-0 shell:pb-0">
                <InvoiceMain />
            </main>
        </>
    );
}
