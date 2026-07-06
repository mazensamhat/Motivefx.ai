const LEGAL_LINKS = [
  { page: "privacy", label: "Privacy Policy" },
  { page: "terms", label: "Terms of Service" },
  { page: "data-deletion", label: "Data Deletion" },
  { page: "cookies", label: "Cookie Policy" },
  { page: "disclaimer", label: "Financial Disclaimer" },
] as const;

export function LegalNav({ active }: { active?: string }) {
  return (
    <nav className="legal-nav" aria-label="Legal documents">
      {LEGAL_LINKS.map((l) => (
        <a
          key={l.page}
          href={`/?page=${l.page}`}
          className={active === l.page ? "active" : undefined}
          aria-current={active === l.page ? "page" : undefined}
        >
          {l.label}
        </a>
      ))}
    </nav>
  );
}

export { LEGAL_LINKS };
