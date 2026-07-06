import { LEGAL_ENTITY } from "../legal/entity";

interface Props {
  compact?: boolean;
}

export function FinancialDisclaimer({ compact = false }: Props) {
  if (compact) {
    return (
      <p className="financial-disclaimer financial-disclaimer-compact">
        <strong>Not financial advice.</strong> {LEGAL_ENTITY.legalName} provides informational intel only — not
        investment, tax, legal, or gambling advice. We do not guarantee any financial result. AI output may be wrong.
        Consult a licensed professional before acting.
      </p>
    );
  }

  return (
    <div className="financial-disclaimer">
      <h2>Investment, betting &amp; informational disclaimer</h2>
      <p>
        Motive brand Services provide educational and informational content only. Nothing on the Services constitutes
        investment, legal, tax, accounting, financial-planning, or gambling advice. We are not a registered investment
        adviser, broker-dealer, portfolio manager (including under Canadian securities law), or gambling operator.
      </p>
      <p>
        <strong>No performance claims.</strong> We do not guarantee profits, successful trades, increased investment
        returns, successful betting outcomes, prediction accuracy, or any financial result.
      </p>
      <p>
        Trading stocks, options, crypto, and participating in betting or prediction markets involves substantial
        risk of loss. You may lose some or all of your capital.
      </p>
      <h3>Market data</h3>
      <p>
        Quotes, prices, news, odds, and market data may be delayed, incomplete, or unavailable. Verify information
        with official exchanges, sportsbooks, or data providers before acting.
      </p>
      <h3>AI-generated content</h3>
      <p>
        AI-generated analyses, summaries, signal-strength scores, scenario labels, and explanations may be incorrect,
        incomplete, inconsistent, hallucinated, or based on outdated information. The Service{" "}
        <strong>surfaces informational signals and educational scenarios</strong> — it does not recommend that you buy,
        sell, wager, or take any specific action.
      </p>
      <h3>Sports betting &amp; predictions</h3>
      <p>
        Users are solely responsible for ensuring participation in betting or prediction-related activities is lawful
        where they reside. Do not use the Services if prohibited from gambling or on a self-exclusion list. Simulation
        modules use virtual bankrolls only.
      </p>
      <p>
        You are solely responsible for your decisions and compliance with laws in your province, state, or country.
      </p>
    </div>
  );
}
