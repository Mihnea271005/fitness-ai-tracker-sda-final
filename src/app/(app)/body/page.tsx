import { Suspense } from "react";
import { Trash2 } from "lucide-react";
import { PageHeader } from "@/components/ui/interactive";
import { ListSection, StatTile } from "@/components/ui/primitives";
import { MeasurementForm } from "@/components/measurement-form";
import { MeasurementChart } from "@/components/measurement-chart";
import { ConfirmAction } from "@/components/confirm-action";
import { deleteMeasurement } from "./actions";
import { getCurrentUser } from "@/lib/auth";
import { getMeasurements, getTimeZone } from "@/lib/data";
import { formatDay, formatWeight, localYmd, toDisplayWeight } from "@/lib/format";
import type { BodyMeasurement } from "@/lib/types";

export const metadata = { title: "Body" };

export default function BodyPage() {
  return (
    <Suspense fallback={<PageHeader title="Body" back={{ href: "/progress", label: "Progress" }} />}>
      <Body />
    </Suspense>
  );
}

const CM: [keyof BodyMeasurement, string][] = [
  ["waistCm", "Waist"],
  ["chestCm", "Chest"],
  ["hipsCm", "Hips"],
  ["armCm", "Arm"],
  ["thighCm", "Thigh"],
];

async function Body() {
  const [profile, entries, tz] = await Promise.all([getCurrentUser(), getMeasurements(), getTimeZone()]);
  const unit = profile.unit;
  const weights = entries.filter((e) => e.weightKg !== undefined);
  const latest = weights[0];
  const first = weights[weights.length - 1];
  const change = latest && first && latest !== first ? (latest.weightKg ?? 0) - (first.weightKg ?? 0) : null;

  return (
    <>
      <PageHeader title="Body" subtitle="Body weight and measurements" back={{ href: "/progress", label: "Progress" }} />
      <MeasurementForm unit={unit} today={localYmd(new Date(), tz)} />

      {weights.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3">
          <StatTile label="Latest weight" value={latest ? formatWeight(latest.weightKg!, unit) : "–"} delta={latest ? formatDay(latest.measuredOn) : undefined} />
          <StatTile
            label="Change"
            value={change === null ? "–" : `${change > 0 ? "+" : change < 0 ? "−" : ""}${formatWeight(Math.abs(change), unit)}`}
            delta={first && change !== null ? `since ${formatDay(first.measuredOn, { day: "numeric", month: "short", year: "numeric" })}` : undefined}
          />
        </div>
      )}

      {weights.length > 1 && (
        <MeasurementChart
          unit={unit}
          points={[...weights]
            .reverse()
            .slice(-60)
            .map((e) => ({ label: formatDay(e.measuredOn), value: toDisplayWeight(e.weightKg!, unit) }))}
        />
      )}

      <ListSection header="Entries">
        {entries.map((e) => {
          const parts = [
            e.weightKg !== undefined ? formatWeight(e.weightKg, unit) : null,
            e.bodyFatPct !== undefined ? `${e.bodyFatPct}% fat` : null,
            ...CM.filter(([k]) => e[k] !== undefined).map(([k, label]) => `${label} ${e[k]} cm`),
          ].filter(Boolean);
          return (
            <li key={e.id} className="flex items-center gap-2 py-2.5 pr-2">
              <div className="min-w-0 flex-1">
                <div className="text-body">{formatDay(e.measuredOn, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</div>
                <div className="text-subhead text-label-2">{parts.join(" · ")}</div>
                {e.notes && <div className="text-footnote text-label-2">{e.notes}</div>}
              </div>
              <ConfirmAction
                buttonVariant="plain"
                className="!min-h-11 !px-3"
                label={
                  <>
                    <Trash2 className="size-4 text-red-text" aria-hidden />
                    <span className="sr-only">Delete entry</span>
                  </>
                }
                title="Delete this entry?"
                body={`The measurement from ${formatDay(e.measuredOn, { day: "numeric", month: "long", year: "numeric" })} will be removed.`}
                confirmLabel="Delete"
                action={deleteMeasurement.bind(null, e.id)}
              />
            </li>
          );
        })}
        {!entries.length && <li className="py-6 pr-4 text-center text-subhead text-label-2">No measurements yet. Log your body weight to start a trend.</li>}
      </ListSection>
    </>
  );
}
