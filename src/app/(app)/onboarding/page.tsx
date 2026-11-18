import { Suspense } from "react";
import { PageHeader } from "@/components/ui/interactive";
import { OnboardingForm } from "@/components/onboarding-form";
import { getCurrentUser } from "@/lib/auth";
import { getExercises, getMeasurements } from "@/lib/data";
import { toDisplayWeight } from "@/lib/format";

export const metadata = { title: "Training profile" };

export default function OnboardingPage() {
  return (
    <Suspense fallback={<PageHeader title="Your training profile" />}>
      <Onboarding />
    </Suspense>
  );
}

async function Onboarding() {
  const [profile, exercises, measurements] = await Promise.all([getCurrentUser(), getExercises(), getMeasurements()]);
  const weight = measurements.find((m) => m.weightKg !== undefined)?.weightKg;
  return (
    <>
      <PageHeader
        title={profile.onboarded ? "Training profile" : "Set up your AI coach"}
        subtitle={profile.onboarded ? "Changes apply to your next suggested workout." : "A few questions so your first workout fits you."}
        back={profile.onboarded ? { href: "/settings", label: "Settings" } : undefined}
      />
      <div className="max-w-xl">
        <OnboardingForm profile={profile} exercises={exercises} bodyweight={weight !== undefined ? toDisplayWeight(weight, profile.unit) : undefined} editing={profile.onboarded} />
      </div>
    </>
  );
}
