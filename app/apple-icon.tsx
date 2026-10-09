import { monogramIcon } from "@/components/seo/MonogramIcon";

/** Placeholder apple-touch-icon; see components/seo/MonogramIcon.tsx. */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return monogramIcon(size.width);
}
