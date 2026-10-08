const warned = new Set<string>();

/** console.warn a message once per page load, keyed so strict-mode remounts stay quiet. */
export function warnOnce(key: string, message: string): void {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(message);
}
