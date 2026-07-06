import { ReactNode } from "react";
import { LegalNav } from "./LegalNav";

interface Props {
  title: string;
  activePage?: string;
  children: ReactNode;
}

export function LegalPageLayout({ title, activePage, children }: Props) {
  return (
    <div className="legal-page">
      <header className="legal-page-header">
        <a href="/" className="legal-back">← Back to MotiveFX.AI</a>
        <h1>{title}</h1>
        {activePage && <LegalNav active={activePage} />}
        {activePage && (
          <p className="legal-live-notice">
            <strong>Effective July 4, 2026.</strong> These documents govern Motive brand Services and may be updated
            from time to time.{" "}
            <a href="/legal-documents.html" target="_blank" rel="noreferrer">
              Complete legal pack
            </a>
          </p>
        )}
      </header>
      <article className="legal-page-body glass-panel">{children}</article>
    </div>
  );
}
