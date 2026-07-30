import { Button } from "./Button";
import {
  ModalBody,
  ModalFooter,
  ModalHeaderMain,
  ModalHeaderShell,
  ModalShell,
  type ModalState,
} from "./Modal";

interface ConfirmDialogProps {
  state: ModalState;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  state,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  isLoading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <ModalShell state={state} size="sm">
      <ModalHeaderShell>
        <ModalHeaderMain>{title}</ModalHeaderMain>
      </ModalHeaderShell>
      <ModalBody>
        <p className="type-body break-words text-primary-light-grey [overflow-wrap:anywhere]">
          {description}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button
          text={cancelLabel}
          width="fit"
          color="primary-grey"
          textColor="fg"
          onClick={state.close}
        />
        <Button
          text={isLoading ? "Working…" : confirmLabel}
          width="fit"
          color={tone === "danger" ? "danger" : "accent"}
          textColor="white"
          disabled={isLoading}
          onClick={() => {
            void onConfirm();
          }}
        />
      </ModalFooter>
    </ModalShell>
  );
}
