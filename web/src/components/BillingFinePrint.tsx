import { SITE_EMBED } from "../lib/embed";

interface Props {
  annualPrice?: number;
  className?: string;
  /** One-line summary for mobile — full terms on the legal page. */
  compact?: boolean;
}

function legalPage(page: string) {
  return SITE_EMBED ? `/terminal/?page=${page}` : `/?page=${page}`;
}

export function BillingFinePrint({
  annualPrice = 799,
  className = "",
  compact = false,
}: Props) {
  if (compact) {
    return (
      <p className={`billing-fine-print billing-fine-print-compact ${className}`.trim()}>
        Monthly plans cancel anytime (end of period). Annual All-Access (${annualPrice}/yr)
        non-refundable.{" "}
        <a href={legalPage("terms")} className="disclaimer-more-link">
          Billing terms
        </a>
      </p>
    );
  }

  return (
    <p className={`billing-fine-print ${className}`.trim()}>
      Monthly module and bundle subscriptions (${29}/mo per module, ${109}/mo bundle) may be cancelled
      at any time; cancellation takes effect at the end of the current billing period and partial
      months are not refunded. Annual All-Access (${annualPrice}/yr) is billed once per year, grants
      access to all modules for twelve months, and is non-refundable. No refunds are issued for unused
      time on annual plans. By subscribing you agree to these billing terms.
    </p>
  );
}
