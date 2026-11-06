"use client";

type Props = {
  date: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

function formatDate(d: Date): { title: string; sub: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const check = new Date(d);
  check.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.round((check.getTime() - today.getTime()) / dayMs);

  let title: string;
  if (diffDays === 0) title = "Today";
  else if (diffDays === -1) title = "Yesterday";
  else if (diffDays === 1) title = "Tomorrow";
  else title = d.toLocaleDateString("en-US", { weekday: "long" });

  const sub = d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
  });

  return { title, sub };
}

export function DayHeader({ date, onPrev, onNext, onToday }: Props) {
  const { title, sub } = formatDate(date);
  const isToday = new Date().toDateString() === date.toDateString();

  return (
    <div className="flex items-center justify-between px-4 py-3">
      <button
        onClick={onPrev}
        className="w-10 h-10 flex items-center justify-center rounded-full active:bg-[var(--color-track)]"
        aria-label="Previous day"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M12 4L6 10L12 16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <button
        onClick={onToday}
        className="flex flex-col items-center leading-tight"
        disabled={isToday}
      >
        <span className="text-lg font-semibold">{title}</span>
        <span className="text-xs text-muted">{sub}</span>
      </button>
      <button
        onClick={onNext}
        className="w-10 h-10 flex items-center justify-center rounded-full active:bg-[var(--color-track)]"
        aria-label="Next day"
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M8 4L14 10L8 16"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
