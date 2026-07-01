interface ButtonProps {
  text: string;
  width?: "fit" | "full";
  color?: "accent" | "background";
  textColor?: "white" | "primary-light-grey";
}

export function Button({
  text,
  width = "fit",
  color = "accent",
  textColor = "white",
}: ButtonProps) {
  const bgClasses = {
    accent: "bg-accent",
    background: "bg-background",
  };

  const textClasses = {
    white: "text-white",
    "primary-light-grey": "text-primary-light-grey",
  };

  const widthClasses = {
    fit: "w-fit",
    full: "w-full",
  };

  return (
    <button
      className={`${bgClasses[color]} ${textClasses[textColor]} ${widthClasses[width]} py-2 px-4 rounded`}
    >
      {text}
    </button>
  );
}
