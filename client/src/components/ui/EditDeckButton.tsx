import React, { useEffect, useState } from "react";
import { Button } from "./Button";
import EditIcon from "../../assets/edit.svg";
import { getDeck, updateDeck, type CardDeckUpdate } from "../../api";
import {
  ModalHeaderMain,
  ModalHeaderShell,
  ModalShell,
  useModalState,
  type ModalState,
} from "./Modal";
import Papa from "papaparse";

interface EditDeckButtonProps {
  deckId: number;
}

export default function EditDeckButton({ deckId }: EditDeckButtonProps) {
  const modalState = useModalState();
  return (
    <>
      <Button
        text=""
        width="fit"
        color="primary-grey"
        textColor="white"
        onClick={modalState.open}
        icon={EditIcon}
        iconPosition="right"
        iconSize="w-6 h-6"
      />
      <Modal deckId={deckId} modalState={modalState} />
    </>
  );
}

interface ModalProps {
  deckId: number;
  modalState: ModalState;
}

function Modal({ deckId, modalState }: ModalProps) {
  return (
    <ModalShell state={modalState}>
      <Form deckId={deckId} onSuccess={modalState.close} />
    </ModalShell>
  );
}

interface FormProps {
  deckId: number;
  onSuccess(): void;
}

function Form({ deckId, onSuccess }: FormProps) {
  const [initialName, setInitialName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isDiscoverable, setIsDiscoverable] = useState(false);
  const [cards, setCards] = useState<CardDeckUpdate[]>([blankCard()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    getDeck({ path: { deckId } }).then((res) => {
      if (res.data) {
        setInitialName(res.data.name);
        setName(res.data.name);
        setDescription(res.data.description);
        setDueDate(res.data.dueDate?.split("T")[0] ?? "");
        setIsDiscoverable(res.data.discoverable);
        setCards(res.data.cards);
      }
    });
  }, [deckId]);

  function addCard() {
    setCards((prev) => [...prev, blankCard()]);
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
    if (cards.length === 1) {
      setCards(() => [blankCard()]);
    } else {
      setCards((prev) => prev.filter((_, i) => i !== index));
    }
  }

  function blankCard() {
    return { id: null, question: "", answer: "" };
  }

  function exportCsv() {
    const text = Papa.unparse(cards.map(card => [card.question, card.answer]));
    const blob = new Blob([text], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.csv`
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
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
      .map((c) => ({
        id: c.id,
        question: c.question.trim(),
        answer: c.answer.trim(),
      }))
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
      await updateDeck({
        path: {
          deckId,
        },
        body: {
          name: trimmedName,
          description: description.trim() || "",
          dueDate: dueDate ? `${dueDate}T00:00:00` : null,
          discoverable: isDiscoverable,
          cards: cleanedCards,
        },
      });
      onSuccess();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to update deck.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass =
    "px-3 py-2 text-white bg-primary-grey border border-primary-light-grey rounded";

  return (
    <div className="relative w-200 max-w-full">
      <Header initialDeckName={initialName} />
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
                  <button
                    type="button"
                    className="text-primary-light-grey hover:text-white ml-2 cursor-pointer"
                    onClick={() => removeCard(i)}
                  >
                    ✕
                  </button>
                </div>
                <div className="p-3 flex items-start gap-2">
                  <span className="text-success-green w-4">A</span>
                  <textarea
                    className="flex-1 bg-transparent text-white outline-none field-sizing-content"
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

 
          <div className="flex justify-end gap-x-4">
            <button
              type="button"
              onClick={exportCsv}
              className="cursor-pointer bg-primary-light-grey px-4 py-2 rounded-lg mt-2"
            >
              Export CSV
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer bg-accent px-4 py-2 rounded-lg mt-2 disabled:opacity-50"
            >
              {isSubmitting
                ? "Saving..."
                : `Save Changes (${cards.length} card${cards.length !== 1 ? "s" : ""})`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Header({ initialDeckName }: { initialDeckName: string | null }) {
  const title =
    "Edit" + (initialDeckName === null ? "" : ` '${initialDeckName}'`);
  return (
    <ModalHeaderShell>
      <ModalHeaderMain>{title}</ModalHeaderMain>
    </ModalHeaderShell>
  );
}
