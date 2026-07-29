import { useEffect, useState, type ChangeEventHandler, type ReactNode, type SubmitEventHandler } from "react";
import Gear from "../../assets/gear.svg";
import { ModalHeaderMain, ModalHeaderShell, ModalShell, useModalState, type ModalState } from "./Modal";
import { sendTestNotification, updateSettings, getSettings } from "../../api";

export default function SettingsButton() {
  const modalState = useModalState();
  return (
    <>
      <button className="cursor-pointer" onClick={modalState.open}>
        <img src={Gear} alt="settings" />
      </button>
      <Modal modalState={modalState} />
    </>
  );
}

interface ModalProps {
  modalState: ModalState;
}

function Modal({ modalState }: ModalProps) {
  return (
    <ModalShell state={modalState}>
      <ModalContent />
    </ModalShell>
  );
}

function utcFromLocal(local: string) {
  const localSplit = local.split(":");
  const date = new Date();
  date.setHours(parseInt(localSplit[0]));
  date.setMinutes(parseInt(localSplit[1]));
  return date.getUTCHours().toString().padStart(2, "0") + ":" + date.getUTCMinutes().toString().padStart(2, "0");
}

function localFromUtc(utc: string) {
  const utcSplit = utc.split(":");
  const date = new Date();
  date.setUTCHours(parseInt(utcSplit[0]));
  date.setUTCMinutes(parseInt(utcSplit[1]));
  return date.getHours().toString().padStart(2, "0") + ":" + date.getMinutes().toString().padStart(2, "0");
}

function ModalContent() {
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
  };
  return (
    <div className="w-140 max-w-full">
      <Header />
      <form className={`relative px-8 pt-4 pb-6 font-inter max-h-[75vh] overflow-y-auto flex flex-col ${isLoading ? "invisible" : ""}`} onSubmit={onSubmit}>
        {isLoading && <div className="absolute inset-0 w-full h-full flex items-center justify-center z-1 visible">
          Loading...
        </div>}
        <h3 className="font-bold text-lg">Notifications</h3>
        <Notifications state={notificationsState} validateNotificationConditions={validateNotificationConditions} />
        <div className={!notificationsState.checked || !areNotificationsSupported() ? "opacity-55" : ""}>
          <div className="flex mt-6 items-end">
            <div>Schedule notifications for:</div>
            <input className="border border-primary-light-grey rounded scheme-dark ml-3 px-1" type="time" value={notificationTime} onChange={onChangeTime} />
          </div>
          <div className="mt-6">Receive notifications for:</div>
          <DeckNotificationCondition className="ml-3 mt-2" enabled={deckConditionEnabled} cards={deckConditionCards} days={deckConditionDays} setEnabled={setDeckConditionEnabled} setCards={setDeckConditionCards} setDays={setDeckConditionDays} />
          <CardNotificationCondition className="ml-3 mt-2" enabled={cardConditionEnabled} days={cardConditionDays} setEnabled={setCardConditionEnabled} setDays={setCardConditionDays} />
          <StreakNotificationCondition className="ml-3 mt-2" enabled={streakConditionEnabled} days={streakConditionDays} setEnabled={setStreakConditionEnabled} setDays={setStreakConditionDays} />
          {fieldMissing && <div className="text-danger-red mt-4">A field is missing.</div>}
        </div>
        <button className="self-end bg-accent text-white rounded-lg px-4 py-1 mt-8 cursor-pointer">
          {isSaving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
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

function DeckNotificationCondition({ className = "", enabled, cards, days, setEnabled, setCards, setDays }: DeckNotificationConditionProps) {
  const cardOrCards = parseInt(cards) === 1 ? "card" : "cards";
  const hasOrHave = parseInt(cards) === 1 ? "has" : "have";
  const dayOrDays = parseInt(days) === 1 ? "day" : "days";

  return (
    <NotificationConditionShell className={className} enabled={enabled} setEnabled={setEnabled}>
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
    <NotificationConditionShell className={className} enabled={enabled} setEnabled={setEnabled}>
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
    <NotificationConditionShell className={className} enabled={enabled} setEnabled={setEnabled}>
      A streak of <NumberInput value={days} setValue={setDays} /> {dayOrDays}
    </NotificationConditionShell>
  );
}

interface NotificationConditionShellProps {
  className?: string;
  children: ReactNode;
  enabled: boolean;
  setEnabled(enabled: boolean): void;
}

function NotificationConditionShell({ className = "", children, enabled, setEnabled }: NotificationConditionShellProps) {
  const onCheckboxChange: ChangeEventHandler<HTMLInputElement, HTMLInputElement> = e => {
    setEnabled(e.target.checked);
  };
  return (
    <div className={`${className} flex items-start`}>
      <input className="w-4 h-4 shrink-0 mt-1" type="checkbox" checked={enabled} onChange={onCheckboxChange} />
      <div className={`ml-3 ${enabled ? "" : "text-gray-400"}`}>{children}</div>
    </div>
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

function Header() {
  return (
    <ModalHeaderShell>
      <ModalHeaderMain>Settings</ModalHeaderMain>
    </ModalHeaderShell>
  );
}

interface NotificationsState {
  checked: boolean;
  denied: boolean;
  requestChange: ChangeEventHandler<HTMLInputElement, HTMLInputElement>;
}

type NotificationsStatus = "checked" | "unchecked" | "denied";

function useNotificationsState(isSubscribedOnServer: boolean): NotificationsState {
  const [status, setStatus] = useState<NotificationsStatus>("unchecked");
  useEffect(() => {
    if (isSubscribedOnServer) {
      setStatus(Notification.permission === "granted" ? "checked" : "unchecked");
    } else {
      setStatus("unchecked");
    }
  }, [isSubscribedOnServer]);
  const requestChange: ChangeEventHandler<HTMLInputElement, HTMLInputElement> = async e => {
    if (e.target.checked) {
      const res = await Notification.requestPermission();
      if (res === "granted") {
        setStatus("checked");
        await subscribe();
      } else {
        setStatus("denied");
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

interface NotificationsCheckboxProps {
  className?: string;
  state: NotificationsState;
}

function NotificationsCheckbox({ className = "", state }: NotificationsCheckboxProps) {
  return (
    <input className={`${className} w-4 h-4`} type="checkbox" checked={state.checked} onChange={state.requestChange} />
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
          <div className="flex items-baseline mt-4">
          <div className="flex items-center text-white gap-x-3">
            <div>Notifications</div>
            <NotificationsCheckbox state={state} />
          </div>
          <TestNotificationsButton className="ml-6" disabled={!state.checked} validateNotificationConditions={validateNotificationConditions} />
          </div>
          {state.denied && <div className="text-gray-500">Permission was not granted. You may need to grant permission through your browser.</div>}
        </div> :
        <div className="font-bold mt-4">Your browser does not support notifications.</div>
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
  // TODO: error check
  await subscription.unsubscribe();
  return subscription;
}
