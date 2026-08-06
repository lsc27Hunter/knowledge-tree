import { toast } from "sonner";
import { useEffect, useState, type ChangeEventHandler, type ReactNode, type SubmitEventHandler } from "react";
import { sendTestNotification, updateSettings, getSettings } from "../../api";

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
import { fieldInputClass, FieldLabel } from "./DeckFormFields";

export function SettingsButton() {
  const modalState = useModalState();

  function open() {
    modalState.open();
  }

  return (
    <>
      <IconButton
        icon={Gear}
        ariaLabel="Open settings"
        onClick={open}
      />
      <SettingsModal modalState={modalState} />
    </>
  );
}

export function SettingsRowButton({
  modalState,
  onOpen,
}: {
  modalState: ModalState;
  onOpen: () => void;
}) {

  function open() {
    onOpen();
    modalState.open();
  }

  return (
    <button
      type="button"
      className={`${interactive} ${focusRing} flex min-h-11 w-full items-center gap-3 rounded-lg px-3 type-body font-medium text-fg hover:bg-primary-grey/70`}
      onClick={open}
    >
      <img src={Gear} alt="" className="theme-icon h-5 w-5" />
      Settings
    </button>
  );
}

export function SettingsModal({ modalState }: { modalState: ModalState }) {
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

interface NotificationsState {
  checked: boolean;
  denied: boolean;
  requestChange(checked: boolean): void;
}

type NotificationsStatus = "checked" | "unchecked" | "denied";

function useNotificationsState(isSubscribedOnServer: boolean): NotificationsState {
  const [status, setStatus] = useState<NotificationsStatus>("unchecked");
  useEffect(() => {
    // We only consider notifications to be enabled if the user has granted notification
    // permission and their push subscription exists on the server.
    // If the user grants notification permission through their browser, we'll still wait for them
    // to check the notifications checkbox so we can save their push subscription on the server.
    if (isSubscribedOnServer) {
      setStatus(Notification.permission === "granted" ? "checked" : "unchecked");
    } else {
      setStatus("unchecked");
    }
  }, [isSubscribedOnServer]);
  async function requestChange(checked: boolean) {
    if (checked) {
      try {
        if (Notification.permission === "granted") {
          // Check if permission was already granted so we don't show a pop-up pretending that
          // permission was only just granted.
          setStatus("checked");
          await subscribe();
          return;
        }

        const res = await Notification.requestPermission();
        if (res === "granted") {
          setStatus("checked");
          await subscribe();
          toast.success("Notifications permitted");
        } else {
          // User tried checking the checkbox but notification permission was still not granted.
          // They may have declined on the browser prompt or their browser chose not to show it
          // since they declined or ignored the prompt in the past.
          setStatus("denied");
          toast.error("Notifications blocked", {
            description: "You can change this in your browser settings.",
          });
        }
      } catch {
        toast.error("Couldn't update notification permission");
      }
    } else {
      setStatus("unchecked")
      await unsubscribe();
    }
  };
  return {
    checked: status === "checked",
    denied: status === "denied",
    requestChange,
  };
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
  return (
    <section className="flex flex-col gap-3 border-t border-border pt-5">
      <h3 className="type-title text-fg">Notifications</h3>
      <p className="type-caption text-primary-light-grey">
        Optional browser reminders for review sessions.
      </p>
      <NotificationsForm />
    </section>
  );
}

function NotificationsForm() {
  const [isSubscribedOnServer, setIsSubscribedOnServer] = useState(false);
  const notificationsState = useNotificationsState(isSubscribedOnServer);
  const [notificationTime, setNotificationTime] = useState("09:00");
  const [deckConditionEnabled, setDeckConditionEnabled] = useState(true);
  const [deckConditionCards, setDeckConditionCards] = useState("10");
  const [deckConditionDays, setDeckConditionDays] = useState("1");
  const [cardConditionEnabled, setCardConditionEnabled] = useState(true);
  const [cardConditionDays, setCardConditionDays] = useState("3");
  const [streakConditionEnabled, setStreakConditionEnabled] = useState(true);
  const [streakConditionDays, setStreakConditionDays] = useState("3");
  const [fieldMissing, setFieldMissing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  async function fetchSettings() {
    if (!areNotificationsSupported()) return null;
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration === undefined) {
      return null;
    }
    
    const subscription = await registration.pushManager.getSubscription();
    return (await getSettings({ body: { pushSubscription: subscription as any } })).data;
  }

  useEffect(() => {
    setIsLoading(true);
    fetchSettings().then(data => {
      if (data) {
        setIsSubscribedOnServer(data.isSubscribed);
        setNotificationTime(data.notificationTime === null ? "09:00" : localFromUtc(data.notificationTime));
        setDeckConditionEnabled(data.notificationConditions.deck.enabled);
        setDeckConditionCards(data.notificationConditions.deck.cards.toString());
        setDeckConditionDays(data.notificationConditions.deck.days.toString());
        setCardConditionEnabled(data.notificationConditions.card.enabled);
        setCardConditionDays(data.notificationConditions.card.days.toString());
        setStreakConditionEnabled(data.notificationConditions.streak.enabled);
        setStreakConditionDays(data.notificationConditions.streak.days.toString());
      }
      setIsLoading(false);
    });
  }, []);

  const onChangeTime: ChangeEventHandler<HTMLInputElement, HTMLInputElement> = e => {
    setNotificationTime(e.target.value);
  };

  const validateNotificationConditions: ValidateNotificationConditions = () => {
    const hadMissingField = (
      (deckConditionEnabled && (deckConditionCards.trim() === "" || deckConditionDays.trim() === "")) ||
      (cardConditionEnabled && cardConditionDays.trim() === "") ||
      (streakConditionEnabled && streakConditionDays.trim() === "")
    );
    setFieldMissing(hadMissingField);
    if (hadMissingField) {
      return null;
    } else {
      return {
        deck: {
          enabled: deckConditionEnabled,
          cards: parseInt(deckConditionCards),
          days: parseInt(deckConditionDays),
        },
        card: {
          enabled: cardConditionEnabled,
          days: parseInt(cardConditionDays),
        },
        streak: {
          enabled: streakConditionEnabled,
          days: parseInt(streakConditionDays),
        },
      };
    }
  }

  const onSubmit: SubmitEventHandler<HTMLFormElement> = async e => {
    e.preventDefault();
    if (isLoading || !areNotificationsSupported()) return;
    const subscription = await (notificationsState.checked ? subscribe() : unsubscribe());
    const validationResult = validateNotificationConditions();
    if (validationResult === null) {
      return;
    }
    setIsSaving(true);
    await updateSettings({
      body: {
        notificationsEnabled: notificationsState.checked,
        pushSubscription: subscription as any,
        notificationTime: utcFromLocal(notificationTime),
        notificationConditions: validationResult,
      },
    });
    setIsSaving(false);
    toast.success("Settings saved");
  };

  return (
    <form className={`relative font-inter flex flex-col ${isLoading ? "invisible" : ""}`} onSubmit={onSubmit}>
      {isLoading && <div className="absolute inset-0 w-full h-full flex items-center justify-center z-1 visible">Loading...</div>}
      <Notifications state={notificationsState} validateNotificationConditions={validateNotificationConditions} />
      <div className={!notificationsState.checked || !areNotificationsSupported() ? "opacity-55" : ""}>
        <div className="mt-6">
          <FieldLabel htmlFor="notification-time">Scheduled Time</FieldLabel>
          <input
            id="notification-time"
            type="time"
            className={`${fieldInputClass} max-w-48 scheme-light-dark`}
            value={notificationTime}
            onChange={onChangeTime}
          />
        </div>
        <div className="mt-8">
          <FieldLabel>Receive notifications for:</FieldLabel>
        </div>
        <DeckNotificationCondition className="ml-3 mt-1" enabled={deckConditionEnabled} cards={deckConditionCards} days={deckConditionDays} setEnabled={setDeckConditionEnabled} setCards={setDeckConditionCards} setDays={setDeckConditionDays} />
        <CardNotificationCondition className="ml-3 mt-1" enabled={cardConditionEnabled} days={cardConditionDays} setEnabled={setCardConditionEnabled} setDays={setCardConditionDays} />
        <StreakNotificationCondition className="ml-3 mt-1" enabled={streakConditionEnabled} days={streakConditionDays} setEnabled={setStreakConditionEnabled} setDays={setStreakConditionDays} />
        {fieldMissing && <div className="text-danger-red mt-4">A field is missing.</div>}
      </div>
      <button className="self-end bg-accent text-white rounded-lg px-4 py-1 mt-8 cursor-pointer">
        {isSaving ? "Saving..." : "Save"}
      </button>
    </form>
  );
}

interface DeckNotificationConditionProps {
  className?: string;
  enabled: boolean;
  cards: string;
  days: string;
  setEnabled(enabled: boolean): void;
  setCards(cards: string): void;
  setDays(days: string): void;
}

interface DeckNotificationConditionProps {
  className?: string;
  enabled: boolean;
  cards: string;
  days: string;
  setEnabled(enabled: boolean): void;
  setCards(cards: string): void;
  setDays(days: string): void;
}

function DeckNotificationCondition({ className = "", enabled, cards, days, setEnabled, setCards, setDays }: DeckNotificationConditionProps) {
  const cardOrCards = parseInt(cards) === 1 ? "card" : "cards";
  const hasOrHave = parseInt(cards) === 1 ? "has" : "have";
  const dayOrDays = parseInt(days) === 1 ? "day" : "days";

  return (
    <NotificationConditionShell id="deck-notification-condition" className={className} enabled={enabled} setEnabled={setEnabled}>
      A deck with <NumberInput value={cards} setValue={setCards} /> {cardOrCards} that {hasOrHave} been due for <NumberInput value={days} setValue={setDays} /> {dayOrDays}
    </NotificationConditionShell>
  );
}

interface CardNotificationConditionProps {
  className?: string;
  enabled: boolean;
  days: string;
  setEnabled(enabled: boolean): void;
  setDays(days: string): void;
}

function CardNotificationCondition({ className = "", enabled, days, setEnabled, setDays }: CardNotificationConditionProps) {
  const dayOrDays = parseInt(days) === 1 ? "day" : "days";

  return (
    <NotificationConditionShell id="card-notification-condition" className={className} enabled={enabled} setEnabled={setEnabled}>
      A card that has been due for <NumberInput value={days} setValue={setDays} /> {dayOrDays}
    </NotificationConditionShell>
  );
}

interface StreakNotificationConditionProps {
  className?: string;
  enabled: boolean;
  days: string;
  setEnabled(enabled: boolean): void;
  setDays(days: string): void;
}

function StreakNotificationCondition({ className = "", enabled, days, setEnabled, setDays }: StreakNotificationConditionProps) {
  const dayOrDays = parseInt(days) === 1 ? "day" : "days";

  return (
    <NotificationConditionShell id="streak-notification-condition" className={className} enabled={enabled} setEnabled={setEnabled}>
      A streak of <NumberInput value={days} setValue={setDays} /> {dayOrDays}
    </NotificationConditionShell>
  );
}

interface NotificationConditionShellProps {
  className?: string;
  id: string;
  children: ReactNode;
  enabled: boolean;
  setEnabled(enabled: boolean): void;
}

function NotificationConditionShell({ className = "", id, children, enabled, setEnabled }: NotificationConditionShellProps) {
  const onCheckboxChange: ChangeEventHandler<HTMLInputElement, HTMLInputElement> = e => {
    setEnabled(e.target.checked);
  };
  return (
    <label htmlFor={id} className={`${className} flex cursor-pointer items-start gap-2 type-caption font-medium text-primary-light-grey`}>
      <input id={id} className="w-4 h-4 shrink-0 mt-1 accent-accent" type="checkbox" checked={enabled} onChange={onCheckboxChange} />
      <div className={`mt-[0.1rem] ${enabled ? "" : "opacity-70"}`}>{children}</div>
    </label>
  );
}

interface NumberInputProps {
  value: string;
  setValue(value: string): void;
}

function NumberInput({ value, setValue }: NumberInputProps) {
  const onChange: ChangeEventHandler<HTMLInputElement, HTMLInputElement> = e => {
    setValue(e.target.value.replace(/[^0-9]/g, ""));
  };
  return (
    <input className="border rounded border-primary-light-grey min-w-[3ch] px-1 field-sizing-content text-center" value={value} onChange={onChange} maxLength={3} />
  );
}

interface NotificationsCheckboxProps {
  state: NotificationsState;
}

function NotificationsCheckbox({ state }: NotificationsCheckboxProps) {
  const id = "notifications";
  return (
    <label
      htmlFor={id}
      className="flex min-h-11 cursor-pointer items-center gap-2 type-caption font-semibold text-primary-light-grey"
    >
      <input
        id={id}
        type="checkbox"
        className="h-5 w-5 accent-accent"
        checked={state.checked}
        onChange={(e) => state.requestChange(e.target.checked)}
      />
      Notifications
    </label>
  );
}

interface NotificationsProps {
  state: NotificationsState;
  validateNotificationConditions: ValidateNotificationConditions;
}

function Notifications({ state, validateNotificationConditions }: NotificationsProps) {
  return (
    <div className="font-inter flex flex-col">
      {areNotificationsSupported() ?
        <div className="flex flex-col w-full">
          <div className="flex items-center mt-4">
            <div className="flex items-center text-white gap-x-3">
              <NotificationsCheckbox state={state} />
            </div>
            <TestNotificationsButton className="ml-6" disabled={!state.checked} validateNotificationConditions={validateNotificationConditions} />
          </div>
          {state.denied && <p className="type-caption text-danger-red mt-2">Permission was denied. Enable it in your browser settings if you want reminders.</p>}
        </div> :
        <div>Your browser does not support notifications.</div>
      }
    </div>
  );
}

interface TestNotificationsButtonProps {
  className: string;
  disabled: boolean;
  validateNotificationConditions: ValidateNotificationConditions;
}

type ValidateNotificationConditions = () => ValidatedNotificationConditions | null;

function TestNotificationsButton({
  className = "",
  disabled,
  validateNotificationConditions,
}: TestNotificationsButtonProps) {
  async function onClick() {
    // Ensure the user is subscribed so they can receive this test notification.
    const { subscription, newlySubscribed } = await subscribeGeneric();

    const validationResult = validateNotificationConditions();
    if (validationResult === null) return;
    const res = await sendTestNotification({
      body: {
        pushSubscription: subscription as any,
        notificationConditions: validationResult,
      },
    });
    if (newlySubscribed) {
      // We subscribed the user just for this test - unsubscribe them after.
      await subscription.unsubscribe();
    }
    if (res.error) {
      throw res.error;
    }
  }
  return (
    <>
      <button className={`${disabled ? "invisible" : ""} bg-accent text-white cursor-pointer px-4 py-0.5 rounded-lg ${className}`} type="button" disabled={disabled} onClick={onClick}>Test</button>
    </>
  );
}

interface ValidatedNotificationConditions {
  deck: {
    enabled: boolean;
    cards: number;
    days: number;
  };
  card: {
    enabled: boolean;
    days: number;
  };
  streak: {
    enabled: boolean;
    days: number;
  };
}

/** Convert a local time string to a UTC string, both of the form hh:mm (24-hour). */
function utcFromLocal(local: string) {
  const localSplit = local.split(":");
  const date = new Date();
  date.setHours(parseInt(localSplit[0]));
  date.setMinutes(parseInt(localSplit[1]));
  return date.getUTCHours().toString().padStart(2, "0") + ":" + date.getUTCMinutes().toString().padStart(2, "0");
}

/** Convert a UTC string to a local time string, both of the form hh:mm (24-hour). */
function localFromUtc(utc: string) {
  const utcSplit = utc.split(":");
  const date = new Date();
  date.setUTCHours(parseInt(utcSplit[0]));
  date.setUTCMinutes(parseInt(utcSplit[1]));
  return date.getHours().toString().padStart(2, "0") + ":" + date.getMinutes().toString().padStart(2, "0");
}

function areNotificationsSupported() {
  // https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static
  // https://web.dev/articles/push-notifications-subscribing-a-user
  return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

async function subscribe() {
  return (await subscribeGeneric()).subscription;
}

interface SubscribeResult {
  subscription: PushSubscription;
  newlySubscribed: boolean;
}

async function subscribeGeneric(): Promise<SubscribeResult> {
  const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapidPublicKey) {
    throw new Error("Missing VITE_VAPID_PUBLIC_KEY in .env.local");
  }
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    throw new Error("Service worker registration was undefined.");
  }
  const existingSubscription = await registration.pushManager.getSubscription();
  if (existingSubscription !== null) {
    return {
      subscription: existingSubscription,
      newlySubscribed: false,
    };
  }
  const newSubscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: vapidPublicKey,
  });
  return {
    subscription: newSubscription,
    newlySubscribed: true,
  };
}

async function unsubscribe() {
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    throw new Error("Service worker registration was undefined.");
  }
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    return null;
  }
  await subscription.unsubscribe();
  return subscription;
}
