"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { ExerciseIcon } from "./exercise-icon";
import { ListRow, ListSection } from "./ui/primitives";
import { SegmentedControl, Sheet } from "./ui/interactive";
import { exerciseMeta } from "@/lib/format";
import type { Exercise, ExerciseKind } from "@/lib/types";

type Filter = "all" | ExerciseKind;

/** Bottom sheet for choosing an exercise (used by the workout logger and routine editor). */
export function ExercisePicker({ open, onClose, onPick, exercises }: { open: boolean; onClose: () => void; onPick: (e: Exercise) => void; exercises: Exercise[] }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Filter>("all");
  const list = exercises
    .filter((e) => !e.archived && (kind === "all" || e.kind === kind) && e.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => Number(!a.ownerId) - Number(!b.ownerId) || a.name.localeCompare(b.name)); // own exercises first

  return (
    <Sheet open={open} onClose={onClose} title="Add exercise">
      <label className="mb-3 flex min-h-11 items-center gap-2 rounded-xl bg-fill-3 px-3">
        <Search className="size-4 text-label-2" aria-hidden />
        <span className="sr-only">Search exercises</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-11 flex-1 bg-transparent text-body outline-none placeholder:text-label-2" />
      </label>
      <div className="no-scrollbar mb-3 overflow-x-auto">
        <SegmentedControl<Filter>
          label="Exercise type"
          value={kind}
          onChange={setKind}
          className="min-w-max"
          options={[
            { value: "all", label: "All" },
            { value: "strength", label: "Strength" },
            { value: "bodyweight", label: "Bodyweight" },
            { value: "cardio", label: "Cardio" },
            { value: "timed", label: "Timed" },
          ]}
        />
      </div>
      <ListSection className="mb-2">
        {list.map((e) => (
          <ListRow
            key={e.id}
            leading={<ExerciseIcon kind={e.kind} size="sm" />}
            title={e.name}
            subtitle={exerciseMeta(e)}
            chevron={false}
            trailing={<Plus className="size-5 text-accent" aria-hidden />}
            onClick={() => {
              onPick(e);
              onClose();
            }}
          />
        ))}
        {!list.length && <li className="py-6 pr-4 text-center text-subhead text-label-2">No exercises match “{q}”.</li>}
      </ListSection>
      <Link href="/exercises/new" className="inline-flex min-h-11 items-center text-subhead text-accent">
        Create a custom exercise
      </Link>
    </Sheet>
  );
}
