import {
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { useAuth } from "@clerk/react";
import { Link, NavLink } from "react-router-dom";

import { Logo } from "./Logo";
import { Button } from "./Button";
import CreateDeckButton from "./CreateDeckButton";
import { SettingsButton, SettingsRowButton, SettingsModal } from "./SettingsButton";
import { ThemeToggle } from "./ThemeToggle";
import { focusRing, interactive } from "../../lib/interaction";

import ArrowLeft from "../../assets/arrow-right.svg";
import { useModalState } from "./Modal";

interface NavbarProps {
  version: "Landing" | "Dashboard" | "Discovery" | "Friends" | "Blank" | "Study";
  userButton?: ReactNode;
  onDeckCreated?: () => void;
}

// Desktop: Logo · Decks | Discover | Friends …… Create · theme · settings · user
// Mobile (<md): Logo …… Create · hamburger sheet
export function Navbar({ version, userButton, onDeckCreated }: NavbarProps) {
  const { isSignedIn } = useAuth();
  const homeTo = isSignedIn ? "/dashboard" : "/";
  const showAppNav =
    version === "Dashboard" ||
    version === "Discovery" ||
    version === "Friends";
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [version]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-3 sm:px-6 lg:px-8">
        <Link
          to={homeTo}
          aria-label={isSignedIn ? "Go to dashboard" : "Go to home"}
          className={`${interactive} ${focusRing} flex min-w-0 shrink items-center rounded-md hover:opacity-85`}
          onClick={() => setMenuOpen(false)}
        >
          <Logo />
        </Link>

        {/* Desktop primary nav */}
        {showAppNav ? (
          <nav
            aria-label="Primary"
            className="ml-3 hidden min-w-0 items-center gap-1 md:flex"
          >
            <NavItem to="/dashboard" label="Decks" />
            <NavItem to="/discovery" label="Discover" />
            <NavItem to="/friends" label="Friends" />
          </nav>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2.5">
          {version === "Landing" ? (
            <>
              <div className="hidden items-center gap-2 md:flex">
                <ThemeToggle />
                <Button
                  text="Sign In"
                  width="fit"
                  color="ghost"
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
              <div className="flex items-center gap-1.5 md:hidden">
                <Button
                  text="Get Started"
                  width="fit"
                  color="accent"
                  textColor="white"
                  to="/sign-up"
                />
                <MenuToggle
                  open={menuOpen}
                  onToggle={() => setMenuOpen((o) => !o)}
                />
              </div>
            </>
          ) : null}

          {showAppNav ? (
            <>
              <CreateDeckButton onCreated={onDeckCreated} />
              {/* Desktop utilities */}
              <div className="hidden items-center gap-2 md:flex">
                <div
                  className="mx-0.5 h-6 w-px bg-border"
                  aria-hidden="true"
                />
                <ThemeToggle />
                <SettingsButton />
                {userButton}
              </div>
              {/* Mobile menu toggle */}
              <div className="md:hidden">
                <MenuToggle
                  open={menuOpen}
                  onToggle={() => setMenuOpen((o) => !o)}
                />
              </div>
            </>
          ) : null}

          {version === "Study" ? (
            <>
              <div className="hidden md:block">
                <ThemeToggle />
              </div>
              <Button
                text="Exit"
                width="fit"
                color="primary-grey"
                textColor="fg"
                icon={ArrowLeft}
                iconPosition="left"
                iconSize="w-4 h-4 rotate-180"
                themeIcon
                iconOnlyOnMobile
                ariaLabel="Back to dashboard"
                to="/dashboard"
              />
              <div className="md:hidden">
                <MenuToggle
                  open={menuOpen}
                  onToggle={() => setMenuOpen((o) => !o)}
                />
              </div>
            </>
          ) : null}

          {version === "Blank" ? <ThemeToggle /> : null}
        </div>
      </div>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        version={version}
        showAppNav={showAppNav}
        userButton={userButton}
      />
    </header>
  );
}

function MobileMenu({
  open,
  onClose,
  version,
  showAppNav,
  userButton,
}: {
  open: boolean;
  onClose: () => void;
  version: NavbarProps["version"];
  showAppNav: boolean;
  userButton?: ReactNode;
}) {
  const titleId = useId();
  const settingsModalState = useModalState();

  return (
    <>
      <AnimatePresence>
        {open ? (
          <>
            <motion.button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 top-16 z-40 bg-overlay/50 backdrop-blur-[2px] md:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={onClose}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="absolute inset-x-0 top-16 z-50 border-b border-border bg-background shadow-[var(--shadow-card)] md:hidden"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="mx-auto flex max-w-7xl flex-col gap-1 px-3 py-3 sm:px-6">
                <p id={titleId} className="sr-only">
                  Menu
                </p>

                {showAppNav ? (
                  <nav aria-label="Primary" className="flex flex-col gap-1">
                    <MobileNavItem to="/dashboard" label="Decks" onNavigate={onClose} />
                    <MobileNavItem to="/discovery" label="Discover" onNavigate={onClose} />
                    <MobileNavItem to="/friends" label="Friends" onNavigate={onClose} />
                  </nav>
                ) : null}

                {version === "Landing" ? (
                  <nav aria-label="Account" className="flex flex-col gap-1">
                    <MobileLinkItem to="/sign-in" label="Sign In" onNavigate={onClose} />
                  </nav>
                ) : null}

                {version === "Study" ? (
                  <nav aria-label="Study" className="flex flex-col gap-1">
                    <MobileLinkItem
                      to="/dashboard"
                      label="Back To Dashboard"
                      onNavigate={onClose}
                    />
                  </nav>
                ) : null}

                <div
                  className={`flex flex-col gap-1 ${
                    showAppNav || version === "Landing" || version === "Study"
                      ? "mt-2 border-t border-border pt-2"
                      : ""
                  }`}
                >
                  <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3">
                    <span className="type-body font-medium text-fg">Theme</span>
                    <ThemeToggle />
                  </div>

                  {showAppNav ? (
                    <>
                      <SettingsRowButton modalState={settingsModalState} onOpen={() => setTimeout(onClose, 65)} />
                      {userButton ? (
                        <div className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-3">
                          <span className="type-body font-medium text-fg">Account</span>
                          <div className="flex items-center">{userButton}</div>
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
      <SettingsModal modalState={settingsModalState} />
    </>
  );
}

function MenuToggle({
  open,
  onToggle,
}: {
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      className={`${interactive} ${focusRing} inline-flex h-11 w-11 items-center justify-center rounded-lg border border-border bg-primary-grey text-fg`}
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      onClick={onToggle}
    >
      <span className="sr-only">{open ? "Close" : "Menu"}</span>
      <HamburgerIcon open={open} />
    </button>
  );
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
      className="text-fg"
    >
      {open ? (
        <>
          <path
            d="M4 4L14 14"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M14 4L4 14"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <path
            d="M3 5H15"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M3 9H15"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
          <path
            d="M3 13H15"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `${interactive} ${focusRing} inline-flex min-h-11 items-center rounded-lg px-3 py-2 type-body font-medium ${
          isActive
            ? "bg-primary-grey text-fg"
            : "text-primary-light-grey hover:bg-primary-grey/70 hover:text-fg"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

function MobileNavItem({
  to,
  label,
  onNavigate,
}: {
  to: string;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `${interactive} ${focusRing} flex min-h-11 items-center rounded-lg px-3 type-body font-medium ${
          isActive
            ? "bg-primary-grey text-fg"
            : "text-primary-light-grey hover:bg-primary-grey/70 hover:text-fg"
        }`
      }
    >
      {label}
    </NavLink>
  );
}

function MobileLinkItem({
  to,
  label,
  onNavigate,
}: {
  to: string;
  label: string;
  onNavigate: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={`${interactive} ${focusRing} flex min-h-11 items-center rounded-lg px-3 type-body font-medium text-fg hover:bg-primary-grey/70`}
    >
      {label}
    </Link>
  );
}
