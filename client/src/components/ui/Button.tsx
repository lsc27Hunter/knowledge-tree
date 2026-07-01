interface ButtonProps {
  text: string;
  width?: string;
  color?: string;
  textColor?: string;
}

export function Button({ text, width, color, textColor }: ButtonProps) {
  return (
    <div
      className={`bg-${color ? color : "accent"} text-${textColor ? textColor : "white"} py-2 px-4 rounded ${width ? `w-${width}` : "w-fit"}`}
    >
      {text}
    </div>
  );
}
