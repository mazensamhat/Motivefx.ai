import Link from "next/link";
import { TRUST_LOGOS } from "@/lib/marketing-copy";

export function TrustBar() {
  return (
    <section className="trust-bar" aria-label="Research coverage">
      <p>
        Built for multi-market research —{" "}
        <Link href="/data-sources" className="underline-offset-2 hover:underline">
          see our data sources
        </Link>
      </p>
      <ul>
        {TRUST_LOGOS.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
    </section>
  );
}
