import { Dialog } from "@base-ui/react";
import { useState, type ReactNode } from "react";
import X from "../../assets/x.svg";
import { focusRing, interactive } from "../../lib/interaction";

interface ModalShellProps {
  state: ModalState;
  children: ReactNode;
  /** Dialog max-width */
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClass = {
  sm: "w-[min(24rem,calc(100vw-1.5rem))]",
  md: "w-[min(36rem,calc(100vw-1.5rem))]",
  lg: "w-[min(48rem,calc(100vw-1.5rem))]",
  xl: "w-[min(56rem,calc(100vw-1.5rem))]",
};

// Shared dialog: blur backdrop, esc/outside close, light open animation.
export function ModalShell({ state, children, size = "md" }: ModalShellProps) {
  return (
    <Dialog.Root open={state.isOpen} onOpenChange={state.setIsOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop
          className={[
            "fixed inset-0 min-h-dvh bg-overlay/90 backdrop-blur-sm",
            "transition-[opacity,backdrop-filter] duration-200 ease-out",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          ].join(" ")}
        />
        <Dialog.Popup
          className={[
            "fixed top-1/2 left-1/2 z-50 flex max-h-[min(90dvh,56rem)] -translate-x-1/2 -translate-y-1/2",
            "flex-col overflow-hidden rounded-2xl border border-border bg-primary-grey text-fg",
            "shadow-[var(--shadow-card)] outline-none",
            "transition-[opacity,transform] duration-200 ease-out",
            "data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0",
            "data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0",
            sizeClass[size],
          ].join(" ")}
        >
          {children}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function ModalHeaderShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-col border-b border-border px-4 py-3.5 sm:px-5 sm:py-4">
      {children}
    </div>
  );
}

export function ModalHeaderMain({ children }: { children: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <Title>{children}</Title>
      <CloseButton />
    </div>
  );
}

export function ModalBody({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`min-h-0 flex-1 overflow-y-auto px-4 py-4 font-inter sm:px-5 sm:py-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3 sm:gap-3 sm:px-5 sm:py-3.5">
      {children}
    </div>
  );
}

function Title({ children }: { children: string }) {
  return (
    <Dialog.Title className="type-title min-w-0 flex-1 truncate pr-2 text-fg">
      {children}
    </Dialog.Title>
  );
}

function CloseButton() {
  return (
    <Dialog.Close
      className={`${interactive} ${focusRing} -mr-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-surface-raised`}
      aria-label="Close"
    >
      <img className="theme-icon h-5 w-5" src={X} alt="" />
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
