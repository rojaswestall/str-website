/**
 * First focusable element on every page. Visually hidden until it receives
 * keyboard focus, then drops in over the masthead and jumps to <main id="main">.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only z-50 border border-ink bg-paper px-4 py-2 font-mono text-[0.78rem] tracking-[0.06em] text-ink uppercase no-underline focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
    >
      Skip to content
    </a>
  );
}
