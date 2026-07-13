import type { BrandModuleId } from "../brand/moduleBrand";
import { MODULE_BRAND } from "../brand/moduleBrand";
import { MOTIVEFX_LOGO_URL } from "../lib/brandAssets";

interface Props {
  module: BrandModuleId;
  size?: number;
  className?: string;
  dimmed?: boolean;
}

export const BRAND_TAGLINE = "AI-Powered Markets. Real-Time Edge.";

/** Official MotiveFX lockup — PNG brand asset. */
export function MotiveFxBrandLogo({
  className = "",
  compact = false,
  alt = "MotiveFX — Research Smarter. Move Faster.",
}: {
  className?: string;
  compact?: boolean;
  alt?: string;
}) {
  return (
    <img
      src={MOTIVEFX_LOGO_URL}
      alt={alt}
      className={`motivfx-brand-image ${compact ? "motivfx-brand-image-compact" : ""} ${className}`.trim()}
    />
  );
}

function ModuleSvg({
  module,
  accent,
  shadow,
}: {
  module: BrandModuleId;
  accent: string;
  shadow: string;
}) {
  switch (module) {
    case "home":
      return (
        <>
          <circle cx="50" cy="50" r="28" stroke={accent} strokeWidth="3" fill="none" opacity="0.4" />
          <circle cx="50" cy="50" r="14" stroke={shadow} strokeWidth="3" fill="none" />
          <circle cx="50" cy="50" r="5" fill={accent} className="logo-ai-core" />
          <line x1="50" y1="22" x2="50" y2="36" stroke={accent} strokeWidth="2" />
          <line x1="50" y1="64" x2="50" y2="78" stroke={accent} strokeWidth="2" />
          <line x1="22" y1="50" x2="36" y2="50" stroke={accent} strokeWidth="2" />
          <line x1="64" y1="50" x2="78" y2="50" stroke={accent} strokeWidth="2" />
        </>
      );
    case "trades":
      return (
        <>
          <g opacity="0.3">
            <line x1="25" y1="15" x2="25" y2="40" stroke={accent} strokeWidth="1.5" />
            <rect x="22" y="20" width="6" height="12" fill={accent} rx="1" />
            <line x1="45" y1="5" x2="45" y2="35" stroke={accent} strokeWidth="1.5" />
            <rect x="42" y="10" width="6" height="18" fill={accent} rx="1" />
            <line x1="65" y1="20" x2="65" y2="55" stroke={accent} strokeWidth="1.5" />
            <rect x="62" y="28" width="6" height="16" fill={accent} rx="1" />
          </g>
          <path d="M15,75 L15,45 L35,62 L55,30 L75,65 L75,75" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M15,55 L35,72 L55,40 L85,15" stroke={shadow} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M72,15 L85,15 L85,28" stroke={shadow} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="55" cy="40" r="7" fill={accent} className="logo-ai-core" />
          <circle cx="55" cy="40" r="1.5" fill="#080A0C" />
        </>
      );
    case "pinkslips":
      return (
        <>
          <g opacity="0.3">
            <path d="M10,80 L20,70 L30,85 L40,60 L50,90 L60,50 L70,80" stroke={accent} strokeWidth="1.5" fill="none" />
          </g>
          <path d="M15,75 L20,35 L40,65 L55,20 L75,55 L80,75" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M15,65 L40,80 L55,45 L85,15" stroke={shadow} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M72,15 L85,15 L85,28" stroke={shadow} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="55" cy="45" r="7" fill={accent} className="logo-ai-core" />
          <circle cx="55" cy="45" r="1.5" fill="#080A0C" />
        </>
      );
    case "crypto":
      return (
        <>
          <g opacity="0.4">
            <circle cx="20" cy="30" r="2.5" fill={accent} />
            <circle cx="80" cy="30" r="2.5" fill={shadow} />
            <line x1="20" y1="30" x2="40" y2="60" stroke={accent} strokeWidth="1" />
            <line x1="80" y1="30" x2="60" y2="60" stroke={shadow} strokeWidth="1" />
          </g>
          <path d="M15,75 L25,45 L40,65 L60,35 L75,55 L80,75" stroke={shadow} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M15,55 L40,75 L60,45 L85,15" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M72,15 L85,15 L85,28" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="60" cy="45" r="7" fill={accent} className="logo-ai-core" />
          <circle cx="60" cy="45" r="1.5" fill="#080A0C" />
        </>
      );
    case "betting":
      return (
        <>
          <g opacity="0.3">
            <path d="M10,80 A30,30 0 0,1 90,80" stroke={accent} strokeWidth="1.5" strokeDasharray="3,3" fill="none" />
          </g>
          <path d="M15,75 L30,45 L45,65 L60,35 L75,55 L85,75" stroke={shadow} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M15,60 L45,75 L60,45 L85,15" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M72,15 L85,15 L85,28" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="60" cy="45" r="7" fill={accent} className="logo-ai-core" />
          <circle cx="60" cy="45" r="1.5" fill="#080A0C" />
        </>
      );
    case "predictions":
      return (
        <>
          <g opacity="0.3">
            <ellipse cx="50" cy="50" rx="35" ry="15" stroke={accent} strokeWidth="1.5" fill="none" />
          </g>
          <path d="M15,75 L30,50 L45,68 L60,35 L75,55 L85,75" stroke={shadow} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M15,62 L45,78 L60,45 L85,15" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M72,15 L85,15 L85,28" stroke={accent} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="60" cy="45" r="7" fill={accent} className="logo-ai-core" />
          <circle cx="60" cy="45" r="1.5" fill="#080A0C" />
        </>
      );
  }
}

