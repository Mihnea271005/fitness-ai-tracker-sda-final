import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ChevronRight } from "lucide-react";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ Buttons
 * HIG: hit region ≥ 44×44; one or two prominent buttons per view; primary uses the
 * accent colour; destructive uses system red and is never the primary style.
 */
type ButtonVariant = "filled" | "tinted" | "gray" | "plain" | "destructive";
type ButtonSize = "large" | "medium" | "small";

const variantClass: Record<ButtonVariant, string> = {
  filled: "bg-accent text-white hover:brightness-110 active:brightness-95",
  tinted: "bg-accent/15 text-accent hover:bg-accent/20 active:bg-accent/25",
  gray: "bg-fill-3 text-label hover:bg-fill-2 active:bg-fill",
  plain: "text-accent hover:bg-fill-3 active:bg-fill-2",
  destructive: "bg-red/15 text-red-text hover:bg-red/20 active:bg-red/25",
};

const sizeClass: Record<ButtonSize, string> = {
  large: "min-h-[3.25rem] px-6 text-headline font-semibold",
  medium: "min-h-11 px-5 text-body font-semibold",
  small: "min-h-11 px-3.5 text-subhead font-semibold", // 44px hit target even when compact
};

export function buttonClasses(variant: ButtonVariant = "filled", size: ButtonSize = "medium", extra?: string) {
  return cn(
    "inline-flex select-none items-center justify-center gap-2 rounded-full transition-[filter,background-color] duration-150",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:pointer-events-none disabled:opacity-40",
    variantClass[variant],
    sizeClass[size],
    extra,
  );
}

export function Button({
  variant = "filled",
  size = "medium",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <button type="button" className={buttonClasses(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "filled",
  size = "medium",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return <Link className={buttonClasses(variant, size, className)} {...props} />;
}

/* ------------------------------------------------------------------ Inset grouped list */

export function ListSection({
  header,
  footer,
  children,
  className,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-8", className)}>
      {header && <h2 className="mb-1.5 px-4 text-footnote font-normal uppercase tracking-wide text-label-2">{header}</h2>}
      <div className="overflow-hidden rounded-[var(--radius-cell)] bg-surface">
        <ul className="divide-y divide-separator [&>li]:ml-4 [&>li]:pr-0 [&>li:first-child]:border-t-0">{children}</ul>
      </div>
      {footer && <p className="mt-1.5 px-4 text-footnote text-label-2">{footer}</p>}
    </section>
  );
}

interface ListRowProps {
  href?: string;
  onClick?: () => void;
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  destructive?: boolean;
  className?: string;
}

export function ListRow({ href, onClick, leading, title, subtitle, trailing, chevron, destructive, className }: ListRowProps) {
  const inner = (
    <div className="flex min-h-11 items-center gap-3 py-2.5 pr-4">
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-body", destructive ? "text-red-text" : "text-label")}>{title}</div>
        {subtitle && <div className="truncate text-subhead text-label-2">{subtitle}</div>}
      </div>
      {trailing && <div className="shrink-0 text-body text-label-2 tabular">{trailing}</div>}
      {(chevron ?? !!href) && <ChevronRight aria-hidden className="size-4 shrink-0 text-label-3" strokeWidth={2.5} />}
    </div>
  );
  const interactive = "block -ml-4 pl-4 transition-colors hover:bg-fill-3 active:bg-fill-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent";
  return (
    <li className={className}>
      {href ? (
        <Link href={href} className={interactive}>
          {inner}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={cn(interactive, "w-full text-left")}>
          {inner}
        </button>
      ) : (
        inner
      )}
    </li>
  );
}

/* ------------------------------------------------------------------ Cards & tiles */

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-[var(--radius-cell)] bg-surface p-4", className)} {...props} />;
}

/** Stat tile: label · value · optional delta. Value uses proportional rounded figures. */
export function StatTile({ label, value, unit, delta, icon }: { label: string; value: string; unit?: string; delta?: ReactNode; icon?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 text-subhead font-medium text-label-2">
        {icon}
        {label}
      </div>
      <div className="font-rounded text-title1 font-bold">
        {value}
        {unit && <span className="ml-1 text-title3 font-semibold text-label-2">{unit}</span>}
      </div>
      {delta && <div className="text-footnote text-label-2">{delta}</div>}
    </Card>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-1 flex items-center justify-between px-1">
      <h2 className="text-title3 font-bold">{children}</h2>
      {action}
    </div>
  );
}

export function TextField({ label, className, id, ...props }: ComponentProps<"input"> & { label: string }) {
  const inputId = id ?? `f-${label.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <label htmlFor={inputId} className={cn("block", className)}>
      <span className="mb-1.5 block px-1 text-subhead font-medium text-label-2">{label}</span>
      <input
        id={inputId}
        className="min-h-11 w-full rounded-xl bg-surface px-4 py-3 text-body text-label placeholder:text-label-3 outline-none ring-accent focus-visible:ring-2"
        {...props}
      />
    </label>
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-full bg-fill-3 px-2 py-0.5 text-caption1 font-semibold text-label-2", className)}>{children}</span>;
}
