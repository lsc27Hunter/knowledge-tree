import { Dialog } from "@base-ui/react";
import { useState, type ReactNode } from "react";
import X from "../../assets/x.svg";

interface ModalShellProps {
  state: ModalState;
  children: ReactNode;
}

export function ModalShell({ state, children }: ModalShellProps) {
  return (
    <Dialog.Root open={state.isOpen} onOpenChange={state.setIsOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 min-h-dvh bg-black opacity-70" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 flex w-fit max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 flex-col text-white bg-background border border-gray-600 rounded-2xl">
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ModalHeaderShell({ children }: { children: ReactNode }) {
  return (
    <div className="border-b border-gray-600 p-4 flex flex-col">
      {children}
    </div>
  );
}

export function ModalHeaderMain({ children }: { children: string }) {
  return (
    <div className="flex justify-between items-center">
      <Title>{children}</Title>
      <CloseButton />
    </div>
  );
}

function Title({ children }: { children: string }) {
  return (
    <Dialog.Title className="font-inter font-bold text-white text-lg">
      {children}
    </Dialog.Title>
  );
}

function CloseButton() {
  return (
    <Dialog.Close className="cursor-pointer p-1">
      <img className="h-4" src={X} alt="close" />
    </Dialog.Close>
  );
}

export interface ModalState {
  isOpen: boolean;
  setIsOpen(isOpen: boolean): void;
  open(): void;
  close(): void;
}

export function useModalState() {
  const [isOpen, setIsOpen] = useState(false);
  function open() {
    setIsOpen(true);
  }
  function close() {
    setIsOpen(false);
  }
  return { isOpen, setIsOpen, open, close };
}