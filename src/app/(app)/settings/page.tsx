import { Suspense } from "react";
import { PageHeader } from "@/components/ui/interactive";
import { SettingsView } from "@/components/settings-view";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" />
      <Suspense fallback={<div className="h-64 animate-pulse rounded-[var(--radius-cell)] bg-surface" aria-label="Loading settings" />}>
        <Settings />
      </Suspense>
    </>
  );
}

async function Settings() {
  const profile = await getCurrentUser();
  return <SettingsView profile={profile} />;
}
