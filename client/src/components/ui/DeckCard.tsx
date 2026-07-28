import { useEffect, useState } from "react";
import { Button } from "./Button";
import { MasteryBar } from "./MasteryBar";

import {
  createDeck,
  deleteDeck,
  getDiscoverableDeck,
  type CardCreate,
  type DeckGetResponse,
} from "../../api";

import ArrowRight from "../../assets/arrow-right.svg";
import Logo from "../../assets/git_knowledgetree-icon.svg";
import Book from "../../assets/book.svg";
import Clock from "../../assets/clock.svg";
import Danger from "../../assets/danger.svg";
import Trash from "../../assets/trash.svg";
import EditDeckButton from "./EditDeckButton";
import Preview from "../../assets/preview.svg";
import {
  ModalHeaderMain,
  ModalHeaderShell,
  ModalShell,
  useModalState,
  type ModalState,
} from "./Modal";
import { useNavigate } from "react-router-dom";

interface DeckCardProps {
  deckData: Deck;
}

export interface Deck {
  id: number;
  creatorUserId?: string;
  creatorUsername?: string | null;
  creatorDisplayName?: string;
  name: string;
  description: string | null;
  mastery: number;
  dueDate: string | null;
  nextReviewDate: string | null;
  totalCards: number;
  lastStudiedAt: string;
  activeStudySession: boolean;
  discoverable: boolean;
}

export function DeckCard({
  deckData,
  isDiscoveryPage = false,
}: DeckCardProps & { isDiscoveryPage?: boolean }) {
  const previewModalState = useModalState();
  const deckId = deckData.id;
  const dueDateOnly = deckData.dueDate?.slice(0, 10);
  const todayIsoDate = new Date().toISOString().slice(0, 10);
  const timeUntilNextReview = formatTimeUntilNextReview(
    deckData.nextReviewDate,
  );

  return (
    <div className="min-h-44 w-full rounded-2xl bg-primary-grey p-2 text-white sm:min-h-56 sm:p-4">
      <div className="flex flex-row items-center gap-2">
        {dueDateOnly === todayIsoDate && (
          <img
            src={Danger}
            alt="Due Today"
            className="inline-block w-4 h-4 mr-1"
            title="Due Today"
          />
        )}
        <div className="max-w-[100%] truncate whitespace-nowrap">
          {deckData?.name}
        </div>
        <div className="flex-1" />
        <div className="flex flex-row items-center gap-2">
          {isDiscoveryPage ? (
            <Button
              text=""
              width="fit"
              color="primary-grey"
              textColor="white"
              icon={Preview}
              iconPosition="right"
              iconSize="w-6 h-6"
              ariaLabel="Preview deck"
              onClick={previewModalState.open}
            />
          ) : (
            <EditDeckButton deckId={deckId} />
          )}
          {!isDiscoveryPage && (
            <>
              <Button
                text=""
                width="fit"
                color="primary-grey"
                textColor="white"
                icon={Logo}
                iconPosition="right"
                iconSize="w-6 h-6"
              />
              <Button
                text=""
                width="fit"
                color="primary-grey"
                textColor="white"
                icon={Trash}
                iconPosition="right"
                iconSize="w-6 h-6"
                onClick={async () => {
                  const confirmed = window.confirm(
                    "Are you sure you want to delete this deck? This action cannot be undone.",
                  );
                  if (!confirmed) return;

                  try {
                    await deleteDeck({
                      path: { deckId },
                    });
                    window.location.reload();
                  } catch (error) {
                    console.error("Failed to delete deck:", error);
                  }
                }}
              />
            </>
          )}
        </div>
      </div>
      <div className="mt-1 min-h-8 text-xsmall text-primary-light-grey">
        {deckData?.description ?? ""}
      </div>

      {!isDiscoveryPage && deckData.lastStudiedAt && (
        <div className="mt-3">
          <MasteryBar
            percentage={Number((deckData.mastery * 100).toFixed(0))}
          />
        </div>
      )}
      <div className="mt-1 mb-10 text-xsmall text-primary-light-grey">
        <img src={Book} alt="Book" className="inline-block w-4 h-4 mr-1" />{" "}
        {deckData.totalCards} Cards
      </div>

      <div className="mx-auto flex w-9/10 items-center justify-center p-2 sm:w-9/10 font-medium">
        {isDiscoveryPage ? (
          <Button
            text="Add to my dashboard"
            width="full"
            color="accent"
            textColor="white"
            icon={!isDiscoveryPage ? ArrowRight : undefined}
            iconPosition="right"
            onClick={previewModalState.open}
          />
        ) : timeUntilNextReview === null ? (
          <Button
            text={deckData.activeStudySession ? "Continue" : "Study"}
            width="full"
            color="accent"
            textColor="white"
            icon={ArrowRight}
            iconPosition="right"
            to={`/study/${deckId}`}
          />
        ) : (
          <div className="bg-success-green text-white w-full py-2 px-4 rounded flex items-center justify-center gap-x-2">
            <div>{timeUntilNextReview}</div>
            <img className="w-4 h-4" src={Clock} alt="Clock" />
          </div>
        )}
      </div>
      {isDiscoveryPage ? (
        <div className="mt-1 text-xsmall text-primary-light-grey flex items-center justify-center gap-1">
          Created by{" "}
          {deckData.creatorDisplayName ?? deckData.creatorUsername ?? "Unknown"}
        </div>
      ) : null}
      {isDiscoveryPage ? (
        <PreviewModal deckId={deckId} modalState={previewModalState} />
      ) : null}
    </div>
  );
}

