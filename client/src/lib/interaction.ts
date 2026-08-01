// Shared hover/focus classes so buttons and cards feel consistent.
// Avoid translate/scale on hover (it makes the layout jump).

export const interactive =
  "cursor-pointer transition-[color,background-color,border-color,box-shadow,opacity] duration-150 ease-out disabled:cursor-not-allowed";

export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background";

export const hoverFill = "hover:brightness-[1.06] active:brightness-95";

export const hoverSurface =
  "hover:border-accent/45 hover:bg-surface-raised";

export const hoverGhost = "hover:bg-primary-grey hover:border-border";

export const hoverCard =
  "hover:border-accent/40 hover:shadow-[var(--shadow-card)]";
