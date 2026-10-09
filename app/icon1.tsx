import { monogramIcon } from "@/components/seo/MonogramIcon";

/*
 * PNG sibling of app/icon.svg for browsers that ignore SVG favicons (Safari
 * among them). Next emits both `<link rel="icon">` tags; numbered icon files
 * sort after the unnumbered one. See components/seo/MonogramIcon.tsx.
 */
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return monogramIcon(size.width);
}
