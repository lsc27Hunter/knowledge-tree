import { Dialog } from "@base-ui/react";
import Papa from "papaparse";
import DropZone from "../../assets/drop-zone.svg";
import X from "../../assets/x.svg";
import React, {
  useEffect,
  useState,
  type ChangeEventHandler,
  type SubmitEventHandler,
} from "react";
import { Button } from "./Button";
import UploadIcon from "../../assets/upload-file.svg";
import {
  uploadDeck,
  createDeck,
  type DeckCreate,
  type CardCreate,
} from "../../api";

interface UploadDeckButtonProps {
  onCreated?: () => void;
}

export default function UploadDeckButton({
  onCreated,
}: UploadDeckButtonProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  function open() {
    setIsOpen(true);
  }
  return (
    <>
      <Button
        text="Upload Deck"
        width="fit"
        color="accent"
        textColor="white"
        onClick={open}
        icon={UploadIcon}
        iconPosition="right"
        iconOnlyOnMobile
      />
      <Modal isOpen={isOpen} setIsOpen={setIsOpen} onCreated={onCreated} />
    </>
  );
}

interface ModalState {
  isOpen: boolean;
  setIsOpen(open: boolean): void;
  onCreated?: () => void;
}

function Modal({ isOpen, setIsOpen, onCreated }: ModalState) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 min-h-dvh bg-black opacity-70" />
        <Dialog.Popup className="fixed top-1/2 left-1/2 flex w-fit max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 text-white bg-background border border-gray-600 rounded-2xl">
          <ModalContent
            onClose={() => setIsOpen(false)}
            onCreated={onCreated}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type Page =
  | { name: "upload" }
  | { name: "confirm"; file: File; fileText: string }
  | { name: "manual" };

interface ModalContentProps {
  onClose(): void;
  onCreated?: () => void;
}

function ModalContent({ onClose, onCreated }: ModalContentProps) {
  const [page, setPage] = useState<Page>({ name: "upload" });
  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== "string") return;
      setPage({ name: "confirm", file, fileText: text });
    };
    reader.readAsText(file);
  }
  switch (page.name) {
    case "upload":
      return (
        <UploadPage
          onChooseFile={readFile}
          onManualCreate={() => setPage({ name: "manual" })}
        />
      );
    case "confirm":
      return (
        <ConfirmPage
          file={page.file}
          fileText={page.fileText}
          onSuccess={() => {
            onCreated?.();
            onClose();
          }}
        />
      );
    case "manual":
      return (
        <ManualPage
          onSuccess={() => {
            onCreated?.();
            onClose();
          }}
        />
      );
  }
}

interface UploadPageProps {
  onChooseFile(file: File): void;
  onManualCreate(): void;
}

function UploadPage({ onChooseFile, onManualCreate }: UploadPageProps) {
  const chooseFile: ChangeEventHandler<HTMLInputElement, HTMLInputElement> = (
    e,
  ) => {
    const files = e.target.files;
    if (files === null) return;
    if (files.length === 0) return;
    const file = files[0];
    onChooseFile(file);
  };
  return (
    <>
      <div className="border-b border-gray-600 p-4">
        <HeaderTop />
      </div>
      <div className="p-8">
        <input
          className="-z-1 absolute opacity-0"
          id="file-upload"
          type="file"
          onChange={chooseFile}
        />
        <label
          className="w-120 max-w-full cursor-pointer py-12 gap-y-6 flex flex-col items-center border border-dashed border-gray-600 rounded-lg"
          htmlFor="file-upload"
        >
          <img className="h-20" src={DropZone} alt="close" />
          <div className="text-white font-semibold">
            Drop your Study Guide Here
          </div>
          <div className="text-primary-light-grey">or click to browse</div>
        </label>
      </div>
      <div className="flex flex-row justify-center gap-x-4 mb-15">
        <div className="text-center text-primary-light-grey">
          Don't have a guide to upload?
        </div>
        <button
          type="button"
          className="text-accent font-semibold cursor-pointer"
          onClick={onManualCreate}
        >
          Manually create deck
        </button>
      </div>
    </>
  );
}

