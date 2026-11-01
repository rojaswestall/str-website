"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { cx } from "@/lib/cx";
import { ContactForm, type ContactFormProperty } from "./ContactForm";

/**
 * The footer's "Send us a message" button and the pop-up it opens: the same
 * contact form as the home page's "Why book direct" section, on whatever page
 * the guest is reading. On a house page (`/stays/<slug>`) that house is
 * pre-selected in the form.
 *
 * The pop-up is a native modal `<dialog>`: the browser traps focus, closes it
 * on Escape, and hands focus back to the button. It also closes from its Close
 * button or a click on the dimmed page around the panel. The form is mounted
 * only while the pop-up is open, so every opening starts with an empty form,
 * including after a message has been sent.
 */
export function MessageDialog({
  properties,
  className,
}: {
  properties: readonly ContactFormProperty[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const slug = pathname.match(/^\/stays\/([^/]+)/)?.[1];
  const defaultProperty = properties.some((p) => p.slug === slug)
    ? slug
    : undefined;

  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={className}
      >
        Send us a message
      </Button>
      {open ? (
        <MessagePopup
          properties={properties}
          defaultProperty={defaultProperty}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function MessagePopup({
  properties,
  defaultProperty,
  onClose,
}: {
  properties: readonly ContactFormProperty[];
  defaultProperty?: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      data-testid="message-dialog"
      onClose={onClose}
      // The dialog is the full-screen grey layer and the panel sits inside it,
      // so a click whose target is the dialog itself landed on the grey around
      // the panel. (The grey is drawn here rather than on ::backdrop, which
      // cannot read the theme's custom properties.) font-body and not-italic
      // reset what the footer's <address> would otherwise pass down.
      onClick={(event) => {
        if (event.target === event.currentTarget) dialogRef.current?.close();
      }}
      className={cx(
        "fixed inset-0 m-0 grid h-dvh max-h-none w-dvw max-w-none place-items-center overflow-y-auto overscroll-contain bg-scrim/75 p-[1rem] font-body text-ink not-italic",
        "backdrop:bg-transparent",
      )}
    >
      <div className="w-full max-w-[38rem] border border-hairline bg-paper p-[clamp(1.25rem,4vw,2rem)]">
        <div className="mb-[clamp(1.25rem,3vw,1.75rem)] flex items-start justify-between gap-4">
          <div>
            <h2
              id={headingId}
              className="font-display text-[clamp(1.5rem,3vw,1.9rem)] leading-[1.15] font-normal tracking-[-0.01em]"
            >
              Send us a message
            </h2>
            <p className="mt-[0.4rem] text-[0.95rem] text-ink-soft">
              Questions before you book, or about a stay. One of the three of us
              will answer.
            </p>
          </div>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="flex shrink-0 items-center gap-[0.5rem] rounded-full border border-hairline bg-paper px-[1rem] py-[0.55rem] font-mono text-[0.72rem] tracking-[0.08em] text-ink uppercase transition-colors duration-[120ms] hover:bg-paper-2"
          >
            Close
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-[0.95rem]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <ContactForm
          properties={properties}
          defaultProperty={defaultProperty}
          aria-labelledby={headingId}
        />
      </div>
    </dialog>
  );
}
