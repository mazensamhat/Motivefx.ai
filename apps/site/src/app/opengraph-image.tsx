import { OgImage, ogContentType, ogSize } from "@/lib/og-image";

export const alt = "MotiveFX.AI — Predictive Market Intelligence";
export const size = ogSize;
export const contentType = ogContentType;

export default function OpenGraphImage() {
  return OgImage();
}
