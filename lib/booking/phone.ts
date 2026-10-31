import { E164 } from "./schema";

/*
 * Guests type phone numbers every which way; Hospitable wants E.164 and
 * rejects anything else with a generic error. A number with a leading "+"
 * is taken as international; ten digits, or eleven starting with 1, are
 * read as US/Canada. Anything else is left for validation to reject.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const international = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (international) {
    const candidate = `+${digits}`;
    return E164.test(candidate) ? candidate : null;
  }
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}