interface ConfirmPageProps {
  file: File;
  fileText: string;
  onSuccess(): void;
}

interface ParsedCard {
  question: string;
  answer: string;
}

function ConfirmPage({ file, fileText, onSuccess }: ConfirmPageProps) {
  const initialDeckName = file.name.replace(/\.csv$/, "");
  const [parsedCards, setParsedCards] = useState<ParsedCard[] | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  useEffect(() => {
    Papa.parse(fileText, {
      complete(results) {
        const cards: ParsedCard[] = [];
        for (const row of results.data) {
          if (!Array.isArray(row)) continue;
          if (row.length !== 2) continue;
          const [question, answer] = row;
          cards.push({ question, answer });
        }
        setParsedCards(cards);
        console.log(cards);
      },
    });
  }, [fileText]);
  const onSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    const formData = new FormData(e.target);
    setIsSubmitting(true);
    try {
      await uploadDeck({
        body: {
          deckName: formData.get("deck-name")?.toString() ?? "",
          description: formData.get("description")?.toString() ?? "",
          dueDate: formData.get("dueDate")?.toString() || null,
          file,
        },
      });
      onSuccess();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to upload deck.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  const parsedCountDisplay =
    parsedCards === null ? "Loading..." : `${parsedCards.length} cards parsed`;
  return (
    <div className="relative w-200 max-w-full">
      <div className="border-b border-gray-600 p-4 flex flex-col">
        <HeaderTop />
        <div className="text-primary-light-grey leading-none">
          {parsedCountDisplay}
        </div>
      </div>
      <div className="px-8 pt-4 pb-8 font-inter max-h-100 overflow-y-auto">
        <form className="flex flex-col" onSubmit={onSubmit}>
          <div className="flex">
            <div className="flex flex-col">
              <label
                className="font-semibold text-primary-light-grey"
                htmlFor="deck-name"
              >
                Deck name
              </label>
              <input
                className="px-3 py-2 text-white bg-primary-grey border border-primary-light-grey rounded"
                id="deck-name"
                name="deck-name"
                defaultValue={initialDeckName}
              />
            </div>
            <div className="flex flex-col ml-3">
              <label
                className="font-semibold text-primary-light-grey"
                htmlFor="description"
              >
                Description (Optional)
              </label>
              <input
                className="px-3 py-2 text-white bg-primary-grey border border-primary-light-grey rounded"
                id="description"
                name="description"
              />
            </div>
          </div>
          <label
            className="mt-3 font-semibold text-primary-light-grey"
            htmlFor="due-date"
          >
            Due Date (Optional)
          </label>
          <input
            className="px-3 py-2 w-40 text-white bg-primary-grey border border-primary-light-grey rounded scheme-dark"
            type="date"
            id="due-date"
            name="dueDate"
          />
          {errorMessage ? (
            <div className="mt-2 text-sm text-danger-red">{errorMessage}</div>
          ) : null}
          <button
            className="cursor-pointer bg-accent px-2 py-2 rounded-lg absolute right-16 bottom-4"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? "Uploading..."
              : `Create Deck (${parsedCards === null ? "Loading..." : `${parsedCards.length} cards`})`}
          </button>
        </form>
        <div className="mt-3 font-semibold text-primary-light-grey">
          Preview
        </div>
        <div className="flex flex-col gap-y-4">
          {parsedCards === null ? (
            <div>Loading</div>
          ) : (
            parsedCards.map((card, i) => (
              <div
                className="bg-primary-grey border border-primary-light-grey rounded"
                key={i}
              >
                <div className="border-b border-primary-light-grey p-4">
                  <span className="text-primary-light-grey">Q</span>
                  <span className="ml-2 text-white">{card.question}</span>
                </div>
                <div className="p-4">
                  <div className="text-success-green">A</div>
                  <div className="whitespace-pre-line text-primary-light-grey mt-4">
                    {card.answer}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface ManualPageProps {
  onSuccess(): void;
}

function ManualPage({ onSuccess }: ManualPageProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [cards, setCards] = useState([{ question: "", answer: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function addCard() {
    setCards((prev) => [...prev, { question: "", answer: "" }]);
  }

  function updateCard(
    index: number,
    field: "question" | "answer",
    value: string,
  ) {
    setCards((prev) =>
      prev.map((card, i) => (i === index ? { ...card, [field]: value } : card)),
    );
  }

  function removeCard(index: number) {
    setCards((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Deck name is required.");
      return;
    }

    const cleanedCards = cards
      .map((c) => ({ question: c.question.trim(), answer: c.answer.trim() }))
      .filter((c) => c.question || c.answer);

    if (cleanedCards.length === 0) {
      setErrorMessage("Add at least one card.");
      return;
    }
    if (cleanedCards.some((c) => !c.question || !c.answer)) {
      setErrorMessage("Each card needs both a question and an answer.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createDeck({
        body: {
          name: trimmedName,
          description: description.trim() || "",
          dueDate: dueDate ? `${dueDate}T00:00:00` : null,
          cards: cleanedCards as CardCreate[],
        } as DeckCreate,
      });
      onSuccess();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to create deck.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "px-3 py-2 text-white bg-primary-grey border border-primary-light-grey rounded";

  return (
    <div className="relative w-200 max-w-full">
      <div className="border-b border-gray-600 p-4">
        <HeaderTop />
      </div>
      <div className="px-8 pt-4 pb-8 font-inter max-h-[75vh] overflow-y-auto">
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <div className="flex gap-3">
            <div className="flex flex-col">
              <label
                className="font-semibold text-primary-light-grey"
                htmlFor="manual-deck-name"
              >
                Deck name
              </label>
              <input
                className={inputClass}
                id="manual-deck-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex flex-col">
              <label
                className="font-semibold text-primary-light-grey"
                htmlFor="manual-description"
              >
                Description (Optional)
              </label>
              <input
                className={inputClass}
                id="manual-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-col">
            <label
              className="font-semibold text-primary-light-grey"
              htmlFor="manual-due-date"
            >
              Due Date (Optional)
            </label>
            <input
              className={`${inputClass} w-40 scheme-dark`}
              type="date"
              id="manual-due-date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="mt-2 font-semibold text-primary-light-grey">
            Cards
          </div>
          <div className="flex flex-col gap-3">
            {cards.map((card, i) => (
              <div
                key={i}
                className="bg-primary-grey border border-primary-light-grey rounded"
              >
                <div className="border-b border-primary-light-grey p-3 flex items-center gap-2">
                  <span className="text-primary-light-grey w-4">Q</span>
                  <input
                    className="flex-1 bg-transparent text-white outline-none"
                    placeholder="Question"
                    value={card.question}
                    onChange={(e) => updateCard(i, "question", e.target.value)}
                  />
                  {cards.length > 1 && (
                    <button
                      type="button"
                      className="text-primary-light-grey hover:text-white ml-2 cursor-pointer"
                      onClick={() => removeCard(i)}
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="p-3 flex items-center gap-2">
                  <span className="text-success-green w-4">A</span>
                  <input
                    className="flex-1 bg-transparent text-white outline-none"
                    placeholder="Answer"
                    value={card.answer}
                    onChange={(e) => updateCard(i, "answer", e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="self-start text-accent font-semibold cursor-pointer mt-1"
            onClick={addCard}
          >
            + Add card
          </button>

          {errorMessage && (
            <div className="text-danger-red text-sm mt-1">{errorMessage}</div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="cursor-pointer bg-accent px-4 py-2 rounded-lg self-end mt-2 disabled:opacity-50"
          >
            {isSubmitting
              ? "Creating..."
              : `Create Deck (${cards.length} card${cards.length !== 1 ? "s" : ""})`}
          </button>
        </form>
      </div>
    </div>
  );
}

function HeaderTop() {
  return (
    <div className="flex justify-between items-center">
      <Title />
      <CloseButton />
    </div>
  );
}

function Title() {
  return (
    <Dialog.Title className="font-inter font-bold text-white text-lg">
      Upload study deck
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
