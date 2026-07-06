import Link from "next/link";

export function BrandLogo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5 shrink-0">
      <span
        className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#7b2ff7] to-[#d136f1] ${compact ? "h-8 w-8" : "h-10 w-10"}`}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className={compact ? "h-4 w-4" : "h-5 w-5"} fill="none">
          <path
            d="M4 18 L8 8 L12 14 L16 6 L20 16"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="6" r="1.5" fill="#00e5ff" />
        </svg>
        <span className="absolute inset-0 rounded-xl bg-cyan-400/20 blur-md opacity-0 group-hover:opacity-100 transition" />
      </span>
      <span className="leading-none">
        <span className={`block font-bold tracking-tight text-white ${compact ? "text-sm" : "text-base"}`}>
          MOTIVE<span className="brand-gradient-text">FX</span>
          <span className="text-cyan-400/90 text-[0.65em] align-super">.AI</span>
        </span>
        {!compact && (
          <span className="block text-[10px] uppercase tracking-[0.22em] text-brand-green mt-0.5">
            AI Market Intelligence
          </span>
        )}
      </span>
    </Link>
  );
}
