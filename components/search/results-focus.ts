"use client";

import { useEffect, useRef } from "react";

/*
 * After a search is submitted the page navigates on the client and the
 * results render on the server, so there is no live region that already
 * exists to announce them. Instead the form leaves a flag here and the
 * results heading takes focus once it mounts, which a screen reader reads
 * out and which puts keyboard users at the results. A plain page load
 * (bookmark, refresh) leaves focus alone.
 */

let pending = false;

export function requestResultsFocus(): void {
  pending = true;
}

/** Ref for the results heading (give it tabIndex={-1}); `key` is the query string. */
export function useResultsFocus<T extends HTMLElement>(key: string) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!pending) return;
    pending = false;
    ref.current?.focus();
  }, [key]);
  return ref;
}
