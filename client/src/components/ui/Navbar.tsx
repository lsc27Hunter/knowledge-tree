import { Logo } from "./Logo";
import { Button } from "./Button";

interface NavbarProps {
  version: string;
}

export function Navbar({ version }: NavbarProps) {
  return (
    <div className="sticky top-0 z-50 flex w-full bg-background/95 p-4 border-b border-primary-grey backdrop-blur">
      <Logo />

      {version === "Landing" ? (
        <div className="flex gap-4 ml-auto">
          <Button
            text="Sign In"
            width="fit"
            color="background"
            textColor="primary-light-grey"
          />
          <Button
            text="Get Started"
            width="fit"
            color="accent"
            textColor="white"
          />
        </div>
      ) : (
        <div className="flex gap-4 ml-auto">
          <Button
            text="Dashboard Action"
            width="fit"
            color="accent"
            textColor="white"
          />
        </div>
      )}
    </div>
  );
}
