/** Joins class names, dropping falsy entries. Small enough to avoid a dependency. */
export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
