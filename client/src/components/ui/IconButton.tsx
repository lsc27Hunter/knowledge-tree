import { focusRing, hoverGhost, interactive } from "../../lib/interaction";

interface IconButtonProps {
  icon: string;
  ariaLabel: string;
  onClick?: () => void;
  title?: string;
  tone?: "default" | "danger";
  themeIcon?: boolean;
  disabled?: boolean;
  small?: boolean;
  smallIcon?: boolean;
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
  small = false,
  smallIcon = false,
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
      className={`${interactive} ${focusRing} inline-flex ${small ? "w-10 h-10" : "h-11 w-11"} items-center justify-center rounded-lg border border-transparent bg-transparent ${toneClass}`}
    >
      <img
        src={icon}
        alt=""
        className={`${smallIcon ? "h-4 w-4" : "h-5 w-5"} ${themeIcon ? "theme-icon" : ""}`}
      />
    </button>
  );
}
