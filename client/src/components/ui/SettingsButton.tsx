import { toast } from "sonner";

import Gear from "../../assets/gear.svg";
import { focusRing, hoverSurface, interactive } from "../../lib/interaction";
import { useTheme } from "../../theme/ThemeProvider";
import { IconButton } from "./IconButton";
import {
  ModalBody,
  ModalHeaderMain,
  ModalHeaderShell,
  ModalShell,
  useModalState,
  type ModalState,
} from "./Modal";

export default function SettingsButton({
  variant = "icon",
  onOpen,
}: {
  variant?: "icon" | "row";
  onOpen?: () => void;
}) {
  const modalState = useModalState();

  function open() {
    onOpen?.();
    modalState.open();
  }

  return (
    <>
      {variant === "row" ? (
        <button
          type="button"
          className={`${interactive} ${focusRing} flex min-h-11 w-full items-center gap-3 rounded-lg px-3 type-body font-medium text-fg hover:bg-primary-grey/70`}
          onClick={open}
        >
          <img src={Gear} alt="" className="theme-icon h-5 w-5" />
          Settings
        </button>
      ) : (
        <IconButton
          icon={Gear}
          ariaLabel="Open settings"
          onClick={open}
        />
      )}
      <SettingsModal modalState={modalState} />
    </>
  );
}

function SettingsModal({ modalState }: { modalState: ModalState }) {
  return (
    <ModalShell state={modalState} size="sm">
      <ModalHeaderShell>
        <ModalHeaderMain>Settings</ModalHeaderMain>
      </ModalHeaderShell>
      <ModalBody className="flex flex-col gap-6">
        <AppearanceSection />
        <NotificationsSection />
      </ModalBody>
    </ModalShell>
  );
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme();

  return (
    <section className="flex flex-col gap-3">
      <h3 className="type-title text-fg">Appearance</h3>
      <p className="type-caption text-primary-light-grey">
        Choose how KnowledgeTree looks on this device.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <ThemeChoice
          label="Dark"
          selected={theme === "dark"}
          onSelect={() => setTheme("dark")}
        />
        <ThemeChoice
          label="Light"
          selected={theme === "light"}
          onSelect={() => setTheme("light")}
        />
      </div>
    </section>
  );
}

function ThemeChoice({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`${interactive} ${focusRing} rounded-xl border px-3 py-3 type-body font-medium ${
        selected
          ? "border-accent bg-accent/10 text-fg ring-1 ring-accent"
          : `border-border bg-primary-grey text-primary-light-grey ${hoverSurface}`
      }`}
    >
      {label}
    </button>
  );
}

function NotificationsSection() {
  const supported = areNotificationsSupported();
  const permission =
    supported && typeof Notification !== "undefined"
      ? Notification.permission
      : "denied";

  async function enableNotifications() {
    if (!supported) return;
    try {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        toast.success("Notifications enabled");
      } else if (result === "denied") {
        toast.error("Notifications blocked", {
          description: "You can change this in your browser settings.",
        });
      }
    } catch {
      toast.error("Couldn't update notification permission");
    }
  }

  return (
    <section className="flex flex-col gap-3 border-t border-border pt-5">
      <h3 className="type-title text-fg">Notifications</h3>
      <p className="type-caption text-primary-light-grey">
        Optional browser reminders for review sessions. Full scheduling is still
        in progress.
      </p>
      {!supported ? (
        <p className="type-caption text-primary-light-grey">
          This browser does not support notifications.
        </p>
      ) : permission === "granted" ? (
        <p className="type-caption text-success-green">Notifications are allowed.</p>
      ) : permission === "denied" ? (
        <p className="type-caption text-danger-red">
          Permission was denied. Enable it in your browser settings if you want
          reminders.
        </p>
      ) : (
        <button
          type="button"
          onClick={() => {
            void enableNotifications();
          }}
          className={`${interactive} ${focusRing} w-fit rounded-lg bg-accent px-3 py-2 type-caption font-medium text-white hover:bg-accent-hover`}
        >
          Allow Notifications
        </button>
      )}
    </section>
  );
}

function areNotificationsSupported() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}
