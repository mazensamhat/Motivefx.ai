/** Public app-store links for MotiveFX marketing. */

export const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.motivefx.app&pcampaignid=web_share";

/** Android package for the live Play listing (not the suspended MotiveFX.AI listing). */
export const ANDROID_PACKAGE_ID = "com.motivefx.app";

/** iOS App Store is not live yet — do not invent a URL. */
export const IOS_APP_STORE_URL = null;

export const STORE_COPY = {
  playLabel: "Get it on Google Play",
  playAria: "Get MotiveFX on Google Play",
  iosLabel: "Coming soon on the App Store",
  iosAria: "MotiveFX on the App Store — coming soon",
  mobileHeadline: "Intelligence in your pocket",
  mobileBody:
    "MotiveFX is live on Google Play. iOS is coming soon — same Motive Signal, voice briefings, and push alerts on the go.",
} as const;
