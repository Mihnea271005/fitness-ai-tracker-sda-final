import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getExerciseMap, getTimeZone, getWorkout, getWorkouts } from "@/lib/data";
import { workoutPRs } from "@/lib/achievements";
import { formatCompact, formatDate, formatLongDuration, formatSet, toDisplayWeight, workoutDurationS, workoutVolumeKg } from "@/lib/format";
import type { Exercise, WorkoutSet } from "@/lib/types";

// A shareable PNG of one workout: story (1080×1920) or square (1080×1080). Only the
// signed-in owner can render it: the workout is read through RLS like everywhere else.

const SIZE = { story: { width: 1080, height: 1920 }, square: { width: 1080, height: 1080 } } as const;
const C = { bg: "#0b0b0f", card: "#1c1c22", label: "#ffffff", label2: "rgba(235,235,245,0.62)", accent: "#0a84ff", gold: "#ffd60a" };

/** Shorten to `max` characters with an ellipsis: the image has fixed space, and text can't wrap freely. */
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text);

/** The set worth showing for an exercise: heaviest / most reps / longest. */
function bestSet(ex: Exercise, sets: WorkoutSet[]): WorkoutSet | undefined {
  const done = sets.filter((s) => s.completed && s.type !== "warmup");
  const score = (s: WorkoutSet) => (ex.kind === "cardio" ? (s.distanceM ?? 0) : ex.kind === "timed" ? (s.durationS ?? 0) : (s.weightKg ?? 0) * 1000 + (s.reps ?? 0));
  return done.length ? done.reduce((a, b) => (score(b) > score(a) ? b : a)) : undefined;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const format = req.nextUrl.searchParams.get("format") === "square" ? "square" : "story";
  const [profile, w, exercises, all, tz] = await Promise.all([getCurrentUser(), getWorkout(id), getExerciseMap(), getWorkouts(), getTimeZone()]);
  if (!w) return new Response("Not found", { status: 404 });

  const unit = profile.unit;
  const story = format === "story";
  const prIds = new Set(workoutPRs(w, all, exercises).map((p) => p.exercise.id));
  const rows = w.exercises
    .map((we) => {
      const ex = exercises.get(we.exerciseId);
      const best = ex && bestSet(ex, we.sets);
      if (!ex || !best) return null;
      const n = we.sets.filter((s) => s.completed && s.type !== "warmup").length;
      // ~24 characters keep the name on one line next to the set summary at this font size.
      return { name: clip(ex.name, 24), sets: n, best: formatSet(best, ex.kind, unit), pr: prIds.has(ex.id) };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  // Space budget: rows are one line each (names clipped), the title at most two lines
  // (clipped), and the last slot is kept for "+ N more" and the footer.
  const maxRows = story ? 8 : 4;
  const title = clip(w.title, story ? 36 : 40);
  const shown = rows.slice(0, maxRows);
  const volume = workoutVolumeKg(w, exercises);
  const stats = [
    { label: "Time", value: formatLongDuration(workoutDurationS(w)) },
    ...(volume ? [{ label: "Volume", value: `${formatCompact(toDisplayWeight(volume, unit))} ${unit}` }] : []),
    { label: "Sets", value: String(rows.reduce((t, r) => t + r.sets, 0)) },
  ];

  const pad = story ? 88 : 64;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: `linear-gradient(160deg, #13203a 0%, ${C.bg} 45%)`, color: C.label, padding: pad, fontFamily: "sans-serif", overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 30, color: C.label2 }}>
          <div style={{ display: "flex", width: 44, height: 44, borderRadius: 12, background: C.accent, alignItems: "center", justifyContent: "center", color: "white", fontSize: 26, fontWeight: 700 }}>F</div>
          Fitness AI Tracker
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: story ? 120 : 48 }}>
          <div style={{ fontSize: 34, color: C.label2 }}>{formatDate(w.startedAt, tz, { weekday: "long", day: "numeric", month: "long" })}</div>
          <div style={{ fontSize: story ? 84 : 60, fontWeight: 800, lineHeight: 1.05, marginTop: 8 }}>{title}</div>
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: story ? 56 : 36 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", flex: 1, background: C.card, borderRadius: 28, padding: "24px 28px" }}>
              <div style={{ fontSize: 26, color: C.label2 }}>{s.label}</div>
              <div style={{ fontSize: story ? 52 : 44, fontWeight: 700, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", marginTop: story ? 56 : 36, background: C.card, borderRadius: 32, padding: "12px 32px" }}>
          {shown.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: story ? "26px 0" : "18px 0", borderTop: i ? "2px solid rgba(255,255,255,0.08)" : "none", fontSize: story ? 36 : 32 }}>
              <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 14 }}>
                {r.name}
                {r.pr && <div style={{ display: "flex", fontSize: 22, fontWeight: 700, color: "#1c1c1e", background: C.gold, borderRadius: 999, padding: "4px 14px" }}>PR</div>}
              </div>
              <div style={{ display: "flex", color: C.label2 }}>{`${r.sets} ${r.sets === 1 ? "set" : "sets"} · ${r.best}`}</div>
            </div>
          ))}
          {rows.length > shown.length && <div style={{ display: "flex", padding: "18px 0", fontSize: 28, color: C.label2 }}>{`+ ${rows.length - shown.length} more`}</div>}
        </div>

        <div style={{ display: "flex", marginTop: "auto", fontSize: 28, color: C.label2 }}>
          {prIds.size ? `${prIds.size} personal record${prIds.size > 1 ? "s" : ""} today` : "Logged with an AI coach"}
        </div>
      </div>
    ),
    { ...SIZE[format], headers: { "Cache-Control": "private, no-store" } },
  );
}
