interface Props {
  annualPrice?: number;
  className?: string;
}

export function BillingFinePrint({ annualPrice = 799, className = "" }: Props) {
  return (
    <p className={`billing-fine-print ${className}`.trim()}>
      Monthly module and bundle subscriptions (${29}/mo per module, ${109}/mo bundle) may be cancelled
      at any time; cancellation takes effect at the end of the current billing period and partial months
      are not refunded. Annual All-Access (${annualPrice}/yr) is billed once per year, grants access to
      all modules for twelve months, and is non-refundable. No refunds are issued for unused time on
      annual plans. By subscribing you agree to these billing terms.
    </p>
  );
}
