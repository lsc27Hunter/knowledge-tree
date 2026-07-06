import { useNavigate } from "react-router-dom";

interface ButtonProps {
  text: string;
  width?: "fit" | "full";
  color?: "accent" | "background" | "white" | "primary-grey";
  textColor?: "white" | "primary-light-grey" | "accent";
  icon?: string;
  iconPosition?: "left" | "right";
  iconSize?: string;
  to?: string;
  onClick?: () => void;
}

export function Button({
  text,
  width = "fit",
  color = "accent",
  textColor = "white",
  icon,
  iconPosition = "right",
  iconSize = "w-4 h-4",
  to,
  onClick,
}: ButtonProps) {
  const bgClasses = {
    accent: "bg-accent",
    background: "bg-background",
    white: "bg-white",
    "primary-grey": "bg-primary-grey",
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

  const navigate = useNavigate();

  return (
    <button
      onClick={() => {
        if (onClick) {
          onClick();
        } else if (to) {
          navigate(to);
        }
      }}
      className={`${bgClasses[color]} ${textClasses[textColor]} ${widthClasses[width]} py-2 px-4 rounded flex items-center justify-center gap-2`}
    >
      {icon && iconPosition === "left" && (
        <img src={icon} alt="" className={iconSize} />
      )}

      {text}

      {icon && iconPosition === "right" && (
        <img src={icon} alt="" className={iconSize} />
      )}
    </button>
  );
}
