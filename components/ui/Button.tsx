import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cx } from "@/lib/cx";

type Variant = "primary" | "ghost";

type Common = {
  variant?: Variant;
  className?: string;
  children: ReactNode;
};

type AnchorProps = Common & {
  href: string;
  /** Opens in a new tab with rel="noopener noreferrer". */
  external?: boolean;
} & Omit<ComponentPropsWithoutRef<"a">, "href" | "className" | "children">;

type NativeButtonProps = Common & {
  href?: undefined;
  external?: undefined;
} & Omit<ComponentPropsWithoutRef<"button">, "className" | "children">;

export type ButtonProps = AnchorProps | NativeButtonProps;

const base =
  "inline-block border px-[1.15rem] py-[0.68rem] text-center font-mono text-[0.78rem] tracking-[0.06em] uppercase no-underline transition-[background-color,color,border-color] duration-[120ms] ease-in-out";

const variants: Record<Variant, string> = {
  primary:
    "border-ink bg-ink text-paper hover:border-muted hover:bg-muted hover:text-paper",
  ghost: "border-hairline bg-transparent text-ink hover:border-muted",
};

/** The artifact's `.btn`. Renders a link when `href` is given, otherwise a button. */
export function Button(props: ButtonProps) {
  const classes = cx(
    base,
    variants[props.variant ?? "primary"],
    props.className,
  );

  if (props.href !== undefined) {
    const { href, external, children, ...rest } = props;
    const anchorProps = withoutStyleProps(rest);
    if (external) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={classes}
          {...anchorProps}
        >
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...anchorProps}>
        {children}
      </Link>
    );
  }

  const { type = "button", children, ...rest } = props;
  return (
    <button
      type={type}
      className={cx(classes, "cursor-pointer")}
      {...withoutStyleProps(rest)}
    >
      {children}
    </button>
  );
}

/** Strips the props already folded into `className` so they never reach the DOM. */
function withoutStyleProps<T extends Partial<Common>>(props: T) {
  const rest: Partial<Common> & Omit<T, keyof Common> = { ...props };
  delete rest.variant;
  delete rest.className;
  return rest as Omit<T, keyof Common>;
}
