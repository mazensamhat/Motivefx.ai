import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "green";

const styles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-[#7b2ff7] via-[#a855f7] to-[#d136f1] text-white shadow-lg shadow-purple-900/30 hover:brightness-110",
  green: "bg-[#00e676] text-[#080a0c] shadow-lg shadow-emerald-900/30 hover:brightness-110 font-bold",
  secondary: "bg-white/10 text-white border border-white/15 hover:bg-white/15",
  ghost: "text-slate-300 hover:text-white hover:bg-white/5",
  outline: "border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/10",
};

export function Button({
  href,
  children,
  variant = "primary",
  size = "md",
  className = "",
  onClick,
}: {
  href?: string;
  children: ReactNode;
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
}) {
  const sizeClass =
    size === "lg" ? "px-6 py-3 text-base" : size === "sm" ? "px-3 py-1.5 text-sm" : "px-5 py-2.5 text-sm";
  const cls = `inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition ${sizeClass} ${styles[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" className={cls} onClick={onClick}>
      {children}
    </button>
  );
}
