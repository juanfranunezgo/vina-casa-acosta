import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "outline" | "ghost" | "glass" | "link";
type Size = "sm" | "md" | "lg";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
  className?: string;
};

type AsLink = CommonProps & {
  href: string;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">;

type AsButton = CommonProps & {
  href?: undefined;
} & Omit<ComponentProps<"button">, "className" | "children">;

type Props = AsLink | AsButton;

const baseClass =
  "group/btn relative inline-flex items-center justify-center gap-2 font-body font-semibold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none select-none whitespace-nowrap";

const sizeClass: Record<Size, string> = {
  sm: "h-9 px-4 text-label-sm uppercase tracking-wider rounded",
  md: "h-11 px-6 text-body-md rounded-md",
  lg: "h-14 px-8 text-body-md rounded-md",
};

const variantClass: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary shadow-[0_8px_24px_-8px_rgba(42,0,2,0.45)] hover:bg-primary-container hover:shadow-[0_12px_28px_-8px_rgba(42,0,2,0.55)] hover:-translate-y-0.5 active:translate-y-0 active:shadow-[0_4px_12px_-4px_rgba(42,0,2,0.4)]",
  outline:
    "border border-primary text-primary bg-transparent hover:bg-primary hover:text-on-primary",
  ghost:
    "text-primary bg-transparent hover:bg-primary/5",
  glass:
    "bg-white/12 text-on-primary border border-white/30 backdrop-blur-md hover:bg-white/22 hover:border-white/50 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4)]",
  link:
    "h-auto px-0 text-primary font-semibold border-b border-primary pb-0.5 rounded-none hover:gap-3",
};

export default function Button(props: Props) {
  const {
    variant = "primary",
    size = "md",
    iconLeft,
    iconRight,
    loading = false,
    fullWidth = false,
    className = "",
    children,
    href,
    ...rest
  } = props;

  const isLink = variant === "link";
  const classes = [
    baseClass,
    isLink ? "" : sizeClass[size],
    variantClass[variant],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        iconLeft && (
          <span className="inline-flex shrink-0" aria-hidden="true">
            {iconLeft}
          </span>
        )
      )}
      <span>{children}</span>
      {iconRight && !loading && (
        <span
          className="inline-flex shrink-0 transition-transform duration-200 group-hover/btn:translate-x-0.5"
          aria-hidden="true"
        >
          {iconRight}
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        {...(rest as Omit<ComponentProps<typeof Link>, "href" | "className" | "children">)}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      className={classes}
      disabled={loading || (rest as ComponentProps<"button">).disabled}
      {...(rest as ComponentProps<"button">)}
    >
      {content}
    </button>
  );
}
