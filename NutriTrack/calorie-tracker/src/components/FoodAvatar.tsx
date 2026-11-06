"use client";

import { useState } from "react";

type Props = {
  name: string;
  imageUrl: string | null;
  isSeed: boolean;
  size?: number;
};

// Deterministic hue from the name so the same food always gets the same colour.
function hueForName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

export function FoodAvatar({ name, imageUrl, isSeed, size = 36 }: Props) {
  const [errored, setErrored] = useState(false);
  const showImage = imageUrl && !errored;

  if (showImage) {
    // Plain <img> — OFF thumbs vary in dimension, Next.js Image would need
    // remotePatterns config and offers little benefit for 36px thumbs.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt=""
        onError={() => setErrored(true)}
        loading="lazy"
        width={size}
        height={size}
        className="shrink-0 rounded-md object-cover bg-[var(--color-track)]"
        style={{ width: size, height: size }}
      />
    );
  }

  const letter = (name.trim()[0] || "?").toUpperCase();
  const hue = hueForName(name);
  // Seeds use the app accent; OFF-without-image gets a per-name pastel.
  const bg = isSeed
    ? "var(--color-accent)"
    : `hsl(${hue}, 55%, 88%)`;
  const fg = isSeed
    ? "white"
    : `hsl(${hue}, 60%, 30%)`;

  return (
    <div
      className="shrink-0 rounded-md flex items-center justify-center font-semibold"
      style={{
        width: size,
        height: size,
        background: bg,
        color: fg,
        fontSize: Math.round(size * 0.5),
      }}
      aria-hidden
    >
      {letter}
    </div>
  );
}
