import { WifiOff } from "lucide-react";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
      <WifiOff className="size-10 text-label-2" aria-hidden />
      <h1 className="text-title2 font-bold">You&apos;re offline</h1>
      <p className="max-w-sm text-body text-label-2">Check your connection and try again. A workout you already started is kept on this device.</p>
    </main>
  );
}
