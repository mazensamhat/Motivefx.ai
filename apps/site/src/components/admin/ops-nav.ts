import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  Briefcase,
  DollarSign,
  Dna,
  ExternalLink,
  FileText,
  Gauge,
  GitBranch,
  Layers,
  Lock,
  Megaphone,
  MessageSquare,
  Network,
  Radio,
  Radar,
  Rocket,
  ScrollText,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { MOTIVELIFE_OPS_URL, MOTIVEPULSE_OPS_URL } from "@/lib/ops-links";

export type OpsNavItem = {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
  external?: boolean;
  stub?: boolean;
  badge?: string;
};

export type OpsNavGroup = {
  id: string;
  label: string;
  items: OpsNavItem[];
};

/** Grouped navigation — Ops Master Plan v1.0 §10. Existing routes kept; new = stub. */
export const OPS_NAV_GROUPS: OpsNavGroup[] = [
  {
    id: "command",
    label: "Command",
    items: [
      {
        id: "overview",
        label: "Overview",
        href: "/admin/overview",
        icon: Gauge,
        description: "What requires attention",
      },
      {
        id: "live-ops",
        label: "Live Operations",
        href: "/admin/live-ops",
        icon: Activity,
        description: "Live event feed",
      },
      {
        id: "incidents",
        label: "Alerts & Incidents",
        href: "/admin/incidents",
        icon: AlertTriangle,
        description: "Incident desk",
        stub: true,
      },
    ],
  },
  {
    id: "market-intelligence",
    label: "Market Intelligence",
    items: [
      {
        id: "market-truth",
        label: "Market Truth",
        href: "/admin/market-truth",
        icon: Shield,
        description: "Evidence ledger & G1 gates",
      },
      {
        id: "signals",
        label: "Motive Signals",
        href: "/admin/signals",
        icon: Zap,
        description: "Motive Signal ops",
      },
      {
        id: "opportunity-radar",
        label: "Opportunity Radar",
        href: "/admin/opportunity-radar",
        icon: Radar,
        description: "Radar quality ops",
        stub: true,
      },
      {
        id: "signal-graph",
        label: "Signal Graph",
        href: "/admin/signal-graph",
        icon: Network,
        description: "Relationship quality",
        stub: true,
      },
      {
        id: "market-dna",
        label: "Market DNA",
        href: "/admin/market-dna",
        icon: Dna,
        description: "DNA drift & profiles",
        stub: true,
      },
      {
        id: "daily-brief",
        label: "Daily Brief",
        href: "/admin/daily-brief",
        icon: ScrollText,
        description: "Brief generation ops",
        stub: true,
      },
      {
        id: "evidence-quality",
        label: "Evidence Quality",
        href: "/admin/evidence-quality",
        icon: GitBranch,
        description: "Evidence stack ops",
        stub: true,
      },
    ],
  },
  {
    id: "market-data",
    label: "Market Data",
    items: [
      {
        id: "providers",
        label: "Providers",
        href: "/admin/providers",
        icon: Radio,
        description: "Feed health & kill switches",
      },
    ],
  },
  {
    id: "product",
    label: "Product",
    items: [
      {
        id: "product",
        label: "Product Analytics",
        href: "/admin/product",
        icon: Layers,
        description: "Modules & utilization",
      },
      {
        id: "users",
        label: "Users",
        href: "/admin/users",
        icon: Users,
        description: "Accounts & signups",
      },
      {
        id: "feedback",
        label: "Feedback",
        href: "/admin/feedback",
        icon: MessageSquare,
        description: "User feedback inbox",
      },
    ],
  },
  {
    id: "ai",
    label: "AI",
    items: [
      {
        id: "ai-costs",
        label: "AI Costs",
        href: "/admin/ai-costs",
        icon: Brain,
        description: "Token economics",
      },
    ],
  },
  {
    id: "business",
    label: "Business",
    items: [
      {
        id: "revenue",
        label: "Revenue",
        href: "/admin/revenue",
        icon: DollarSign,
        description: "Financial analytics",
      },
      {
        id: "growth",
        label: "Growth",
        href: MOTIVELIFE_OPS_URL,
        icon: Megaphone,
        description: "Motive Life Marketing Studio",
        external: true,
        badge: "New",
      },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    items: [
      {
        id: "releases",
        label: "Releases",
        href: "/admin/releases",
        icon: Rocket,
        description: "G1–G7 gate tracker",
      },
    ],
  },
  {
    id: "governance",
    label: "Governance",
    items: [
      {
        id: "security",
        label: "Security",
        href: "/admin/security",
        icon: Lock,
        description: "Auth & entitlements",
      },
      {
        id: "audit",
        label: "Audit Log",
        href: "/admin/audit",
        icon: ShieldCheck,
        description: "Operator audit trail",
      },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      {
        id: "settings",
        label: "Settings",
        href: "/admin/settings",
        icon: Settings,
        description: "Ops configuration",
      },
    ],
  },
];

/** Flat list for search / active matching. */
export const OPS_NAV: OpsNavItem[] = OPS_NAV_GROUPS.flatMap((g) => g.items);

export const OPS_QUICK_LINKS: OpsNavItem[] = [
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
  {
    id: "motivelife",
    label: "MyMotiveLife Ops",
    href: MOTIVELIFE_OPS_URL,
    icon: Briefcase,
    description: "Sister console",
    external: true,
  },
  {
    id: "motivepulse",
    label: "MotivePulse Ops",
    href: MOTIVEPULSE_OPS_URL,
    icon: ExternalLink,
    description: "MotivePulse operations",
    external: true,
  },
  {
    id: "docs",
    label: "Documentation",
    href: "https://docs.motivefxai.com",
    icon: FileText,
    description: "Product documentation",
    external: true,
  },
];

/** @deprecated Use OPS_QUICK_LINKS */
export const OPS_SECONDARY_NAV = OPS_QUICK_LINKS;
