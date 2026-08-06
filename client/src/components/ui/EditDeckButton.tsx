import React, { useEffect, useState } from "react";
import { toast } from "sonner";

import { getDeck, updateDeck, type CardDeckUpdate } from "../../api";
import EditIcon from "../../assets/edit.svg";
import { Button } from "./Button";
import {
  CardEditorList,
  DiscoverableToggle,
  FieldLabel,
  fieldInputClass,
} from "./DeckFormFields";
import { IconButton } from "./IconButton";
import {
  ModalBody,
  ModalFooter,
  ModalHeaderMain,
  ModalHeaderShell,
  ModalShell,
  useModalState,
  type ModalState,
} from "./Modal";

interface EditDeckButtonProps {
  deckId: number;
  onSaved?: () => void;
}

export default function EditDeckButton({ deckId, onSaved }: EditDeckButtonProps) {
  const modalState = useModalState();
  return (
    <>
      <IconButton
        icon={EditIcon}
        ariaLabel="Edit Deck"
        onClick={modalState.open}
        small
      />
      <EditDeckModal
        deckId={deckId}
        modalState={modalState}
        onSaved={onSaved}
      />
    </>
  );
}

function EditDeckModal({
  deckId,
  modalState,
  onSaved,
}: {
  deckId: number;
  modalState: ModalState;
  onSaved?: () => void;
}) {
  return (
    <ModalShell state={modalState} size="lg">
      <Form
        deckId={deckId}
        onSuccess={() => {
          onSaved?.();
          modalState.close();
        }}
      />
    </ModalShell>
  );
}

function Form({
  deckId,
  onSuccess,
}: {
  deckId: number;
  onSuccess(): void;
}) {
  const [initialName, setInitialName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isDiscoverable, setIsDiscoverable] = useState(false);

  // Cards with an id will be updated; cards with no id are new.
  const [cards, setCards] = useState<CardDeckUpdate[]>([
    { id: null, question: "", answer: "" },
  ]);

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
      const result = await updateDeck({
        path: { deckId },
        body: {
          name: trimmedName,
          description: description.trim() || "",
          dueDate: dueDate ? `${dueDate}T00:00:00` : null,
          discoverable: isDiscoverable,
          cards: cleanedCards,
        },
      });
      if (result.error) throw result.error;
      toast.success("Deck Updated", {
        description: isDiscoverable
          ? "Marked public — other users can find it in Discover."
          : undefined,
      });
      onSuccess();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to update deck.";
      setErrorMessage(message);
      toast.error("Couldn't Update Deck", { description: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  const title =
    initialName === null ? "Edit Deck" : `Edit '${initialName}'`;

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
      <ModalHeaderShell>
        <ModalHeaderMain>{title}</ModalHeaderMain>
        <p className="type-caption mt-1 text-primary-light-grey">
          Update deck details and cards. Scheduling progress is kept when
          answers change.
        </p>
      </ModalHeaderShell>
      <ModalBody className="flex flex-col gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="edit-deck-name">Deck Name</FieldLabel>
            <input
              id="edit-deck-name"
              className={fieldInputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <FieldLabel htmlFor="edit-description">Description (Optional)</FieldLabel>
            <input
              id="edit-description"
              className={fieldInputClass}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>
        <div>
          <FieldLabel htmlFor="edit-due-date">Due Date (Optional)</FieldLabel>
          <input
            id="edit-due-date"
            type="date"
            className={`${fieldInputClass} max-w-48 [color-scheme:light_dark]`}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <DiscoverableToggle
          id="edit-discoverable"
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
                ? [{ id: null, question: "", answer: "" }]
                : prev.filter((_, idx) => idx !== i),
            )
          }
          onAdd={() =>
            setCards((prev) => [...prev, { id: null, question: "", answer: "" }])
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
              ? "Saving…"
              : `Save Changes (${cards.length} Card${cards.length === 1 ? "" : "s"})`
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
