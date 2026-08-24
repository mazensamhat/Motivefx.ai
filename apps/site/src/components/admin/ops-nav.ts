import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  Brain,
  DollarSign,
  ExternalLink,
  Gauge,
  Layers,
  Lock,
  Megaphone,
  MessageSquare,
  Radio,
  Rocket,
  Settings,
  Shield,
  Users,
  Zap,
} from "lucide-react";
import { MOTIVELIFE_OPS_URL } from "@/lib/ops-links";

export type OpsNavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  external?: boolean;
  stub?: boolean;
};

export const OPS_NAV: OpsNavItem[] = [
  {
    id: "overview",
    label: "Overview",
    href: "/admin/overview",
    icon: Gauge,
    description: "Executive cockpit",
  },
  {
    id: "market-truth",
    label: "Market Truth",
    href: "/admin/market-truth",
    icon: Shield,
    description: "Evidence ledger & G1 gates",
  },
  {
    id: "signals",
    label: "Signals",
    href: "/admin/signals",
    icon: Zap,
    description: "Motive Signal ops",
  },
  {
    id: "providers",
    label: "Providers",
    href: "/admin/providers",
    icon: Radio,
    description: "Feed health & kill switches",
  },
  {
    id: "users",
    label: "Users",
    href: "/admin/users",
    icon: Users,
    description: "Accounts & signups",
  },
  {
    id: "revenue",
    label: "Revenue",
    href: "/admin/revenue",
    icon: DollarSign,
    description: "Financial analytics",
  },
  {
    id: "product",
    label: "Product",
    href: "/admin/product",
    icon: Layers,
    description: "Modules & utilization",
  },
  {
    id: "growth",
    label: "Growth",
    href: MOTIVELIFE_OPS_URL,
    icon: Megaphone,
    description: "Motive Life Marketing Studio",
    external: true,
  },
  {
    id: "security",
    label: "Security",
    href: "/admin/security",
    icon: Lock,
    description: "Auth & entitlements",
  },
  {
    id: "ai-costs",
    label: "AI & Costs",
    href: "/admin/ai-costs",
    icon: Brain,
    description: "Token economics",
  },
  {
    id: "feedback",
    label: "Feedback",
    href: "/admin/feedback",
    icon: MessageSquare,
    description: "User feedback inbox",
  },
  {
    id: "releases",
    label: "Releases",
    href: "/admin/releases",
    icon: Rocket,
    description: "G1–G7 gate tracker",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
    description: "Ops configuration",
  },
];

export const OPS_SECONDARY_NAV: OpsNavItem[] = [
  {
    id: "legacy",
    label: "Classic dashboard",
    href: "/admin/legacy",
    icon: BarChart3,
    description: "Full scroll view",
  },
  {
    id: "terminal",
    label: "Terminal",
    href: "/app",
    icon: Activity,
    description: "Back to trading desk",
  },
];
