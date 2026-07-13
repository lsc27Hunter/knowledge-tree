import type { ReactNode } from "react";
import { useState } from "react";
import { Logo } from "./Logo";
import { Link } from "react-router-dom";
import { Button } from "./Button";
import { DeckCreationModal } from "./DeckCreationModal";

import UploadIcon from "../../assets/upload-file.svg";

interface NavbarProps {
  version: "Landing" | "Dashboard" | "Blank";
  userButton?: ReactNode;
  onDeckCreated?: () => void;
}

export function Navbar({ version, userButton, onDeckCreated }: NavbarProps) {
  const isLanding = version === "Landing";

  const [isDeckCreationModalOpen, setIsDeckCreationModalOpen] = useState(false);
  return (
    <div
      className={`sticky top-0 z-50 flex w-full gap-3 border-b border-primary-grey bg-background/95 p-4 backdrop-blur ${isLanding ? "flex-col items-center sm:flex-row" : "flex-wrap items-center"}`}
    >
      {isDeckCreationModalOpen && (
        <DeckCreationModal
          onClose={() => setIsDeckCreationModalOpen(false)}
          onCreated={onDeckCreated}
        />
      )}
      <Link
        to="/"
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
          <Button
            text="Upload Deck"
            width="fit"
            color="accent"
            textColor="white"
            icon={UploadIcon}
            iconPosition="right"
            iconOnlyOnMobile
            onClick={() => setIsDeckCreationModalOpen(true)}
          />
          {userButton}
        </div>
      ) : null}
    </div>
  );
}
