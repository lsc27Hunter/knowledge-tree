import { focusRing, hoverGhost, interactive } from "../../lib/interaction";

interface IconButtonProps {
  icon: string;
  ariaLabel: string;
  onClick?: () => void;
  title?: string;
  tone?: "default" | "danger";
  themeIcon?: boolean;
  disabled?: boolean;
}

/** Compact icon action for deck cards / toolbars. */
export function IconButton({
  icon,
  ariaLabel,
  onClick,
  title,
  tone = "default",
  themeIcon = true,
  disabled = false,
}: IconButtonProps) {
  const toneClass =
    tone === "danger"
      ? "hover:border-danger-red/40 hover:bg-danger-red/10"
      : hoverGhost;

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      title={title ?? ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={`${interactive} ${focusRing} inline-flex h-11 w-11 items-center justify-center rounded-lg border border-transparent bg-transparent ${toneClass}`}
    >
      <img
        src={icon}
        alt=""
        className={`h-5 w-5 ${themeIcon ? "theme-icon" : ""}`}
      />
    </button>
  );
}
