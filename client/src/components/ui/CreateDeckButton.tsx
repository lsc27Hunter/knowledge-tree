import Papa from "papaparse";
import DropZoneIcon from "../../assets/drop-zone.svg";
import React, {
  useEffect,
  useState,
  type ChangeEventHandler,
  type SubmitEventHandler,
} from "react";
import { Button } from "./Button";
import PlusIcon from "../../assets/plus.svg";
import {
  uploadDeck,
  createDeck,
  type DeckCreate,
  type CardCreate,
} from "../../api";
import { ModalHeaderMain, ModalHeaderShell, ModalShell, useModalState, type ModalState } from "./Modal";

interface CreateDeckButtonProps {
  onCreated?: () => void;
}

export default function CreateDeckButton({
  onCreated,
}: CreateDeckButtonProps = {}) {
  const modalState = useModalState();
  return (
    <>
      <Button
        text="Create Deck"
        width="fit"
        color="accent"
        textColor="white"
        onClick={modalState.open}
        icon={PlusIcon}
        iconSize="w-5 h-5"
        iconPosition="right"
        iconOnlyOnMobile
      />
      <Modal modalState={modalState} onCreated={onCreated} />
    </>
  );
}

interface ModalProps {
  modalState: ModalState;
  onCreated?: () => void;
}

function Modal({ modalState, onCreated }: ModalProps) {
  return (
    <ModalShell state={modalState}>
      <ModalContent
        onClose={modalState.close}
        onCreated={onCreated}
      />
    </ModalShell>
  );
}

type Page =
  | { name: "upload" }
  | { name: "confirm"; file: File; fileText: string };

interface ModalContentProps {
  onClose(): void;
  onCreated?: () => void;
}

function ModalContent({ onClose, onCreated }: ModalContentProps) {
  const modalNavState = useModalNavState();
  switch (modalNavState.currentTab) {
    case "Manual":
      return (
        <ManualTab
          modalNavState={modalNavState}
          onSuccess={() => {
            onCreated?.();
            onClose();
          }}
        />
      );
    case "Upload":
      return (
        <UploadTab
          modalNavState={modalNavState}
          onClose={onClose}
          onCreated={onCreated}
        />
      );
  }
}

interface UploadTabProps {
  modalNavState: ModalNavState;
  onClose(): void;
  onCreated?: () => void;
}

function UploadTab({ modalNavState, onClose, onCreated }: UploadTabProps) {
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
          modalNavState={modalNavState}
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
  }
}

interface UploadPageProps {
  modalNavState: ModalNavState;
  onChooseFile(file: File): void;
}

function UploadPage({ modalNavState, onChooseFile }: UploadPageProps) {
  return (
    <>
      <UploadHeader />
      <ModalNav state={modalNavState} />
      <div className="px-8 mt-5">
        <DropZone id="file-upload" onChooseFile={onChooseFile} />
      </div>
      <div className="flex flex-row justify-center gap-x-2 mb-10 mt-8">
        <div className="text-center text-primary-light-grey">
          Don't have a guide to upload?
        </div>
        <button
          type="button"
          className="text-accent font-semibold cursor-pointer"
          onClick={() => modalNavState.setCurrentTab("Manual")}
        >
          Manually create deck
        </button>
      </div>
    </>
  );
}

interface DropZoneProps {
  id: string;
  onChooseFile(file: File): void;
}

