import Link from "next/link";
import { GLOSSARY_TERMS } from "@/content/glossary/terms";

export function GlossaryHub() {
  return (
    <ul className="hub-grid glossary-grid">
      {GLOSSARY_TERMS.map((t) => (
        <li key={t.slug}>
          <Link href={`/glossary/${t.slug}`} className="hub-card">
            <h2>{t.term}</h2>
            <p>{t.definition}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
