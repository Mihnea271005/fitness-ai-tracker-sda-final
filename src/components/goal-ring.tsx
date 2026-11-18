/** Activity-style ring for the weekly workout goal. Number + label inside, so it never relies on colour. */
export function GoalRing({ done, goal, size = 132 }: { done: number; goal: number; size?: number }) {
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(done / goal, 1);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent)" strokeOpacity={0.18} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-rounded text-title1 leading-none font-bold">
          {done}
          <span className="text-title3 text-label-2">/{goal}</span>
        </span>
        <span className="mt-1 text-caption1 font-medium text-label-2">workouts</span>
      </div>
    </div>
  );
}
