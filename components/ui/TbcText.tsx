import { isTbc, TBC } from "@/content";
import { Tbc } from "./Tbc";

/** The text after the `[TBC]` marker, or the value unchanged when it has none. */
export function stripTbc(value: string): string {
  return isTbc(value) ? value.slice(TBC.length).trim() : value;
}

/**
 * Renders a content string that may still be a `[TBC]` placeholder. Placeholder
 * text keeps its wording (it is the brief for the real copy) but loses the
 * marker and gains the dashed Tbc underline; confirmed strings render as-is.
 */
export function TbcText({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  if (!isTbc(value)) return <>{value}</>;
  return <Tbc className={className}>{stripTbc(value)}</Tbc>;
}
