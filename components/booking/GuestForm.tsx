"use client";

import { useId } from "react";

import { cx } from "@/lib/cx";

export type GuestFormValues = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export const EMPTY_GUEST_FORM: GuestFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
};

export type GuestFormProps = {
  values: GuestFormValues;
  errors: Partial<Record<keyof GuestFormValues, string>>;
  disabled: boolean;
  onChange: (values: GuestFormValues) => void;
  /** Called when a field loses focus, so validation can run for that field. */
  onBlur: (field: keyof GuestFormValues) => void;
};

type Field = {
  key: keyof GuestFormValues;
  label: string;
  type: "text" | "email" | "tel";
  autoComplete: string;
  span?: boolean;
};

const FIELDS: Field[] = [
  {
    key: "firstName",
    label: "First name",
    type: "text",
    autoComplete: "given-name",
  },
  {
    key: "lastName",
    label: "Last name",
    type: "text",
    autoComplete: "family-name",
  },
  {
    key: "email",
    label: "Email",
    type: "email",
    autoComplete: "email",
    span: true,
  },
  {
    key: "phone",
    label: "Phone",
    type: "tel",
    autoComplete: "tel",
    span: true,
  },
];

/*
 * Contact details Hospitable's checkout opens pre-filled with. Values live
 * in the widget's state only: never persisted, never sent anywhere but the
 * final quote request.
 */
export function GuestForm({
  values,
  errors,
  disabled,
  onChange,
  onBlur,
}: GuestFormProps) {
  const id = useId();
  // A plain group rather than fieldset/legend: browsers lay a legend out
  // outside the grid, which put the heading in a column beside the first field.
  return (
    <div
      role="group"
      aria-labelledby={`${id}-heading`}
      className="flex flex-col gap-3 border-t border-hairline pt-4"
    >
      <p
        id={`${id}-heading`}
        className="font-mono text-[0.74rem] tracking-[0.08em] text-ink uppercase"
      >
        Your details
      </p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-[0.7rem]">
        {FIELDS.map((field) => {
          const error = errors[field.key];
          const inputId = `${id}-${field.key}`;
          return (
            <label
              key={field.key}
              htmlFor={inputId}
              className={cx(
                "flex min-w-0 flex-col gap-[0.3rem] font-mono text-[0.66rem] tracking-[0.06em] text-muted uppercase",
                field.span && "col-span-2",
              )}
            >
              {field.label}
              <input
                id={inputId}
                name={field.key}
                type={field.type}
                autoComplete={field.autoComplete}
                inputMode={field.type === "tel" ? "tel" : undefined}
                disabled={disabled}
                value={values[field.key]}
                onChange={(event) =>
                  onChange({ ...values, [field.key]: event.target.value })
                }
                onBlur={() => onBlur(field.key)}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${inputId}-error` : undefined}
                className={cx(
                  "w-full border bg-paper px-[0.75rem] py-[0.6rem] font-sans text-[0.95rem] tracking-normal text-ink normal-case disabled:cursor-not-allowed disabled:opacity-60",
                  error ? "border-ink" : "border-hairline",
                )}
              />
              {error ? (
                <span
                  id={`${inputId}-error`}
                  className="font-sans text-[0.8rem] tracking-normal text-ink-soft normal-case"
                >
                  {error}
                </span>
              ) : null}
            </label>
          );
        })}
      </div>
    </div>
  );
}
