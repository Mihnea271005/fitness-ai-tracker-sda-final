"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, X } from "lucide-react";
import { cn } from "./primitives";

/* ------------------------------------------------------------------ Segmented control */

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex rounded-full bg-fill-3 p-0.5", className)}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={cn(
              "min-h-9 flex-1 whitespace-nowrap rounded-full px-3 text-subhead font-semibold transition-all duration-200",
              "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent",
              selected ? "bg-elevated text-label shadow-[0_1px_4px_rgb(0_0_0/0.12)]" : "text-label-2 hover:text-label",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ Page header
 * iOS pattern: a large title in the content, and a compact centred title in a
 * glass navigation bar that appears once the large title scrolls away.
 */

export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  largeTitle = true,
}: {
  title: string;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
  largeTitle?: boolean;
}) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(!largeTitle);

  useEffect(() => {
    if (!largeTitle || !sentinel.current) return;
    const io = new IntersectionObserver(([entry]) => setCollapsed(!entry.isIntersecting), { rootMargin: "-56px 0px 0px 0px" });
    io.observe(sentinel.current);
    return () => io.disconnect();
  }, [largeTitle]);

  return (
    <>
      <div
        className={cn(
          "sticky top-0 z-30 -mx-4 px-4 pt-[env(safe-area-inset-top)] transition-[background-color,box-shadow,backdrop-filter] duration-200 md:-mx-8 md:px-8",
          collapsed ? "glass !shadow-none hairline-b" : "bg-transparent",
        )}
      >
        <div className="grid h-13 grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className="flex min-w-0 items-center">
            {back && (
              <Link
                href={back.href}
                className="-ml-2 inline-flex min-h-11 items-center gap-0.5 rounded-full pr-3 pl-1 text-body text-accent hover:bg-fill-3"
              >
                <ChevronLeft aria-hidden className="size-6" strokeWidth={2.25} />
                <span className="truncate">{back.label}</span>
              </Link>
            )}
          </div>
          <div className={cn("truncate text-headline font-semibold transition-opacity duration-200", collapsed ? "opacity-100" : "opacity-0")} aria-hidden={!collapsed}>
            {title}
          </div>
          <div className="flex items-center justify-end gap-1">{actions}</div>
        </div>
      </div>
      {largeTitle && (
        <div className="mb-5 pt-1">
          <h1 className="text-large-title font-bold tracking-tight">{title}</h1>
          {subtitle && <div className="mt-0.5 text-subhead text-label-2">{subtitle}</div>}
          <div ref={sentinel} aria-hidden className="h-px" />
        </div>
      )}
    </>
  );
}

/** Round icon button for nav bars (44px hit target). */
export function IconButton({ label, children, onClick, href }: { label: string; children: ReactNode; onClick?: () => void; href?: string }) {
  const cls =
    "inline-flex size-11 items-center justify-center rounded-full text-accent transition-colors hover:bg-fill-3 active:bg-fill-2 focus-visible:outline-2 focus-visible:outline-accent";
  if (href)
    return (
      <Link href={href} aria-label={label} className={cls}>
        {children}
      </Link>
    );
  return (
    <button type="button" aria-label={label} onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ Sheet
 * Bottom sheet on phones, centred card on larger screens. Uses <dialog> for focus
 * trapping and Esc handling.
 */

export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-0 mt-auto w-full max-w-none bg-transparent p-0 backdrop:bg-black/40 backdrop:animate-fade",
        "md:m-auto md:max-w-lg",
      )}
    >
      {open && (
        <div className="animate-sheet flex max-h-[88dvh] flex-col rounded-t-[var(--radius-card)] bg-elevated text-label pb-[env(safe-area-inset-bottom)] md:max-h-[80dvh] md:rounded-[var(--radius-card)] md:pb-0">
          <div className="mx-auto mt-2 h-1.5 w-9 rounded-full bg-fill md:hidden" aria-hidden />
          <div className="flex items-center justify-between gap-2 px-4 pt-2 pb-2">
            <h2 id={titleId} className="text-headline font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex size-11 items-center justify-center rounded-full text-label-2 hover:bg-fill-3"
            >
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-fill-3">
                <X className="size-4" strokeWidth={2.75} />
              </span>
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
          {footer && <div className="border-t border-separator px-4 py-3">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

/* ------------------------------------------------------------------ Toggle (iOS switch) */

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full transition-colors duration-200",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        checked ? "bg-green" : "bg-fill",
      )}
    >
      <span
        className={cn(
          "inline-block size-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_1px_1px_rgb(0_0_0/0.16)] transition-transform duration-200",
          checked ? "translate-x-[22px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}
