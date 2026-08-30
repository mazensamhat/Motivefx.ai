/** Public app-store links for MotiveFX marketing. */

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.motivefx.app&pcampaignid=web_share";

/** Android package for the live Play listing (not the suspended MotiveFX.AI listing). */
export const ANDROID_PACKAGE_ID = "com.motivefx.app";

/** Apple App Store numeric id (App Store Connect). */
export const IOS_APP_STORE_ID = "6789334125";

/** Live iOS listing — Canada storefront URL from App Store Connect. */
export const IOS_APP_STORE_URL =
  "https://apps.apple.com/ca/app/motivefx-ai/id6789334125";

/** Region-agnostic App Store URL for schema / crawlers. */
export const IOS_APP_STORE_URL_GLOBAL = `https://apps.apple.com/app/id${IOS_APP_STORE_ID}`;

export const STORE_COPY = {
  playLabel: "Get it on Google Play",
  playAria: "Get MotiveFX on Google Play",
  iosLabel: "Download on the App Store",
  iosAria: "Download MotiveFX on the App Store",
  mobileHeadline: "Intelligence in your pocket",
  mobileBody:
    "MotiveFX is live on the App Store and Google Play — same Motive Signal, voice briefings, and push alerts on the go.",
} as const;
