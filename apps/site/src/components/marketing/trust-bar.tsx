import { TRUST_LOGOS } from "@/lib/marketing-copy";

export function TrustBar() {
  return (
    <section className="trust-bar" aria-label="Trusted by">
      <p>Trusted by 100,000+ investors and traders</p>
      <ul>
        {TRUST_LOGOS.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </section>
  );
}
