"use client";

import { useState, useTransition } from "react";
import { Button } from "./ui/primitives";
import { addSampleWorkouts } from "@/app/(app)/workout/actions";

export function SampleDataButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        variant="gray"
        className="w-full"
        disabled={pending}
        aria-busy={pending}
        onClick={() =>
          start(async () => {
            const res = await addSampleWorkouts();
            if (res.error) setError(res.error);
          })
        }
      >
        {pending ? "Adding sample workouts…" : "Add 12 weeks of sample workouts"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-subhead text-red-text">
          {error}
        </p>
      )}
    </div>
  );
}
