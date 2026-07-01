interface InputProps {
  placeholderText: string;
  width?: "fit" | "full";
  color?: "accent" | "background" | "white";
  textColor?: "white" | "primary-light-grey" | "accent";
  icon?: string;
  iconPosition?: "left" | "right";
}

export function Input({
  placeholderText,
  width = "fit",
  color = "background",
  textColor = "white",
  icon,
  iconPosition = "left",
}: InputProps) {
  const bgClasses = {
    accent: "bg-accent",
    background: "bg-background",
    white: "bg-white",
  };

  const textClasses = {
    white: "text-white",
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
    <div className="font-inter relative">
      {icon && iconPosition === "left" && (
        <img
          src={icon}
          alt=""
          className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        />
      )}

      <input
        className={`${bgClasses[color]} ${textClasses[textColor]} ${widthClasses[width]} ${iconPaddingClass} border border-primary-light-grey rounded-md p-2 placeholder:text-primary-light-grey`}
        placeholder={placeholderText}
      />

      {icon && iconPosition === "right" && (
        <img
          src={icon}
          alt=""
          className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        />
      )}
    </div>
  );
}
