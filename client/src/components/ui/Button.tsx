import { useNavigate } from "react-router-dom";

interface ButtonProps {
  text: string;
  width?: "fit" | "full";
  color?: "accent" | "background";
  textColor?: "white" | "primary-light-grey" | "accent";
  icon?: string;
  to?: string;
}

export function Button({
  text,
  width = "fit",
  color = "accent",
  textColor = "white",
  icon,
  to,
}: ButtonProps) {
  const bgClasses = {
    accent: "bg-accent",
    background: "bg-background",
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
        if (to) navigate(to);
      }}
      className={`${bgClasses[color]} ${textClasses[textColor]} ${widthClasses[width]} py-2 px-4 rounded flex items-center gap-2`}
    >
      {text}
      {icon && <img src={icon} alt="" className="w-4 h-4" />}
    </button>
  );
}
