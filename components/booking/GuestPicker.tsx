"use client";

import { useId, useState } from "react";

import { plural } from "@/lib/booking/format";
import {
  clampGuests,
  type Guests,
  MAX_INFANTS,
  MAX_PETS,
} from "@/lib/booking/rules";
import { cx } from "@/lib/cx";

export type GuestPickerProps = {
  guests: Guests;
  maxGuests: number;
  petsAllowed: boolean;
  onChange: (guests: Guests) => void;
};

type Row = {
  key: keyof Guests;
  label: string;
  hint: string;
  min: number;
  max: number;
};

/*
 * One summary row ("2 guests · 1 pet") that opens into four stepper rows.
 * Collapsed by default so the card stays short enough to fit beside the
 * house copy; most guests never change the default party. Adults and
 * children count toward the house's capacity.
 */
export function GuestPicker({
  guests,
  maxGuests,
  petsAllowed,
  onChange,
}: GuestPickerProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const occupancy = guests.adults + guests.children;
  const rows: Row[] = [
    {
      key: "adults",
      label: "Adults",
      hint: "Ages 13+",
      min: 1,
      max: maxGuests - guests.children,
    },
    {
      key: "children",
      label: "Children",
      hint: "Ages 2–12",
      min: 0,
      max: maxGuests - guests.adults,
    },
    {
      key: "infants",
      label: "Infants",
      hint: "Under 2, not counted",
      min: 0,
      max: MAX_INFANTS,
    },
    ...(petsAllowed
      ? [
          {
            key: "pets" as const,
            label: "Pets",
            hint: "Pet fee applies",
            min: 0,
            max: MAX_PETS,
          },
        ]
      : []),
  ];

  const summary = [
    plural(occupancy, "guest"),
    guests.infants ? plural(guests.infants, "infant") : null,
    guests.pets ? plural(guests.pets, "pet") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  function set(key: keyof Guests, value: number) {
    onChange(
      clampGuests({ ...guests, [key]: value }, { maxGuests, petsAllowed }),
    );
  }

  return (
    <div className="border-y border-hairline">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-rows`}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 py-[0.7rem] text-left"
      >
        <span className="flex flex-col gap-[0.15rem]">
          <span className="font-mono text-[0.74rem] tracking-[0.08em] text-ink uppercase">
            Guests
          </span>
          <span className="font-mono text-[0.66rem] tracking-[0.04em] text-muted">
            Sleeps up to {maxGuests}
          </span>
        </span>
        <span className="flex items-center gap-3">
          <span className="text-[0.92rem] text-ink">{summary}</span>
          <span
            aria-hidden="true"
            className={cx(
              "font-mono text-[0.8rem] text-muted transition-transform duration-[120ms]",
              open && "rotate-180",
            )}
          >
            ▾
          </span>
        </span>
      </button>
      <ul
        id={`${id}-rows`}
        hidden={!open}
        className="divide-y divide-hairline border-t border-hairline"
      >
        {rows.map((row) => {
          const value = guests[row.key];
          return (
            <li
              key={row.key}
              className="flex items-center justify-between gap-3 py-[0.6rem]"
            >
              <div className="min-w-0">
                <p className="text-[0.92rem] text-ink">{row.label}</p>
                <p className="font-mono text-[0.64rem] tracking-[0.04em] text-muted">
                  {row.hint}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Step
                  label={`Remove one of ${row.label.toLowerCase()}`}
                  disabled={value <= row.min}
                  onClick={() => set(row.key, value - 1)}
                >
                  −
                </Step>
                <output
                  aria-label={row.label}
                  className="w-6 text-center text-[0.95rem] text-ink tabular-nums"
                >
                  {value}
                </output>
                <Step
                  label={`Add one of ${row.label.toLowerCase()}`}
                  disabled={value >= row.max}
                  onClick={() => set(row.key, value + 1)}
                >
                  +
                </Step>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Step({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cx(
        "h-8 w-8 border border-hairline font-mono text-[0.9rem] leading-none text-ink transition-colors duration-[120ms]",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "cursor-pointer hover:border-muted",
      )}
    >
      {children}
    </button>
  );
}
