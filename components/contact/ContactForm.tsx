"use client";

import {
  type ComponentPropsWithoutRef,
  type FormEvent,
  type ReactNode,
  useId,
  useState,
} from "react";

import { Button } from "@/components/ui";
import { cx } from "@/lib/cx";
import type { ContactFieldErrors } from "@/lib/contact/schema";

/*
 * The contact form that replaces the artifact's waitlist signup. It posts the
 * fields exactly as named to POST /api/contact (contract in the step 7 notes in
 * docs/plan.md): optional fields go up as "" and the API treats them as absent,
 * so nothing is massaged here. Without RESEND_API_KEY the route dry-runs and
 * still answers 200, so the success state below is what a real send shows too.
 *
 * Inputs are uncontrolled; the body is built from FormData on submit. Field
 * errors come only from the API's 400 body and clear as soon as the guest
 * edits that field.
 */

export type ContactFormProperty = { slug: string; name: string };

type Status = "idle" | "pending" | "success";

type FieldName = keyof ContactFieldErrors;

type ContactResponse =
  { ok: true } | { ok: false; message?: string; errors?: ContactFieldErrors };

const NETWORK_ERROR =
  "We couldn't reach the server. Check your connection and try again.";
const UNEXPECTED_ERROR =
  "Something went wrong sending your message. Please try again.";

const inputClasses =
  "w-full border border-hairline bg-paper px-[0.8rem] py-[0.66rem] font-body text-[0.95rem] leading-normal text-ink placeholder:text-muted aria-invalid:border-ink";

type ContactFormProps = {
  /** Houses for the select, in order; the "General" option is added here. */
  properties: readonly ContactFormProperty[];
  className?: string;
} & Omit<
  ComponentPropsWithoutRef<"form">,
  "className" | "children" | "onSubmit" | "onChange" | "noValidate"
>;

