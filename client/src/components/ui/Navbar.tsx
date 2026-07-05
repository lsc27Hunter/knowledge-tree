import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { Link } from "react-router-dom";
import { Button } from "./Button";

import UploadIcon from "../../assets/upload-file.svg";

interface NavbarProps {
  version: "Landing" | "Dashboard" | "Blank";
  userButton?: ReactNode;
}

export function Navbar({ version, userButton }: NavbarProps) {
  return (
    <div className="sticky top-0 z-50 flex w-full bg-background/95 p-4 border-b border-primary-grey backdrop-blur">
      <Link to="/" aria-label="Go to home">
        <Logo />
      </Link>

      {version === "Landing" ? (
        <div className="flex gap-4 ml-auto">
          <Button
            text="Sign In"
            width="fit"
            color="background"
            textColor="primary-light-grey"
            to="/sign-in"
          />
          <Button
            text="Get Started"
            width="fit"
            color="accent"
            textColor="white"
            to="/sign-up"
          />
        </div>
      ) : version === "Dashboard" ? (
        <div className="flex gap-4 ml-auto items-center">
          <Button
            text="Upload Deck"
            width="fit"
            color="accent"
            textColor="white"
            icon={UploadIcon}
            iconPosition="right"
          />
          {userButton}
        </div>
      ) : null}
    </div>
  );
}
