"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { ExerciseIcon } from "./exercise-icon";
import { ListRow, ListSection } from "./ui/primitives";
import { SegmentedControl } from "./ui/interactive";
import { exerciseMeta } from "@/lib/format";
import type { Exercise, ExerciseKind } from "@/lib/types";

type Filter = "all" | ExerciseKind;

export function ExerciseLibrary({ exercises }: { exercises: Exercise[] }) {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Filter>("all");

  const list = exercises
    .filter((e) => !e.archived && (kind === "all" || e.kind === kind) && e.name.toLowerCase().includes(q.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  const custom = list.filter((e) => e.ownerId);
  const builtIn = list.filter((e) => !e.ownerId);

  const groups = new Map<string, Exercise[]>();
  for (const e of builtIn) {
    const letter = e.name[0].toUpperCase();
    groups.set(letter, [...(groups.get(letter) ?? []), e]);
  }

  const row = (e: Exercise) => (
    <ListRow key={e.id} href={`/exercises/${e.id}`} leading={<ExerciseIcon kind={e.kind} />} title={e.name} subtitle={exerciseMeta(e)} />
  );

  return (
    <>
      <div className="sticky top-[calc(3.25rem+env(safe-area-inset-top))] z-20 -mx-4 mb-4 bg-bg-grouped/90 px-4 pb-2 backdrop-blur-md md:-mx-8 md:px-8">
        <label className="mb-3 flex min-h-11 items-center gap-2 rounded-xl bg-fill-3 px-3">
          <Search className="size-4 text-label-2" aria-hidden />
          <span className="sr-only">Search exercises</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-11 flex-1 bg-transparent text-body outline-none placeholder:text-label-2" />
        </label>
        <div className="no-scrollbar overflow-x-auto">
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
      </div>

      {custom.length > 0 && <ListSection header="My exercises">{custom.map(row)}</ListSection>}
      {[...groups.entries()].map(([letter, items]) => (
        <ListSection key={letter} header={letter}>
          {items.map(row)}
        </ListSection>
      ))}
      {!list.length && <p className="py-12 text-center text-body text-label-2">No exercises match your search.</p>}
    </>
  );
}
