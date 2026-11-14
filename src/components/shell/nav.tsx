"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChartLine, Dumbbell, History, House, Play, Settings } from "lucide-react";
import { cn } from "../ui/primitives";
import { useActiveWorkout, useElapsed } from "../workout/workout-context";
import { formatDuration } from "@/lib/format";

// HIG: ≤5 tabs, single-word labels, never hide tabs; actions (Start workout) are not tabs.
const NAV = [
  { href: "/home", label: "Home", Icon: House },
  { href: "/history", label: "History", Icon: History },
  { href: "/exercises", label: "Exercises", Icon: Dumbbell },
  { href: "/progress", label: "Progress", Icon: ChartLine },
  { href: "/settings", label: "Settings", Icon: Settings },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function NavList({ variant, pathname }: { variant: "sidebar" | "tabbar"; pathname: string }) {
  if (variant === "sidebar")
    return (
      <ul className="flex flex-col gap-0.5">
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl px-3 text-body transition-colors",
                  active ? "bg-accent/15 font-semibold text-accent" : "text-label hover:bg-fill-3",
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.5 : 2} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    );

  return (
    <>
      {NAV.map(({ href, label, Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-caption2 font-semibold transition-colors",
              active ? "bg-fill-3 text-accent" : "text-label",
            )}
          >
            <Icon className="size-6" strokeWidth={active ? 2.4 : 1.9} aria-hidden />
            {label}
          </Link>
        );
      })}
    </>
  );
}

export function ActiveNav({ variant }: { variant: "sidebar" | "tabbar" }) {
  return <NavList variant={variant} pathname={usePathname()} />;
}

/** "Workout in progress" accessory — like the iOS mini player, sits above the tab bar. */
export function ActiveWorkoutAccessory({ className }: { className?: string }) {
  const { workout } = useActiveWorkout();
  const pathname = usePathname();
  const elapsed = useElapsed(workout?.startedAt);
  if (!workout || pathname === "/workout") return null;
  return (
    <Link
      href="/workout"
      className={cn("glass flex min-h-12 items-center gap-3 rounded-full py-1.5 pr-4 pl-1.5 transition-transform active:scale-[0.98]", className)}
    >
      <span className="inline-flex size-9 items-center justify-center rounded-full bg-accent text-white">
        <Play className="size-4 fill-current" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-subhead font-semibold">{workout.title}</span>
        <span className="block text-caption1 text-label-2">Workout in progress</span>
      </span>
      <span className="font-rounded text-headline font-semibold text-accent tabular">{formatDuration(elapsed)}</span>
    </Link>
  );
}
