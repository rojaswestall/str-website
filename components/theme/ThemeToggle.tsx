"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const MODES = ["light", "dark", "system"] as const;
type Mode = (typeof MODES)[number];

function isMode(value: string | undefined): value is Mode {
  return MODES.includes(value as Mode);
}

const subscribeNoop = () => () => {};

/** False during SSR and hydration, true after the component has mounted. */
function useMounted() {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

/**
 * Cycles light → dark → system. The current mode is only rendered after mount
 * because next-themes reads it from localStorage, which the server cannot see.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  const current: Mode = mounted && isMode(theme) ? theme : "system";
  const next = MODES[(MODES.indexOf(current) + 1) % MODES.length] ?? "system";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={
        mounted ? `Theme: ${current}. Switch to ${next}.` : "Switch theme"
      }
      data-theme-toggle
      data-mode={mounted ? current : undefined}
      className={`inline-flex min-w-[7.5rem] items-center gap-2 border border-hairline bg-transparent px-3 py-2 font-mono text-[0.72rem] tracking-[0.06em] text-ink uppercase transition-[border-color] duration-[120ms] hover:border-muted ${className}`}
    >
      <span aria-hidden="true" className="inline-flex size-3.5 items-center">
        {mounted ? <ModeIcon mode={current} /> : null}
      </span>
      <span>{mounted ? current : "theme"}</span>
    </button>
  );
}

function ModeIcon({ mode }: { mode: Mode }) {
  const common = {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (mode) {
    case "light":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      );
    case "dark":
      return (
        <svg {...common}>
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      );
    case "system":
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="12" rx="1.5" />
          <path d="M8 20h8M12 16v4" />
        </svg>
      );
  }
}
