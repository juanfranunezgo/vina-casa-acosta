import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { buttonClasses, type Size, type Variant } from "@/components/ui/buttonClasses";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
  /**
   * Deja que el texto se parta en renglones en vez de empujar el ancho de la
   * página. Para textos largos: ver `buttonClasses`.
   */
  multiline?: boolean;
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

export default function Button(props: Props) {
  const {
    variant = "primary",
    size = "md",
    iconLeft,
    iconRight,
    loading = false,
    fullWidth = false,
    multiline = false,
    className = "",
    children,
    href,
    ...rest
  } = props;

  const classes = buttonClasses({ variant, size, fullWidth, multiline, className });

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
