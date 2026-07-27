import { useRef, useState } from "react";
import { toast } from "sonner";

import UploadIcon from "../../assets/upload-file.svg";
import { IconButton } from "./IconButton";
import { MergeDiffModal } from "./MergeDiffModal";
import { useModalState } from "./Modal";

interface MergeDeckButtonProps {
  deckId: number;
  deckName?: string;
  onMerged?: () => void;
}

export default function MergeDeckButton({
  deckId,
  deckName,
  onMerged,
}: MergeDeckButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const previewState = useModalState();
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  function openFilePicker() {
    inputRef.current?.click();
  }

  function onFileSelected(file: File | undefined) {
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please choose a .csv file");
      return;
    }

    setPendingFile(file);
    previewState.open();
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function dismissPreview() {
    setPendingFile(null);
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          onFileSelected(e.target.files?.[0]);
        }}
      />
      <IconButton
        icon={UploadIcon}
        ariaLabel="Merge CSV Into Deck"
        onClick={openFilePicker}
      />
      <MergeDiffModal
        state={previewState}
        deckId={deckId}
        deckName={deckName}
        file={pendingFile}
        onMerged={onMerged}
        onDismiss={dismissPreview}
      />
    </>
  );
}
