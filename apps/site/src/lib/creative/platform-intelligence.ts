/**
 * Platform Intelligence — channel constraints for MotiveFX creatives.
 */

import type { CreativePlatform, CaptionPackage, VideoConcept } from "./types";

export type PlatformIntel = {
  platform: CreativePlatform;
  aspectRatio: "9:16" | "1:1" | "16:9" | "4:5";
  maxCaptionChars: number;
  idealHookChars: number;
  videoMaxSec: number;
  openMustBeTension: boolean;
  ctaPlacement: "end_card" | "caption_end" | "both";
  notes: string[];
  safeZones: string;
};

const INTEL: Record<CreativePlatform, PlatformIntel> = {
  tiktok: {
    platform: "tiktok",
    aspectRatio: "9:16",
    maxCaptionChars: 150,
    idealHookChars: 70,
    videoMaxSec: 15,
    openMustBeTension: true,
    ctaPlacement: "both",
    notes: [
      "0–1s must be decision tension (BUY?), not logo",
      "Text-safe center; avoid bottom UI chrome",
      "WAIT resolution lands by 6–9s",
    ],
    safeZones: "Keep primary text in middle 60% vertically",
  },
  reels: {
    platform: "reels",
    aspectRatio: "9:16",
    maxCaptionChars: 220,
    idealHookChars: 75,
    videoMaxSec: 15,
    openMustBeTension: true,
    ctaPlacement: "both",
    notes: ["Same vertical discipline as TikTok", "Caption can carry evidence line"],
    safeZones: "Avoid lower 20% (Reels UI)",
  },
  instagram: {
    platform: "instagram",
    aspectRatio: "4:5",
    maxCaptionChars: 300,
    idealHookChars: 80,
    videoMaxSec: 15,
    openMustBeTension: true,
    ctaPlacement: "caption_end",
    notes: ["Feed: evidence board stills perform", "Carousel: conflict → WAIT"],
    safeZones: "4:5 preferred over square for stop-rate",
  },
  facebook: {
    platform: "facebook",
    aspectRatio: "1:1",
    maxCaptionChars: 400,
    idealHookChars: 90,
    videoMaxSec: 20,
    openMustBeTension: true,
    ctaPlacement: "caption_end",
    notes: ["Slightly longer educational captions OK", "Still no profit promises"],
    safeZones: "Square or 4:5",
  },
  linkedin: {
    platform: "linkedin",
    aspectRatio: "1:1",
    maxCaptionChars: 600,
    idealHookChars: 100,
    videoMaxSec: 30,
    openMustBeTension: false,
    ctaPlacement: "caption_end",
    notes: [
      "Professional tone — AI misconception / evidence challenge",
      "Avoid retail hype cadence",
    ],
    safeZones: "Square still + long caption",
  },
  x: {
    platform: "x",
    aspectRatio: "16:9",
    maxCaptionChars: 260,
    idealHookChars: 60,
    videoMaxSec: 12,
    openMustBeTension: true,
    ctaPlacement: "caption_end",
    notes: ["Single sharp hook line wins", "Thread: hook → evidence → MotiveFX"],
    safeZones: "Landscape or still with bold type",
  },
  youtube_shorts: {
    platform: "youtube_shorts",
    aspectRatio: "9:16",
    maxCaptionChars: 100,
    idealHookChars: 65,
    videoMaxSec: 15,
    openMustBeTension: true,
    ctaPlacement: "end_card",
    notes: ["Mirror TikTok storyboard", "End card: See the evidence"],
    safeZones: "Vertical safe center",
  },
};

export function getPlatformIntel(platform: CreativePlatform): PlatformIntel {
  return INTEL[platform];
}

export function adaptCaptionForPlatform(
  caption: CaptionPackage,
  platform: CreativePlatform
): CaptionPackage & { truncated: boolean; platformNotes: string[] } {
  const intel = getPlatformIntel(platform);
  let full = caption.fullCaption;
  let truncated = false;
  if (full.length > intel.maxCaptionChars) {
    // Keep hook + reveal + CTA
    const compact = [
      caption.hook,
      "",
      caption.marketTension,
      "",
      "MotiveFX brings the evidence together before forming the signal.",
      "",
      caption.cta,
    ].join("\n");
    full = compact.slice(0, intel.maxCaptionChars);
    truncated = true;
  }
  return {
    ...caption,
    fullCaption: full,
    truncated,
    platformNotes: intel.notes,
  };
}

export function adaptVideoForPlatform(video: VideoConcept, platform: CreativePlatform): VideoConcept {
  const intel = getPlatformIntel(platform);
  const beats = video.beats.filter((b) => b.startSec < intel.videoMaxSec).map((b) => ({
    ...b,
    endSec: Math.min(b.endSec, intel.videoMaxSec),
  }));
  return { ...video, beats };
}
