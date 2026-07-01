import { Logo } from "./Logo";
import { Link } from "react-router-dom";
import { Button } from "./Button";

import UploadIcon from "../../assets/upload-file.svg";
import Person from "../../assets/PersonIcon.svg";

interface NavbarProps {
  version: "Landing" | "Dashboard" | "Blank";
}

export function Navbar({ version }: NavbarProps) {
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
            to="/login"
          />
          <Button
            text="Get Started"
            width="fit"
            color="accent"
            textColor="white"
            to="/register"
          />
        </div>
      ) : version === "Dashboard" ? (
        <div className="flex gap-4 ml-auto">
          <Button
            text="Upload Deck"
            width="fit"
            color="accent"
            textColor="white"
            icon={UploadIcon}
            iconPosition="right"
          />
          <Button
            text=""
            width="fit"
            color="background"
            textColor="primary-light-grey"
            icon={Person}
            iconPosition="right"
            iconSize="w-8 h-8"
          />
        </div>
      ) : null}
    </div>
  );
}
