import Link from "next/link";
import { Dumbbell, Footprints, Hourglass, PersonStanding, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ui/primitives";

const KINDS = [
  { Icon: Dumbbell, bg: "bg-blue", label: "Strength", detail: "Weight × reps" },
  { Icon: PersonStanding, bg: "bg-green", label: "Bodyweight", detail: "Reps, or added weight" },
  { Icon: Footprints, bg: "bg-pink", label: "Cardio", detail: "Time, distance, pace" },
  { Icon: Hourglass, bg: "bg-indigo", label: "Timed holds", detail: "Planks, hangs, wall sits" },
];

export default function Landing() {
  return (
    <div className="min-h-dvh bg-bg-grouped">
      <header className="glass sticky top-0 z-30 pt-[env(safe-area-inset-top)] !shadow-none hairline-b">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="inline-flex size-8 items-center justify-center rounded-[9px] bg-accent text-white">
              <Dumbbell className="size-5" strokeWidth={2.5} aria-hidden />
            </span>
            <span className="text-headline font-semibold">Fitness AI Tracker</span>
          </Link>
          <nav className="flex items-center gap-1">
            <ButtonLink href="/login" variant="plain" size="small">
              Log in
            </ButtonLink>
            <ButtonLink href="/signup" size="small">
              Sign up
            </ButtonLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16 md:px-8">
        <section className="py-16 text-center md:py-24">
          <h1 className="mx-auto max-w-3xl text-[2.5rem] leading-[1.08] font-bold tracking-tight md:text-[3.75rem]">
            Every set logged.
            <br />
            <span className="text-accent">The next one suggested.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-title3 text-label-2">
            Track strength, bodyweight, cardio and timed holds, then get a clear suggestion for your next set based on what you did last time.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/signup" size="large" className="w-full sm:w-auto">
              Get started, it&apos;s free
            </ButtonLink>
            <ButtonLink href="/login" variant="gray" size="large" className="w-full sm:w-auto">
              Log in
            </ButtonLink>
          </div>
        </section>

        <section aria-labelledby="kinds" className="mb-6">
          <h2 id="kinds" className="sr-only">
            Exercise types
          </h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {KINDS.map(({ Icon, bg, label, detail }) => (
              <li key={label} className="rounded-[var(--radius-card)] bg-surface p-5">
                <span className={`mb-4 inline-flex size-11 items-center justify-center rounded-xl text-white ${bg}`}>
                  <Icon className="size-6" strokeWidth={2.25} aria-hidden />
                </span>
                <div className="text-headline font-semibold">{label}</div>
                <div className="text-subhead text-label-2">{detail}</div>
              </li>
            ))}
          </ul>
        </section>

        <section className="grid gap-3 md:grid-cols-3">
          <Feature Icon={Sparkles} title="Next-set suggestions">
            “You did 80 kg × 8 on every set last time, so try 82.5 kg × 8.” Simple progressive-overload rules, always explained.
          </Feature>
          <Feature Icon={Smartphone} title="Phone, tablet, desktop">
            One app that fits every screen. Add it to your home screen and it opens like a native app.
          </Feature>
          <Feature Icon={ShieldCheck} title="Your history stays yours">
            Sign in with email or Google. Your workouts are private to your account, and you can export them any time.
          </Feature>
        </section>
      </main>

      <footer className="pb-[calc(2rem+env(safe-area-inset-bottom))] text-center text-footnote text-label-2">Fitness AI Tracker</footer>
    </div>
  );
}

function Feature({ Icon, title, children }: { Icon: typeof Sparkles; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] bg-surface p-5">
      <Icon className="mb-3 size-6 text-accent" aria-hidden />
      <h3 className="mb-1 text-headline font-semibold">{title}</h3>
      <p className="text-subhead text-label-2">{children}</p>
    </div>
  );
}
