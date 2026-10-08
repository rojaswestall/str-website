"use client";

import { type RefObject, useEffect, useEffectEvent } from "react";

type Options = {
  /** Script URL. */
  src: string;
  /** Extra attributes for the script tag, e.g. the loader's data-* options. */
  attributes?: Readonly<Record<string, string>>;
  /**
   * Element the script is appended to. Third-party loaders that insert their
   * output next to `document.currentScript` then land inside it. Its children
   * are owned by the script, never by React: on cleanup it is emptied.
   */
  target: RefObject<HTMLElement | null>;
  /** Re-runs the injection when this changes, e.g. the property id. */
  key?: string;
  /** False skips injection entirely (stub mode, missing config). */
  enabled?: boolean;
  /** Runs right before the script is appended, to create markup the script scans for. */
  prepare?: (target: HTMLElement) => void;
};

/*
 * Appends a third-party <script> to a container on mount and undoes it on
 * unmount. next/script is deliberately not used: it dedupes by src and never
 * re-runs, so client-side navigation between two properties would leave the
 * second container empty.
 *
 * The insertion is deferred to a microtask. React strict mode mounts, unmounts,
 * and remounts effects synchronously; the first run is cancelled before the
 * microtask fires, so exactly one script is ever added. A started script cannot
 * be cancelled (a removed script element still executes), so deferring is the
 * only way to guarantee that.
 */
export function useInjectedScript({
  src,
  attributes,
  target,
  key,
  enabled = true,
  prepare,
}: Options): void {
  // Always the latest `prepare`, without making it an effect dependency.
  const runPrepare = useEffectEvent((container: HTMLElement) => {
    prepare?.(container);
  });
  // Serialised so a fresh object literal on every render does not re-inject.
  const attributesJson = JSON.stringify(attributes ?? {});

  useEffect(() => {
    if (!enabled) return;
    const container = target.current;
    if (!container) return;

    let cancelled = false;
    let script: HTMLScriptElement | null = null;

    queueMicrotask(() => {
      if (cancelled) return;
      runPrepare(container);
      script = document.createElement("script");
      script.src = src;
      script.async = true;
      for (const [name, value] of Object.entries(
        JSON.parse(attributesJson) as Record<string, string>,
      )) {
        script.setAttribute(name, value);
      }
      container.appendChild(script);
    });

    return () => {
      cancelled = true;
      script?.remove();
      container.replaceChildren();
    };
  }, [src, attributesJson, target, key, enabled]);
}
