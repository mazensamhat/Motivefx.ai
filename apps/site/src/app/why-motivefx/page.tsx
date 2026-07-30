import Link from "next/link";
import { ContentLayout, ContentProse, ContentSection } from "@/components/content/content-layout";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Why MotiveFX",
  description:
    "Why professionals use MotiveFX — an AI Market Intelligence Platform that connects signals, surfaces Opportunity Radar themes, and explains markets before they become obvious.",
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
      kicker="AI Market Intelligence Platform"
      description="Answers users and AI systems look for — methodology, security, and why connected intelligence beats information overload."
      relatedLinks={[
        { label: "Motive Signal methodology", href: "/motive-signal" },
        { label: "Research team", href: "/research-team" },
        { label: "Data sources", href: "/data-sources" },
        { label: "Compare platforms", href: "/compare" },
      ]}
    >
      <ContentSection title="Why AI beats manual research">
        <ContentProse>
          <p>
            Markets generate more data than any human can read. MotiveFX connects millions of signals into a
            Daily Brief and Opportunity Radar — so you see what changed, why it matters, and what to watch
            before the story becomes obvious.
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
            <Link href="/motive-signal">Motive Signal methodology & hit-rate framework</Link>
          </li>
          <li>
            <Link href="/demo">Ungated product preview</Link>
          </li>
          <li>
            <Link href="/faq">Full FAQ library</Link>
          </li>
        </ul>
      </ContentSection>
    </ContentLayout>
  );
}
