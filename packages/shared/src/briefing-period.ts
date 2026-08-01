export type BriefingPeriod = "morning" | "afternoon" | "evening";

export function getBriefingPeriod(date = new Date()): BriefingPeriod {
  const hour = date.getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export function formatBriefingGreeting(period: BriefingPeriod, name?: string | null): string {
  const cleanName = name?.trim();
  return `Good ${period}${cleanName ? `, ${cleanName}` : ""}`;
}

export function formatBriefingKicker(period: BriefingPeriod): string {
  return `${period.charAt(0).toUpperCase()}${period.slice(1)} intel`;
}

export function formatBriefingIntro(period: BriefingPeriod, name?: string | null): string {
  return `${formatBriefingGreeting(period, name)}. Here's your ${period} intel.`;
}