export function MotivFxLogo({ module, size = 40, className = "", dimmed = false }: Props) {
  const brand = MODULE_BRAND[module];

  return (
    <div
      className={`motivfx-logo-icon ${dimmed ? "motivfx-logo-icon-dim" : ""} ${className}`.trim()}
      style={{
        width: size,
        height: size,
        ["--logo-glow" as string]: brand.glow,
        ["--logo-accent" as string]: brand.accent,
      }}
    >
      <svg viewBox="0 0 100 100" fill="none" aria-hidden>
        <ModuleSvg module={module} accent={brand.accent} shadow={brand.shadow} />
      </svg>
    </div>
  );
}

interface WordmarkProps {
  module: BrandModuleId;
  showTagline?: boolean;
  compact?: boolean;
  badgeLabel?: string;
  hideBadge?: boolean;
}

export function MotivFxWordmark({
  module,
  showTagline = true,
  compact = false,
  badgeLabel,
  hideBadge = false,
}: WordmarkProps) {
  const brand = MODULE_BRAND[module];
  const label = badgeLabel ?? brand.name;

  return (
    <div className={`motivfx-wordmark ${compact ? "motivfx-wordmark-compact" : ""}`.trim()}>
      <div className="motivfx-wordmark-row">
        <span className="motivfx-wordmark-brand">
          MOTIVE{" "}
          <span className="motivfx-wordmark-fx brand-gradient-text">FX</span>
          <span className="motivfx-wordmark-ai">.AI</span>
        </span>
        {!hideBadge && (
          <span
            className="motivfx-module-badge"
            style={{ color: brand.accent, borderColor: `${brand.accent}40`, backgroundColor: `${brand.accent}10` }}
          >
            {label}
          </span>
        )}
      </div>
      {showTagline && (
        <p className="motivfx-wordmark-tagline">
          AI-Powered Markets. <span className="brand-gradient-text">Real-Time Edge.</span>
        </p>
      )}
    </div>
  );
}

interface LockupProps {
  module: BrandModuleId;
  logoSize?: number;
  compact?: boolean;
  badgeLabel?: string;
}

/** Logo + MotiveFX.AI + module badge — consistent brand row for cards */
export function ModuleBrandLockup({
  module,
  logoSize = 36,
  compact = true,
  badgeLabel,
}: LockupProps) {
  return (
    <div className={`module-brand-lockup ${compact ? "module-brand-lockup-compact" : ""}`.trim()}>
      <MotivFxLogo module={module} size={logoSize} />
      <MotivFxWordmark module={module} showTagline={false} compact={compact} badgeLabel={badgeLabel} />
    </div>
  );
}
