import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Dumbbell } from "lucide-react";
import { ActiveNav, ActiveWorkoutAccessory, NavList } from "./nav";

// Server component. Only the parts that read the URL (active-tab highlight, workout
// accessory) are client components, each behind <Suspense> so the shell prerenders.

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      {/* Sidebar — regular width (tablet / desktop). Floats on a glass panel. */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[17rem] p-2 md:block">
        <nav aria-label="Main" className="glass flex h-full flex-col rounded-[var(--radius-card)] px-3 pt-5 pb-3">
          <Link href="/home" className="mb-5 flex items-center gap-2.5 px-2">
            <span className="inline-flex size-8 items-center justify-center rounded-[9px] bg-accent text-white">
              <Dumbbell className="size-5" strokeWidth={2.5} aria-hidden />
            </span>
            <span className="text-headline font-semibold">Fitness AI Tracker</span>
          </Link>
          <Suspense fallback={<NavList variant="sidebar" pathname="" />}>
            <ActiveNav variant="sidebar" />
          </Suspense>
          <div className="mt-auto">
            <Suspense fallback={null}>
              <ActiveWorkoutAccessory />
            </Suspense>
          </div>
        </nav>
      </aside>

      <main className="px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] md:ml-[17rem] md:px-8 md:pb-12">
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>

      {/* Tab bar — compact width (phones). Floating capsule on glass. */}
      <div className="fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] md:hidden">
        <Suspense fallback={null}>
          <ActiveWorkoutAccessory className="mx-auto mb-2 max-w-md" />
        </Suspense>
        <nav aria-label="Main" className="glass mx-auto flex max-w-md items-stretch justify-between rounded-full p-1">
          <Suspense fallback={<NavList variant="tabbar" pathname="" />}>
            <ActiveNav variant="tabbar" />
          </Suspense>
        </nav>
      </div>
    </div>
  );
}
