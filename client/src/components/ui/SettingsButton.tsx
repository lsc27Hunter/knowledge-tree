import { useState, type ChangeEventHandler } from "react";
import Gear from "../../assets/gear.svg";
import { ModalHeaderMain, ModalHeaderShell, ModalShell, useModalState, type ModalState } from "./Modal";

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

function ModalContent() {
  return (
    <div className="relative w-80 max-w-full">
      <Header />
      <div className="px-8 pt-4 pb-6 font-inter max-h-[75vh] overflow-y-auto">
        <Notifications />
      </div>
    </div>
  );
}

function Header() {
  return (
    <ModalHeaderShell>
      <ModalHeaderMain>Settings</ModalHeaderMain>
    </ModalHeaderShell>
  );
}

function Notifications() {
  const notificationsSupported = areNotificationsSupported();
  const [name, setName] = useState("");
  const [notifications, setNotifications] = useState(notificationsSupported && Notification.permission === "granted");
  const [permissionDenied, setPermissionDenied] = useState(false);
  const onChangeNotifications: ChangeEventHandler<HTMLInputElement, HTMLInputElement> = e => {
    if (e.target.checked) {
      if (!notificationsSupported) return;
      Notification.requestPermission().then(res => {
        setNotifications(res === "granted");
        setPermissionDenied(res === "denied");
      });
    } else {
      setPermissionDenied(false);
      setNotifications(false);
    }
  };
  function sendNotification() {
    setTimeout(() => {
      new Notification(name);
    }, 1000);
  }
  return (
    <div className="font-inter">
      {notificationsSupported ?
        <div>
          <div className="flex items-center text-white gap-x-2 mt-4">
            <div>Notifications</div>
            <input type="checkbox" checked={notifications} onChange={onChangeNotifications} />
          </div>
          {permissionDenied && <div className="text-gray-500">Permission was not granted. You may need to grant permission through your browser.</div>}
        </div> :
        <div>Your browser does not support notifications.</div>
      }
      <div className="flex flex-col items-start w-full">
        <input
          className="px-3 py-2 text-white bg-primary-grey border border-primary-light-grey rounded mt-6 w-full"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="w-full text-end">
          <button className="bg-accent text-white mt-4 px-4 py-1 rounded-lg cursor-pointer" onClick={sendNotification}>Send!</button>
        </div>
      </div>
    </div>
  );
}

function areNotificationsSupported() {
  // https://developer.mozilla.org/en-US/docs/Web/API/Notification/requestPermission_static
  // https://web.dev/articles/push-notifications-subscribing-a-user
  return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

