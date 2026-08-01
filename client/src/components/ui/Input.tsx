import type { ChangeEventHandler, InputHTMLAttributes } from "react";

interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "width" | "color"> {
  placeholderText?: string;
  width?: "fit" | "full";
  color?: "accent" | "background" | "primary-grey";
  textColor?: "fg" | "primary-light-grey" | "accent";
  icon?: string;
  iconPosition?: "left" | "right";
  themeIcon?: boolean;
  onChange?: ChangeEventHandler<HTMLInputElement>;
}

export function Input({
  placeholderText,
  width = "fit",
  color = "primary-grey",
  textColor = "fg",
  icon,
  iconPosition = "left",
  themeIcon = true,
  className = "",
  ...rest
}: InputProps) {
  const bgClasses = {
    accent: "bg-accent",
    background: "bg-background",
    "primary-grey": "bg-primary-grey",
  };

  const textClasses = {
    fg: "text-fg",
    "primary-light-grey": "text-primary-light-grey",
    accent: "text-accent",
  };

  const widthClasses = {
    fit: "w-fit",
    full: "w-full",
  };

  const iconPaddingClass = icon
    ? iconPosition === "left"
      ? "pl-9"
      : "pr-9"
    : "";

  return (
    <div className={`relative font-inter ${widthClasses[width]}`}>
      {icon && iconPosition === "left" ? (
        <img
          src={icon}
          alt=""
          className={`pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 ${
            themeIcon ? "theme-icon" : ""
          }`}
        />
      ) : null}

      <input
        className={`${bgClasses[color]} ${textClasses[textColor]} ${widthClasses[width]} ${iconPaddingClass} rounded-lg border border-border p-2.5 placeholder:text-primary-light-grey transition-colors focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${className}`}
        placeholder={placeholderText}
        {...rest}
      />

      {icon && iconPosition === "right" ? (
        <img
          src={icon}
          alt=""
          className={`pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 ${
            themeIcon ? "theme-icon" : ""
          }`}
        />
      ) : null}
    </div>
  );
}
