import Papa from "papaparse";
import DropZoneIcon from "../../assets/drop-zone.svg";
import React, {
  useEffect,
  useState,
  type ChangeEventHandler,
  type SubmitEventHandler,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";

import {
  createDeck,
  uploadDeck,
  type CardCreate,
  type DeckCreate,
} from "../../api";
import PlusIcon from "../../assets/plus.svg";
import { fadeUp } from "../../lib/motion";
import { focusRing, interactive } from "../../lib/interaction";
import { Button } from "./Button";
import {
  CardEditorList,
  DiscoverableToggle,
  FieldLabel,
  fieldInputClass,
} from "./DeckFormFields";
import {
  ModalBody,
  ModalFooter,
  ModalHeaderMain,
  ModalHeaderShell,
  ModalShell,
  useModalState,
  type ModalState,
} from "./Modal";

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
        themeIcon
        ariaLabel="Create Deck"
      />
      <CreateDeckModal modalState={modalState} onCreated={onCreated} />
    </>
  );
}

function CreateDeckModal({
  modalState,
  onCreated,
}: {
  modalState: ModalState;
  onCreated?: () => void;
}) {
  const nav = useModalNavState();

  function finish() {
    onCreated?.();
    modalState.close();
    nav.setCurrentTab("Manual");
  }

  return (
    <ModalShell state={modalState} size="lg">
      <ModalHeaderShell>
        <ModalHeaderMain>
          {nav.currentTab === "Upload" ? "Upload Study Deck" : "Create Study Deck"}
        </ModalHeaderMain>
        <p className="type-caption mt-1 text-primary-light-grey">
          Build cards manually or import a two-column CSV.
        </p>
      </ModalHeaderShell>
      <ModalNav state={nav} />
      <AnimatePresence mode="wait">
        <motion.div
          key={nav.currentTab}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
        >
          {nav.currentTab === "Manual" ? (
            <ManualTab onSuccess={finish} />
          ) : (
            <UploadTab onSuccess={finish} onSwitchToManual={() => nav.setCurrentTab("Manual")} />
          )}
        </motion.div>
      </AnimatePresence>
    </ModalShell>
  );
}

