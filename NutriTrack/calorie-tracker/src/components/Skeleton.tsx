type Props = {
  className?: string;
  circle?: boolean;
  style?: React.CSSProperties;
};

// Neutral loading placeholder — soft pulse on the track colour so it
// looks the same in light and dark themes.
export function Skeleton({ className = "", circle, style }: Props) {
  return (
    <div
      className={`bg-[var(--color-track)] animate-pulse ${
        circle ? "rounded-full" : "rounded-md"
      } ${className}`}
      style={style}
      aria-hidden
    />
  );
}
