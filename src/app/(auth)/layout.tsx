import Link from "next/link";
import { Dumbbell } from "lucide-react";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 pt-[max(env(safe-area-inset-top),2rem)] pb-[max(env(safe-area-inset-bottom),2rem)]">
      <Link href="/" className="mb-8 flex flex-col items-center gap-3" aria-label="Fitness AI Tracker home">
        <span className="inline-flex size-16 items-center justify-center rounded-[18px] bg-accent text-white shadow-[0_8px_24px_rgb(30_110_244/0.35)]">
          <Dumbbell className="size-9" strokeWidth={2.5} aria-hidden />
        </span>
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
