import { useNavigate } from "react-router-dom";
import {
  focusRing,
  hoverFill,
  hoverGhost,
  hoverSurface,
  interactive,
} from "../../lib/interaction";

interface ButtonProps {
  text: string;
  width?: "fit" | "full";
  color?: "accent" | "background" | "white" | "primary-grey" | "danger" | "ghost";
  textColor?: "white" | "primary-light-grey" | "accent" | "fg";
  icon?: string;
  iconPosition?: "left" | "right";
  iconSize?: string;
  iconOnlyOnMobile?: boolean;
  themeIcon?: boolean;
  ariaLabel?: string;
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

export function Button({
  text,
  width = "fit",
  color = "accent",
  textColor = "white",
  icon,
  iconPosition = "right",
  iconSize = "w-4 h-4",
  iconOnlyOnMobile = false,
  themeIcon = false,
  ariaLabel,
  to,
  onClick,
  disabled = false,
  type = "button",
}: ButtonProps) {
  const bgClasses = {
    accent: `bg-accent shadow-sm ${hoverFill}`,
    background: `bg-background border border-border ${hoverSurface}`,
    white: "bg-white text-background hover:opacity-90",
    "primary-grey": `bg-primary-grey border border-border ${hoverSurface}`,
    danger: `bg-danger-red shadow-sm ${hoverFill}`,
    ghost: `bg-transparent border border-transparent ${hoverGhost}`,
  };

  const textClasses = {
    white: "text-white",
    "primary-light-grey": "text-primary-light-grey",
    accent: "text-accent",
    fg: "text-fg",
  };

  const widthClasses = {
    fit: "w-fit",
    full: "w-full",
  };

  const navigate = useNavigate();
  const isIconOnly = !text;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={() => {
        if (disabled) return;
        onClick?.();
        if (to) navigate(to);
      }}
      aria-label={
        ariaLabel ??
        (iconOnlyOnMobile || isIconOnly ? text || "Button" : undefined)
      }
      className={`${interactive} ${focusRing} ${bgClasses[color]} ${textClasses[textColor]} ${widthClasses[width]} ${
        iconOnlyOnMobile || isIconOnly
          ? "min-h-11 min-w-11 p-2.5 sm:min-w-0 sm:px-3 sm:py-2.5"
          : "min-h-11 px-4 py-2.5"
      } rounded-lg flex items-center justify-center gap-2 type-body font-medium`}
    >
      {icon && iconPosition === "left" && (
        <img
          src={icon}
          alt=""
          className={`${iconSize} ${themeIcon ? "theme-icon" : ""}`}
        />
      )}

      {text ? (
        <span className={iconOnlyOnMobile ? "hidden sm:inline" : undefined}>
          {text}
        </span>
      ) : null}

      {icon && iconPosition === "right" && (
        <img
          src={icon}
          alt=""
          className={`${iconSize} ${themeIcon ? "theme-icon" : ""}`}
        />
      )}
    </button>
  );
}
