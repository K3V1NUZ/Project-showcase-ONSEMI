type Props = {
  label: string;
  consumed: number;
  goal: number;
  unit?: string;
};

export function MacroBar({ label, consumed, goal, unit = "g" }: Props) {
  const ratio = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const over = goal > 0 && consumed > goal;

  return (
    <div className="flex-1">
      <div className="flex items-baseline justify-between text-xs mb-1.5">
        <span className="text-muted font-medium">{label}</span>
        <span className="tabular-nums text-app">
          {Math.round(consumed)}
          <span className="text-muted">
            {" / "}
            {goal}
            {unit}
          </span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--color-track)] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{
            width: `${ratio * 100}%`,
            background: over
              ? "var(--color-over)"
              : "var(--color-accent)",
            transition: "width 400ms ease",
          }}
        />
      </div>
    </div>
  );
}