function PreviewModal({
  deckId,
  modalState,
}: {
  deckId: number;
  modalState: ModalState;
}) {
  return (
    <ModalShell state={modalState}>
      <PreviewContent deckId={deckId} onClose={modalState.close} />
    </ModalShell>
  );
}

function PreviewContent({
  deckId,
  onClose,
}: {
  deckId: number;
  onClose(): void;
}) {
  const navigate = useNavigate();
  const [deck, setDeck] = useState<DeckGetResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDeck() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const result = await getDiscoverableDeck({ path: { deckId } });
        if (cancelled) return;
        if (result.error) {
          throw result.error;
        }
        setDeck(result.data ?? null);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load deck.",
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadDeck();

    return () => {
      cancelled = true;
    };
  }, [deckId]);

  async function addToDashboard() {
    if (!deck) return;
    setIsSaving(true);
    setErrorMessage(null);
    try {
      const cards: CardCreate[] = deck.cards.map((card) => ({
        question: card.question,
        answer: card.answer,
      }));

      const result = await createDeck({
        body: {
          name: deck.name,
          description: deck.description ?? "",
          dueDate: deck.dueDate,
          discoverable: false,
          cards,
        },
      });

      if (result.error) {
        throw result.error;
      }

      onClose();
      navigate("/dashboard");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to add deck.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="w-[min(48rem,calc(100vw-3rem))] max-w-full">
      <ModalHeaderShell>
        <ModalHeaderMain>
          {deck ? `Preview '${deck.name}'` : "Preview deck"}
        </ModalHeaderMain>
      </ModalHeaderShell>
      <div className="max-h-[75vh] overflow-y-auto px-8 pb-8 pt-4 font-inter">
        {isLoading ? (
          <div className="text-primary-light-grey">Loading deck...</div>
        ) : errorMessage ? (
          <div className="text-danger-red">{errorMessage}</div>
        ) : deck ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <ReadOnlyField label="Deck name" value={deck.name} />
              <ReadOnlyField
                label="Description"
                value={deck.description ?? ""}
              />
              <ReadOnlyField
                className="text-purple-500"
                label="Created by"
                value={
                  deck.creatorDisplayName ?? deck.creatorUsername ?? "Unknown"
                }
              />
              <ReadOnlyField
                label="Due date"
                value={deck.dueDate ? deck.dueDate.slice(0, 10) : ""}
              />
              <ReadOnlyField
                label="Discoverable"
                value={deck.discoverable ? "Yes" : "No"}
              />
            </div>

            <div className="font-semibold text-primary-light-grey">Cards</div>
            <div className="flex flex-col gap-3">
              {deck.cards.map((card) => (
                <div
                  key={card.id}
                  className="rounded border border-primary-light-grey bg-primary-grey"
                >
                  <div className="flex items-center gap-2 border-b border-primary-light-grey p-3">
                    <span className="w-4 text-primary-light-grey">Q</span>
                    <div className="text-white">{card.question}</div>
                  </div>
                  <div className="flex items-start gap-2 p-3">
                    <span className="w-4 text-success-green">A</span>
                    <div className="whitespace-pre-line text-white">
                      {card.answer}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {errorMessage ? (
              <div className="text-danger-red text-sm">{errorMessage}</div>
            ) : null}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                text="Close"
                width="fit"
                color="background"
                textColor="primary-light-grey"
                onClick={onClose}
              />
              <Button
                text={isSaving ? "Adding..." : "Save to my dashboard"}
                width="fit"
                color="accent"
                textColor="white"
                onClick={addToDashboard}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ReadOnlyField({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="font-semibold text-primary-light-grey">{label}</label>
      <div
        className={`rounded border border-primary-light-grey bg-primary-grey px-3 py-2 text-white ${className}`}
      >
        {value || "-"}
      </div>
    </div>
  );
}

function formatTimeUntilNextReview(nextReviewDate: string | null) {
  if (nextReviewDate === null) return null;
  const next = new Date(nextReviewDate + "Z").getTime();
  if (Number.isNaN(next)) return null;
  const seconds = Math.ceil((next - Date.now()) / 1000);
  if (seconds <= 1) return null;
  if (seconds < 60) return formatTime(seconds, "second");
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return formatTime(minutes, "minute");
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return formatTime(hours, "hour");
  const days = Math.ceil(hours / 24);
  return formatTime(days, "day");
}

function formatTime(number: number, unit: string) {
  const formattedUnit = number === 1 ? unit : `${unit}s`;
  return `${number} ${formattedUnit}`;
}
