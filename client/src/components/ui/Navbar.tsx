import type { ReactNode } from "react";
import { Logo } from "./Logo";
import { Link } from "react-router-dom";
import { Button } from "./Button";
import CreateDeckButton from "./CreateDeckButton";
import SettingsButton from "./SettingsButton";

import Globe from "../../assets/globe.svg";

interface NavbarProps {
  version: "Landing" | "Dashboard" | "Blank";
  userButton?: ReactNode;
  onDeckCreated?: () => void;
}

export function Navbar({ version, userButton, onDeckCreated }: NavbarProps) {
  const isLanding = version === "Landing";

  return (
    <div
      className={`sticky top-0 z-50 flex w-full gap-3 border-b border-primary-grey bg-background/95 p-4 backdrop-blur ${isLanding ? "flex-col items-center sm:flex-row" : "flex-wrap items-center"}`}
    >
      <Link
        to="/dashboard"
        aria-label="Go to home"
        className="flex shrink-0 items-center"
      >
        <Logo />
      </Link>

      {version === "Landing" ? (
        <div className="flex w-full flex-wrap items-center justify-center gap-3 sm:ml-auto sm:w-auto sm:flex-nowrap sm:justify-end sm:gap-4">
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
        <div className="ml-auto flex flex-wrap items-center justify-end gap-3 sm:flex-nowrap sm:gap-4">
          <CreateDeckButton onCreated={onDeckCreated} />
          <SettingsButton />
          <Button
            text=""
            width="fit"
            color="background"
            textColor="white"
            icon={Globe}
            iconPosition="right"
            iconSize="w-6 h-6"
            to="/discovery"
          />
          {userButton}
        </div>
      ) : null}
    </div>
  );
}
