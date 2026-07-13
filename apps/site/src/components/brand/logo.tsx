import Image from "next/image";
import Link from "next/link";

const LOGO_SRC = "/brand/motivefx-logo.png";

export function BrandLogo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="brand-logo-link shrink-0">
      <Image
        src={LOGO_SRC}
        alt="MotiveFX — Research Smarter. Move Faster."
        width={640}
        height={640}
        priority
        className={`brand-logo-img ${compact ? "brand-logo-img-compact" : ""}`.trim()}
      />
    </Link>
  );
}