export function ContactForm({
  properties,
  className,
  ...formProps
}: ContactFormProps) {
  const id = useId();
  const [status, setStatus] = useState<Status>("idle");
  const [fieldErrors, setFieldErrors] = useState<ContactFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const fieldId = (name: FieldName) => `${id}-${name}`;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = Object.fromEntries(new FormData(form));

    setStatus("pending");
    setFormError(null);
    setFieldErrors({});

    let outcome: { response: Response; data: ContactResponse | null } | null =
      null;
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response
        .json()
        .catch(() => null)) as ContactResponse | null;
      outcome = { response, data };
    } catch {
      outcome = null;
    }

    if (!outcome) {
      setStatus("idle");
      setFormError(NETWORK_ERROR);
      return;
    }

    const { response, data } = outcome;
    if (response.ok && data?.ok) {
      setStatus("success");
      return;
    }

    setStatus("idle");
    const errors =
      response.status === 400 && data && !data.ok ? (data.errors ?? {}) : {};
    const message = data && !data.ok ? data.message : undefined;
    setFieldErrors(errors);
    if (Object.keys(errors).length === 0) {
      setFormError(message ?? UNEXPECTED_ERROR);
      return;
    }
    // Field errors stand on their own; move focus to the first one.
    const first = Object.keys(errors).find((name) => name !== "website");
    if (first) {
      const control = form.elements.namedItem(first);
      if (control instanceof HTMLElement) control.focus();
    }
  }

  /* Any edit clears that field's error (the next submit re-validates). */
  function handleChange(event: FormEvent<HTMLFormElement>) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const name = target.getAttribute("name") as FieldName | null;
    if (!name) return;
    setFieldErrors((current) => {
      if (!(name in current)) return current;
      const next = { ...current };
      delete next[name];
      return next;
    });
  }

  if (status === "success") {
    return (
      <div
        role="status"
        className={cx("flex flex-col gap-[0.6rem]", className)}
        data-testid="contact-form-success"
      >
        <p className="font-display text-[clamp(1.35rem,2.4vw,1.7rem)] leading-[1.2] font-light tracking-[-0.01em] text-ink">
          Thank you. Your note is with us.
        </p>
        <p className="font-mono text-[0.72rem] text-muted">
          We reply within the hour, usually
        </p>
      </div>
    );
  }

  const pending = status === "pending";

  return (
    <form
      {...formProps}
      className={cx("relative grid gap-[0.9rem]", className)}
      noValidate
      onSubmit={handleSubmit}
      onChange={handleChange}
    >
      <div className="grid gap-[0.9rem] sm:grid-cols-2">
        <Field
          id={fieldId("name")}
          label="Name"
          error={fieldErrors.name}
          control={(props) => (
            <input
              {...props}
              type="text"
              name="name"
              autoComplete="name"
              placeholder="Your name"
              className={inputClasses}
            />
          )}
        />
        <Field
          id={fieldId("email")}
          label="Email"
          error={fieldErrors.email}
          control={(props) => (
            <input
              {...props}
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              className={inputClasses}
            />
          )}
        />
      </div>

      <Field
        id={fieldId("property")}
        label="House"
        error={fieldErrors.property}
        control={(props) => (
          <select
            {...props}
            name="property"
            defaultValue=""
            className={cx(inputClasses, "cursor-pointer")}
          >
            <option value="">General</option>
            {properties.map((property) => (
              <option key={property.slug} value={property.slug}>
                {property.name}
              </option>
            ))}
          </select>
        )}
      />

      <div className="grid gap-[0.9rem] sm:grid-cols-2">
        <Field
          id={fieldId("checkIn")}
          label="Check-in"
          hint="optional"
          error={fieldErrors.checkIn}
          control={(props) => (
            <input
              {...props}
              type="date"
              name="checkIn"
              className={inputClasses}
            />
          )}
        />
        <Field
          id={fieldId("checkOut")}
          label="Check-out"
          hint="optional"
          error={fieldErrors.checkOut}
          control={(props) => (
            <input
              {...props}
              type="date"
              name="checkOut"
              className={inputClasses}
            />
          )}
        />
      </div>

      <Field
        id={fieldId("message")}
        label="Message"
        error={fieldErrors.message}
        control={(props) => (
          <textarea
            {...props}
            name="message"
            rows={5}
            placeholder="Dates, group size, pets, anything you'd like to know."
            className={cx(inputClasses, "min-h-[7.5rem] resize-y")}
          />
        )}
      />

      {/*
       * Honeypot. Off-screen rather than display:none because bots skip hidden
       * inputs; tabIndex -1 and aria-hidden keep it out of the tab order and
       * the accessibility tree for everyone else.
       */}
      <div
        aria-hidden="true"
        className="absolute top-auto -left-[9999px] h-px w-px overflow-hidden"
      >
        <label>
          Website
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            defaultValue=""
          />
        </label>
      </div>

      <div className="mt-[0.3rem] flex flex-wrap items-center gap-x-[1rem] gap-y-[0.6rem]">
        <Button
          type="submit"
          disabled={pending}
          aria-disabled={pending}
          className="disabled:cursor-not-allowed disabled:opacity-70"
        >
          {pending ? "Sending…" : "Send message"}
        </Button>
        <p className="font-mono text-[0.72rem] text-muted">
          House and dates are optional.
        </p>
      </div>

      {formError ? (
        <p
          role="alert"
          data-testid="contact-form-error"
          className="font-mono text-[0.72rem] text-ink"
        >
          {formError}
        </p>
      ) : null}
    </form>
  );
}

type ControlProps = {
  id: string;
  "aria-invalid": boolean | undefined;
  "aria-describedby": string | undefined;
};

/* Mono uppercase label like `StubField`, the control, and its inline error. */
function Field({
  id,
  label,
  hint,
  error,
  control,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  control: (props: ControlProps) => ReactNode;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-[0.35rem]">
      <label
        htmlFor={id}
        className="font-mono text-[0.72rem] tracking-[0.08em] text-muted uppercase"
      >
        {label}
        {hint ? (
          <span className="ml-[0.5em] tracking-[0.04em] normal-case">
            ({hint})
          </span>
        ) : null}
      </label>
      {control({
        id,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": error ? errorId : undefined,
      })}
      {error ? (
        <p
          id={errorId}
          className="font-mono text-[0.72rem] tracking-[0.02em] text-ink"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
