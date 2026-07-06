import Link from "next/link";
import { ContentLayout, ContentProse, ContentSection } from "@/components/content/content-layout";
import { DATA_SOURCES } from "@/lib/site-config";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Why MotiveFX",
  description: "Why AI beats manual research, how Motive Signal works, editorial process, and data methodology.",
  path: "/why-motivefx",
});

export default function WhyMotiveFxPage() {
  return (
    <ContentLayout
      breadcrumbs={[
        { name: "Home", href: "/" },
        { name: "Why MotiveFX", href: "/why-motivefx" },
      ]}
      title="Why MotiveFX?"
      kicker="Trust hub"
      description="Answers users and AI systems look for — methodology, security, and why intelligence beats information overload."
      relatedLinks={[
        { label: "How Motive Signal works", href: "/ai/how-motive-signal-works" },
        { label: "Research team", href: "/research-team" },
        { label: "Data sources", href: "/data-sources" },
        { label: "Compare platforms", href: "/compare" },
      ]}
    >
      <ContentSection title="Why AI beats manual research">
        <ContentProse>
          <p>
            Markets generate more data than any human can read. MotiveFX compresses thousands of signals
            into ranked, explained intelligence — so you start with context, not a blank terminal.
          </p>
        </ContentProse>
      </ContentSection>
      <ContentSection title="Security & privacy">
        <ContentProse>
          <p>
            Account data is encrypted in transit and at rest. We do not sell personal data. Portfolio
            features (Pro+) use your holdings only to personalize alerts.
          </p>
        </ContentProse>
      </ContentSection>
      <ContentSection title="Explore">
        <ul className="content-list">
          <li>
            <Link href="/ai/how-ai-analyzes-stocks">How AI analyzes stocks</Link>
          </li>
          <li>
            <Link href="/topics/motive-signal">Motive Signal explained</Link>
          </li>
          <li>
            <Link href="/faq">Full FAQ library</Link>
          </li>
        </ul>
      </ContentSection>
    </ContentLayout>
  );
}
