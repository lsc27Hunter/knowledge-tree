import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { createDeck, type DeckCreate, type CardCreate } from "../../api";

interface DeckCreationModalProps {
  onClose: () => void;
  onCreated?: () => void;
}

export function DeckCreationModal({
  onClose,
  onCreated,
}: DeckCreationModalProps) {
  const [name, setName] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [cards, setCards] = useState([{ question: "", answer: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [onClose]);

  function addCard() {
    setCards((prev) => [...prev, { question: "", answer: "" }]);
  }

  function updateCardQuestion(index: number, value: string) {
    setCards((prev) =>
      prev.map((card, i) =>
        i === index ? { ...card, question: value } : card,
      ),
    );
  }

  function updateCardAnswer(index: number, value: string) {
    setCards((prev) =>
      prev.map((card, i) => (i === index ? { ...card, answer: value } : card)),
    );
  }

  function removeCard(index: number) {
    setCards((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Deck name is required.");
      return;
    }

    const cleanedCards = cards
      .map((card) => ({
        question: card.question.trim(),
        answer: card.answer.trim(),
      }))
      .filter((card) => card.question.length > 0 || card.answer.length > 0);

    const hasIncompleteCard = cleanedCards.some(
      (card) => card.question.length === 0 || card.answer.length === 0,
    );
    if (hasIncompleteCard) {
      setErrorMessage("Each added card needs both a question and an answer.");
      return;
    }

    const payload: DeckCreate = {
      name: trimmedName,
      description: description.trim() || "",
      dueDate: dueDate ? `${dueDate}T00:00:00` : null,
      cards: cleanedCards as CardCreate[],
    };

    setIsSubmitting(true);
    try {
      await createDeck({ body: payload });
      onCreated?.();
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create deck.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Create Deck"
    >
      <div
        className="w-full max-w-xl rounded-2xl bg-primary-grey p-6 text-white"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-inter text-title-small">Create Deck</h2>
          <button
            type="button"
            className="rounded bg-background px-3 py-1 text-small"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <form
          className="mt-4 max-h-[75vh] overflow-y-auto pr-1"
          onSubmit={onSubmit}
        >
          <label className="mb-3 block text-primary-light-grey">
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 block w-full rounded bg-background px-3 py-2 text-white"
            />
          </label>

          <label className="mb-3 block text-primary-light-grey">
            Due Date (optional)
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="mt-1 block w-full rounded bg-background px-3 py-2 text-white"
            />
          </label>

          <label className="mb-4 block text-primary-light-grey">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1 block w-full rounded bg-background px-3 py-2 text-white"
            />
          </label>

          <div className="mb-2 text-primary-light-grey">Cards</div>
          <div className="space-y-3">
            {cards.map((card, index) => (
              <div
                key={index}
                className="rounded-lg border border-background bg-background/50 p-3"
              >
                <div className="mb-2 text-xsmall text-primary-light-grey">
                  Card {index + 1}
                </div>
                <textarea
                  placeholder="Question (top)"
                  value={card.question}
                  onChange={(event) =>
                    updateCardQuestion(index, event.target.value)
                  }
                  className="mb-2 block min-h-20 w-full rounded bg-background px-3 py-2 text-white"
                />
                <textarea
                  placeholder="Answer (bottom)"
                  value={card.answer}
                  onChange={(event) =>
                    updateCardAnswer(index, event.target.value)
                  }
                  className="block min-h-20 w-full rounded bg-background px-3 py-2 text-white"
                />
                {cards.length > 1 ? (
                  <div className="mt-2 flex justify-end">
                    <button
                      type="button"
                      className="rounded bg-danger-red px-2 py-1 text-xsmall text-white"
                      onClick={() => removeCard(index)}
                    >
                      Remove
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="rounded bg-background px-4 py-2 text-white"
              onClick={addCard}
            >
              + Add Card
            </button>

            <button
              type="submit"
              className="rounded bg-accent px-4 py-2 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Create Deck"}
            </button>
          </div>

          {errorMessage ? (
            <div className="mt-3 text-small text-danger-red">
              {errorMessage}
            </div>
          ) : null}
        </form>
      </div>
    </div>,
    document.body,
  );
}