function DropZone({ id, onChooseFile }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const chooseFile: ChangeEventHandler<HTMLInputElement, HTMLInputElement> = (
    e,
  ) => {
    const files = e.target.files;
    if (files === null) return;
    if (files.length === 0) return;
    const file = files[0];
    onChooseFile(file);
  };
  const onDrop: React.DragEventHandler<HTMLLabelElement> = e => {
    // Prevent browser's default behavior of downloading the file.
    e.preventDefault();

    for (const item of e.dataTransfer.items) {
      const file = item.getAsFile();
      if (file) {
        onChooseFile(file);
        return;
      }
    }
  };
  const onDragOver: React.DragEventHandler<HTMLLabelElement> = e => {
    // Must cancel dragover event for drop event to fire.
    e.preventDefault();

    setDragOver(true);
  }
  function onDragLeave() {
    setDragOver(false);
  }
  return (
    <>
      <input
        className="-z-1 absolute opacity-0"
        id={id}
        type="file"
        onChange={chooseFile}
      />
      <label
        className={`w-120 max-w-full cursor-pointer py-12 gap-y-6 flex flex-col items-center border border-dashed border-gray-600 rounded-lg ${dragOver ? "bg-primary-grey" : ""}`}
        htmlFor="file-upload"
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        {/* Disabling pointer events prevents the dragleave event from firing when dragging over child elements. */}
        <img className="pointer-events-none h-20" src={DropZoneIcon} alt="close" />
        <div className="pointer-events-none text-white font-semibold">
          Drop your Study Guide Here
        </div>
        <div className="pointer-events-none text-primary-light-grey">or click to browse</div>
      </label>
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
  const [isDiscoverable, setIsDiscoverable] = useState(false);
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
          discoverable: isDiscoverable,
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
  const buttonParsedCountDisplay = parsedCards === null ? "Loading..." : `${parsedCards.length} cards`;
  return (
    <div className="relative w-200 max-w-full">
      <ConfirmHeader parsedCards={parsedCards} />
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
          <label className="mt-3 flex items-center gap-2 text-primary-light-grey font-semibold">
            <input
              className="h-4 w-4 accent-accent"
              type="checkbox"
              checked={isDiscoverable}
              onChange={(e) => setIsDiscoverable(e.target.checked)}
            />
            Discoverable deck
          </label>
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
              : `Create Deck (${buttonParsedCountDisplay})`}
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
              <CardPreview key={i} card={card} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

interface CardPreviewProps {
  card: ParsedCard;
}

function CardPreview({ card }: CardPreviewProps) {
  return (
    <div className="bg-primary-grey border border-primary-light-grey rounded">
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
  );
}

interface ManualTabProps {
  modalNavState: ModalNavState;
  onSuccess(): void;
}

function ManualTab({ modalNavState, onSuccess }: ManualTabProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isDiscoverable, setIsDiscoverable] = useState(false);
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
          discoverable: isDiscoverable,
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
      <ManualHeader />
      <ModalNav state={modalNavState} />
      <div className="px-8 pt-8 pb-8 font-inter max-h-[75vh] overflow-y-auto">
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
          <label className="mt-1 flex items-center gap-2 text-primary-light-grey font-semibold">
            <input
              className="h-4 w-4 accent-accent"
              type="checkbox"
              checked={isDiscoverable}
              onChange={(e) => setIsDiscoverable(e.target.checked)}
            />
            Discoverable deck
          </label>

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

function ManualHeader() {
  return (
    <ModalHeaderShell>
      <ModalHeaderMain>Create study deck</ModalHeaderMain>
    </ModalHeaderShell>
  );
}

function UploadHeader() {
  return (
    <ModalHeaderShell>
      <UploadHeaderMain />
    </ModalHeaderShell>
  );
}

function ConfirmHeader({ parsedCards }: { parsedCards: ParsedCard[] | null }) {
  const parsedCountDisplay =
    parsedCards === null ? "Loading..." : `${parsedCards.length} cards parsed`;
  return (
    <ModalHeaderShell>
      <UploadHeaderMain />
      <div className="text-primary-light-grey leading-none">
        {parsedCountDisplay}
      </div>
    </ModalHeaderShell>
  );
}

function UploadHeaderMain() {
  return (
    <ModalHeaderMain>Upload study deck</ModalHeaderMain>
  );
}

const tabs = ["Manual", "Upload"] as const;
type Tab = typeof tabs[number];

interface ModalNavProps {
  state: ModalNavState;
}

interface ModalNavState {
  currentTab: Tab;
  setCurrentTab(tab: Tab): void;
}

function ModalNav({ state: { currentTab, setCurrentTab} }: ModalNavProps) {
  return (
    <div className="flex font-semibold justify-center items-center gap-x-6 mt-4 text-sm font-inter">
      {tabs.map(tab => {
        if (tab === currentTab) {
          return (
            <button className="flex flex-col items-center cursor-pointer" key={tab}>
              <div className="text-gray-400">{tab}</div>
              <div className="h-0.5 w-[calc(100%-0.25rem)] bg-accent mt-0.5"></div>
            </button>
          );
        } else {
          function onClick() {
            setCurrentTab(tab);
          }
          return (
            <button className="flex flex-col items-center cursor-pointer" key={tab} onClick={onClick}>
              <div className="text-gray-400">{tab}</div>
              <div className="h-0.5 w-[calc(100%-0.25rem)] bg-accent mt-0.5 opacity-0"></div>
            </button>
          );
        }
      })}
    </div>
  );
}

function useModalNavState(): ModalNavState {
  const [currentTab, setCurrentTab] = useState<Tab>(tabs[0]);
  return {
    currentTab,
    setCurrentTab,
  };
}