function ManualTab({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isDiscoverable, setIsDiscoverable] = useState(false);
  const [cards, setCards] = useState([{ question: "", answer: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      const result = await createDeck({
        body: {
          name: trimmedName,
          description: description.trim() || "",
          dueDate: dueDate ? `${dueDate}T00:00:00` : null,
          discoverable: isDiscoverable,
          cards: cleanedCards as CardCreate[],
        } as DeckCreate,
      });
      if (result.error) throw result.error;
      toast.success("Deck Created", {
        description: isDiscoverable
          ? `${cleanedCards.length} cards · public in Discover`
          : `${cleanedCards.length} cards added`,
      });
      onSuccess();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to create deck.";
      setErrorMessage(message);
      toast.error("Couldn't Create Deck", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
      <ModalBody className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="create-deck-name">Deck Name</FieldLabel>
            <input
              id="create-deck-name"
              className={fieldInputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel htmlFor="create-description">Description (Optional)</FieldLabel>
            <input
              id="create-description"
              className={fieldInputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="create-due-date">Due Date (Optional)</FieldLabel>
          <input
            id="create-due-date"
            type="date"
            className={`${fieldInputClass} max-w-48 [color-scheme:light_dark]`}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <DiscoverableToggle
          id="create-discoverable"
          checked={isDiscoverable}
          onChange={setIsDiscoverable}
        />
        <CardEditorList
          cards={cards}
          onChange={(i, field, value) =>
            setCards((prev) =>
              prev.map((card, idx) =>
                idx === i ? { ...card, [field]: value } : card,
              ),
            )
          }
          onRemove={(i) =>
            setCards((prev) =>
              prev.length === 1
                ? [{ question: "", answer: "" }]
                : prev.filter((_, idx) => idx !== i),
            )
          }
          onAdd={() =>
            setCards((prev) => [...prev, { question: "", answer: "" }])
          }
        />
        {errorMessage ? (
          <p className="type-caption text-danger-red">{errorMessage}</p>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button
          type="submit"
          text={
            isSubmitting
              ? "Creating…"
              : `Create Deck (${cards.length} Card${cards.length === 1 ? "" : "s"})`
          }
          width="fit"
          color="accent"
          textColor="white"
          disabled={isSubmitting}
        />
      </ModalFooter>
    </form>
  );
}

function UploadTab({
  onSuccess,
  onSwitchToManual,
}: {
  onSuccess: () => void;
  onSwitchToManual: () => void;
}) {
  const [page, setPage] = useState<
    { name: "upload" } | { name: "confirm"; file: File; fileText: string }
  >({ name: "upload" });

  function readFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text !== "string") return;
      setPage({ name: "confirm", file, fileText: text });
    };
    reader.readAsText(file);
  }

  if (page.name === "confirm") {
    return (
      <ConfirmPage
        file={page.file}
        fileText={page.fileText}
        onSuccess={onSuccess}
        onBack={() => setPage({ name: "upload" })}
      />
    );
  }

  return (
    <ModalBody className="flex flex-col gap-6">
      <DropZone id="file-upload" onChooseFile={readFile} />
      <p className="text-center type-caption text-primary-light-grey">
        Don&apos;t have a guide to upload?{" "}
        <button
          type="button"
          className={`${interactive} ${focusRing} font-semibold text-accent`}
          onClick={onSwitchToManual}
        >
          Manually Create Deck
        </button>
      </p>
    </ModalBody>
  );
}

function ConfirmPage({
  file,
  fileText,
  onSuccess,
  onBack,
}: {
  file: File;
  fileText: string;
  onSuccess: () => void;
  onBack: () => void;
}) {
  const initialDeckName = file.name.replace(/\.csv$/i, "");
  const [parsedCards, setParsedCards] = useState<
    { question: string; answer: string }[] | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDiscoverable, setIsDiscoverable] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deckName, setDeckName] = useState(initialDeckName);
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    Papa.parse(fileText, {
      complete(results) {
        const cards: { question: string; answer: string }[] = [];
        for (const row of results.data) {
          if (!Array.isArray(row) || row.length !== 2) continue;
          cards.push({ question: String(row[0]), answer: String(row[1]) });
        }
        setParsedCards(cards);
      },
    });
  }, [fileText]);

  const onSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const result = await uploadDeck({
        body: {
          deckName: deckName.trim() || initialDeckName,
          description,
          dueDate: dueDate || null,
          discoverable: isDiscoverable ? "true" : "false",
          file,
        },
      });
      if (result.error) throw result.error;
      const count = result.data?.cardsCreated;
      toast.success("Deck Uploaded", {
        description: isDiscoverable
          ? `${typeof count === "number" ? `${count} cards · ` : ""}public in Discover`
          : typeof count === "number"
            ? `${count} cards imported from CSV`
            : undefined,
      });
      onSuccess();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload deck.";
      setErrorMessage(message);
      toast.error("Upload Failed", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
      <ModalBody className="flex flex-col gap-4">
        <p className="type-caption text-primary-light-grey">
          {parsedCards === null
            ? "Parsing CSV…"
            : `${parsedCards.length} Cards Parsed`}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="upload-deck-name">Deck Name</FieldLabel>
            <input
              id="upload-deck-name"
              className={fieldInputClass}
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel htmlFor="upload-description">Description (Optional)</FieldLabel>
            <input
              id="upload-description"
              className={fieldInputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="upload-due-date">Due Date (Optional)</FieldLabel>
          <input
            id="upload-due-date"
            type="date"
            className={`${fieldInputClass} max-w-48 [color-scheme:light_dark]`}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <DiscoverableToggle
          id="upload-discoverable"
          checked={isDiscoverable}
          onChange={setIsDiscoverable}
        />
        <div>
          <div className="type-caption mb-2 font-semibold text-primary-light-grey">
            Preview
          </div>
          <div className="flex max-h-none flex-col gap-2 md:max-h-56 md:overflow-y-auto">
            {parsedCards === null ? (
              <p className="type-caption text-primary-light-grey">Loading…</p>
            ) : (
              parsedCards.map((card, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border bg-background/50 px-3 py-2"
                >
                  <div className="flex gap-2 type-body">
                    <span className="w-4 shrink-0 text-primary-light-grey">Q</span>
                    <span className="min-w-0 break-words text-fg [overflow-wrap:anywhere]">
                      {card.question}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-2 type-body">
                    <span className="w-4 shrink-0 text-success-green">A</span>
                    <span className="min-w-0 break-words whitespace-pre-line text-primary-light-grey [overflow-wrap:anywhere]">
                      {card.answer}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {errorMessage ? (
          <p className="type-caption text-danger-red">{errorMessage}</p>
        ) : null}
      </ModalBody>
      <ModalFooter>
        <Button
          text="Back"
          width="fit"
          color="primary-grey"
          textColor="fg"
          onClick={onBack}
        />
        <Button
          type="submit"
          text={
            isSubmitting
              ? "Uploading…"
              : `Create Deck (${parsedCards?.length ?? "…"} Cards)`
          }
          width="fit"
          color="accent"
          textColor="white"
          disabled={isSubmitting || parsedCards === null}
        />
      </ModalFooter>
    </form>
  );
}

function DropZone({
  id,
  onChooseFile,
}: {
  id: string;
  onChooseFile(file: File): void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const chooseFile: ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    onChooseFile(files[0]);
  };

  return (
    <label
      htmlFor={id}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        for (const item of e.dataTransfer.items) {
          const file = item.getAsFile();
          if (file) {
            onChooseFile(file);
            return;
          }
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      className={`${interactive} flex w-full flex-col items-center gap-y-4 rounded-xl border border-dashed px-4 py-12 transition-colors ${
        dragOver
          ? "border-accent/50 bg-accent/5"
          : "border-border bg-background/40"
      }`}
    >
      <input
        id={id}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={chooseFile}
      />
      <img src={DropZoneIcon} alt="" className="theme-icon h-10 w-10" />
      <div className="pointer-events-none text-center">
        <div className="type-body font-semibold text-fg">Drop CSV Here</div>
        <div className="type-caption mt-1 text-primary-light-grey">
          Or Click To Browse · Prompt, Answer Columns
        </div>
      </div>
    </label>
  );
}

const tabs = ["Manual", "Upload"] as const;
type Tab = (typeof tabs)[number];

interface ModalNavState {
  currentTab: Tab;
  setCurrentTab(tab: Tab): void;
}

function ModalNav({ state }: { state: ModalNavState }) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-6 border-b border-border px-4 pt-1">
      {tabs.map((tab) => {
        const active = tab === state.currentTab;
        return (
          <button
            key={tab}
            type="button"
            className={`${interactive} ${focusRing} flex min-h-11 flex-col items-center justify-center px-3 pt-2 pb-2 type-caption font-semibold ${
              active ? "text-fg" : "text-primary-light-grey"
            }`}
            onClick={() => state.setCurrentTab(tab)}
          >
            {tab}
            <span
              className={`mt-1 h-0.5 w-full rounded-full bg-accent transition-opacity ${
                active ? "opacity-100" : "opacity-0"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}

function useModalNavState(): ModalNavState {
  const [currentTab, setCurrentTab] = useState<Tab>("Manual");
  return { currentTab, setCurrentTab };
}
