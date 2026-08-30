import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  Brain,
  Briefcase,
  Bug,
  Cpu,
  DollarSign,
  Dna,
  ExternalLink,
  FileText,
  Gauge,
  GitBranch,
  History,
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
  Target,
  Users,
  Workflow,
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

/** Full Ops Master Plan v1.0 navigation — all surfaces live (no stubs). */
export const OPS_NAV_GROUPS: OpsNavGroup[] = [
  {
    id: "command",
    label: "Command",
    items: [
      { id: "overview", label: "Overview", href: "/admin/overview", icon: Gauge, description: "What requires attention" },
      { id: "live-ops", label: "Live Operations", href: "/admin/live-ops", icon: Activity, description: "Live event feed" },
      { id: "incidents", label: "Alerts & Incidents", href: "/admin/incidents", icon: AlertTriangle, description: "Incident desk" },
      { id: "assistant", label: "AI Ops Assistant", href: "/admin/assistant", icon: Bot, description: "Grounded ops Q&A" },
    ],
  },
  {
    id: "market-intelligence",
    label: "Market Intelligence",
    items: [
      { id: "market-truth", label: "Market Truth", href: "/admin/market-truth", icon: Shield, description: "Evidence ledger & G1" },
      { id: "signals", label: "Motive Signals", href: "/admin/signals", icon: Zap, description: "Motive Signal ops" },
      { id: "opportunity-radar", label: "Opportunity Radar", href: "/admin/opportunity-radar", icon: Radar, description: "Radar quality" },
      { id: "signal-graph", label: "Signal Graph", href: "/admin/signal-graph", icon: Network, description: "Relationships" },
      { id: "market-dna", label: "Market DNA", href: "/admin/market-dna", icon: Dna, description: "DNA profiles" },
      { id: "daily-brief", label: "Daily Brief", href: "/admin/daily-brief", icon: ScrollText, description: "Brief ops" },
      { id: "evidence-quality", label: "Evidence Quality", href: "/admin/evidence-quality", icon: GitBranch, description: "Evidence stack" },
      { id: "debugger", label: "Intel Debugger", href: "/admin/debugger", icon: Bug, description: "Pipeline trace" },
      { id: "calibration", label: "Calibration", href: "/admin/calibration", icon: Target, description: "Confidence calibration" },
      { id: "replay", label: "Historical Replay", href: "/admin/replay", icon: History, description: "Look-ahead safe replay" },
    ],
  },
  {
    id: "market-data",
    label: "Market Data",
    items: [
      { id: "providers", label: "Providers", href: "/admin/providers", icon: Radio, description: "Provider health" },
      { id: "pipelines", label: "Pipelines", href: "/admin/pipelines", icon: Workflow, description: "Data pipelines" },
    ],
  },
  {
    id: "product",
    label: "Product",
    items: [
      { id: "product", label: "Product Analytics", href: "/admin/product", icon: Layers, description: "Modules & utilization" },
      { id: "users", label: "Users", href: "/admin/users", icon: Users, description: "Accounts & User 360" },
      { id: "feedback", label: "Feedback", href: "/admin/feedback", icon: MessageSquare, description: "Feedback inbox" },
    ],
  },
  {
    id: "ai",
    label: "AI",
    items: [
      { id: "ai-ops", label: "AI Operations", href: "/admin/ai-ops", icon: Brain, description: "Models & prompts" },
      { id: "ai-costs", label: "AI Costs", href: "/admin/ai-costs", icon: DollarSign, description: "Token economics" },
    ],
  },
  {
    id: "business",
    label: "Business",
    items: [
      { id: "revenue", label: "Revenue", href: "/admin/revenue", icon: DollarSign, description: "Revenue control room" },
      {
        id: "creative",
        label: "Creative Lab",
        href: "/admin/creative",
        icon: Megaphone,
        description: "Hook battles · dual critics · MotiveFX ads",
        badge: "New",
      },
      {
        id: "growth",
        label: "MyMotiveLife Growth",
        href: MOTIVELIFE_OPS_URL,
        icon: Briefcase,
        description: "Sister studio (lifestyle)",
        external: true,
      },
    ],
  },
  {
    id: "platform",
    label: "Platform",
    items: [
      { id: "jobs", label: "Jobs", href: "/admin/jobs", icon: Cpu, description: "Background jobs" },
      { id: "releases", label: "Releases", href: "/admin/releases", icon: Rocket, description: "G1–G7 gates" },
    ],
  },
  {
    id: "governance",
    label: "Governance",
    items: [
      { id: "security", label: "Security", href: "/admin/security", icon: Lock, description: "Auth & entitlements" },
      { id: "roles", label: "Roles & Access", href: "/admin/roles", icon: ShieldCheck, description: "Capability grants" },
      { id: "audit", label: "Audit Log", href: "/admin/audit", icon: ScrollText, description: "Operator audit" },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      { id: "settings", label: "Settings", href: "/admin/settings", icon: Settings, description: "Ops configuration" },
    ],
  },
];

export const OPS_NAV: OpsNavItem[] = OPS_NAV_GROUPS.flatMap((g) => g.items);

export const OPS_QUICK_LINKS: OpsNavItem[] = [
  { id: "legacy", label: "Classic dashboard", href: "/admin/legacy", icon: BarChart3 },
  { id: "terminal", label: "Terminal", href: "/app", icon: Activity },
  { id: "motivelife", label: "MyMotiveLife Ops", href: MOTIVELIFE_OPS_URL, icon: Briefcase, external: true },
  { id: "motivepulse", label: "MotivePulse Ops", href: MOTIVEPULSE_OPS_URL, icon: ExternalLink, external: true },
  { id: "docs", label: "Documentation", href: "https://docs.motivefxai.com", icon: FileText, external: true },
];

export const OPS_SECONDARY_NAV = OPS_QUICK_LINKS;
