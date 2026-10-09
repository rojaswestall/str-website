import { cx } from "@/lib/cx";

/** A disabled, hairline form field in the site's mono style for the widget stubs. */
export function StubField({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <label
      className={cx(
        "flex flex-col gap-[0.35rem] font-mono text-[0.72rem] tracking-[0.08em] text-muted uppercase",
        className,
      )}
    >
      {label}
      <input
        type="text"
        value={value}
        disabled
        aria-disabled="true"
        className="w-full border border-hairline bg-paper px-[0.75rem] py-[0.6rem] font-mono text-[0.8rem] tracking-[0.04em] text-muted normal-case disabled:cursor-not-allowed"
        readOnly
      />
    </label>
  );
}
