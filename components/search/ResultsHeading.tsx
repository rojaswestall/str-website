"use client";

import type { ReactNode } from "react";

import { useResultsFocus } from "./results-focus";

/** The results summary heading; takes focus after a search is submitted. */
export function ResultsHeading({
  queryKey,
  className,
  children,
}: {
  queryKey: string;
  className?: string;
  children: ReactNode;
}) {
  const ref = useResultsFocus<HTMLHeadingElement>(queryKey);
  return (
    <h2 ref={ref} tabIndex={-1} className={className}>
      {children}
    </h2>
  );
}
