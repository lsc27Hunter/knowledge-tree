import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import {
  createDeck,
  deleteDeck,
  getDiscoverableDeck,
  type CardCreate,
  type DeckGetResponse,
} from "../../api";
import ArrowRight from "../../assets/arrow-right.svg";
import Book from "../../assets/book.svg";
import Clock from "../../assets/clock.svg";
import Danger from "../../assets/danger.svg";
import Preview from "../../assets/preview.svg";
import Trash from "../../assets/trash.svg";
import { Button } from "./Button";
import { ConfirmDialog } from "./ConfirmDialog";
import EditDeckButton from "./EditDeckButton";
import { IconButton } from "./IconButton";
import { MasteryBar } from "./MasteryBar";
import MergeDeckButton from "./MergeDeckButton";
import {
  ModalBody,
  ModalFooter,
  ModalHeaderMain,
  ModalHeaderShell,
  ModalShell,
  useModalState,
  type ModalState,
} from "./Modal";
import { ExportDeckButton, ExportDiscoverableDeckButton} from "./ExportDeckButton";

interface DeckCardProps {
  deckData: Deck;
  onChanged?: () => void;
  /** Show a Friend chip on Discover cards. */
  fromFriend?: boolean;
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
  fromFriend = false,
  hideCreator = false,
  onChanged,
}: DeckCardProps & { isDiscoveryPage?: boolean; hideCreator?: boolean }) {
  const previewModalState = useModalState();
  const deleteModalState = useModalState();
  const [isDeleting, setIsDeleting] = useState(false);
  const deckId = deckData.id;
  const dueDateOnly = deckData.dueDate?.slice(0, 10);
  const todayIsoDate = new Date().toISOString().slice(0, 10);
  const timeUntilNextReview = formatTimeUntilNextReview(
    deckData.nextReviewDate,
  );

  async function handleDelete() {
    setIsDeleting(true);
    const toastId = toast.loading("Deleting deck…");
    try {
      const result = await deleteDeck({ path: { deckId } });
      if (result.error) throw result.error;
      toast.success("Deck deleted", { id: toastId });
      deleteModalState.close();
      onChanged?.();
    } catch (error) {
      toast.error("Couldn't delete deck", {
        id: toastId,
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <article className={`group flex min-h-44 w-full flex-col rounded-2xl border border-border bg-primary-grey p-3 text-fg shadow-sm transition-[border-color,box-shadow] duration-150 hover:border-accent/40 hover:shadow-[var(--shadow-card)] sm:min-h-56 sm:p-4`}>
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {dueDateOnly === todayIsoDate ? (
            <img
              src={Danger}
              alt=""
              className="inline-block h-4 w-4 shrink-0"
              title="Due today"
            />
          ) : null}
          <h3 className="type-title min-w-0 truncate" title={deckData.name}>
            {deckData.name}
          </h3>
          {!isDiscoveryPage && deckData.discoverable ? (
            <span
              className="shrink-0 rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 type-caption font-medium text-accent"
              title="Visible in Discover for other users"
            >
              Public
            </span>
          ) : null}
        </div>
        <div className="-ml-1.5 flex shrink-0 flex-row items-center gap-0.5 self-start opacity-90 transition-opacity group-hover:opacity-100 sm:ml-0 sm:self-auto">
          {isDiscoveryPage ? (
            <IconButton
              icon={Preview}
              ariaLabel="Preview deck"
              onClick={previewModalState.open}
              small
            />
          ) : (
            <>
              <EditDeckButton deckId={deckId} onSaved={onChanged} />
              <MergeDeckButton
                deckId={deckId}
                deckName={deckData.name}
                onMerged={onChanged}
              />
              <ExportDeckButton deckId={deckId} />
              <IconButton
                icon={Trash}
                ariaLabel="Delete deck"
                tone="danger"
                themeIcon={false}
                onClick={deleteModalState.open}
                small
              />
            </>
          )}
        </div>
      </div>

      <p className="type-caption mt-1 line-clamp-2 min-h-8 break-words text-primary-light-grey">
        {deckData.description ?? ""}
      </p>

      {!isDiscoveryPage && deckData.lastStudiedAt ? (
        <div className="mt-3">
          <MasteryBar
            percentage={Number((deckData.mastery * 100).toFixed(0))}
          />
        </div>
      ) : null}

      <div className="type-caption mt-2 mb-6 flex items-center gap-1.5 text-primary-light-grey">
        <img src={Book} alt="" className="theme-icon-soft inline-block h-4 w-4" />
        {deckData.totalCards} {deckData.totalCards === 1 ? "card" : "cards"}
      </div>

      <div className="mt-auto flex w-full items-center justify-center font-medium">
        {isDiscoveryPage ? (
          <Button
            text="Preview & Add"
            width="full"
            color="accent"
            textColor="white"
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
          <div className="flex w-full items-center justify-center gap-x-2 rounded-lg bg-success-green/15 px-4 py-2 text-success-green ring-1 ring-success-green/30">
            <span className="text-small font-medium">{timeUntilNextReview}</span>
            <img className="h-4 w-4" src={Clock} alt="" />
          </div>
        )}
      </div>

      {isDiscoveryPage && !hideCreator ? (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 text-xsmall text-primary-light-grey">
          <span>Created by</span>
          {deckData.creatorUserId ? (
            <Link
              to={`/users/${deckData.creatorUserId}`}
              className="font-medium text-fg underline-offset-2 hover:text-accent hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {deckData.creatorDisplayName ??
                deckData.creatorUsername ??
                "Unknown"}
            </Link>
          ) : (
            <span className="text-fg-subtle">
              {deckData.creatorDisplayName ??
                deckData.creatorUsername ??
                "Unknown"}
            </span>
          )}
          {fromFriend ? (
            <span className="rounded-md border border-accent/30 bg-accent/10 px-1.5 py-0.5 font-medium text-accent">
              Friend
            </span>
          ) : null}
        </div>
      ) : null}

      {isDiscoveryPage ? (
        <PreviewModal deckId={deckId} modalState={previewModalState} />
      ) : (
        <ConfirmDialog
          state={deleteModalState}
          title="Delete Deck?"
          description={`"${deckData.name}" and all of its cards will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete Deck"
          tone="danger"
          isLoading={isDeleting}
          onConfirm={handleDelete}
        />
      )}
    </article>
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
    <ModalShell state={modalState} size="lg">
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
        if (result.error) throw result.error;
        setDeck(result.data ?? null);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to load deck.",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
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

      if (result.error) throw result.error;

      onClose();
      toast.success("Deck added to your dashboard");
      navigate("/dashboard");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to add deck.",
      );
      toast.error("Couldn't add deck", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <ModalHeaderShell>
        <ModalHeaderMain>
          {deck ? `Preview '${deck.name}'` : "Preview Deck"}
        </ModalHeaderMain>
      </ModalHeaderShell>
      <ModalBody>
        {isLoading ? (
          <div className="text-primary-light-grey">Loading deck…</div>
        ) : errorMessage && !deck ? (
          <div className="text-danger-red">{errorMessage}</div>
        ) : deck ? (
          <div className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <ReadOnlyField label="Deck Name" value={deck.name} />
              <ReadOnlyField
                label="Created By"
                value={
                  deck.creatorDisplayName ??
                  deck.creatorUsername ??
                  "Unknown"
                }
                to={
                  deck.creatorUserId
                    ? `/users/${deck.creatorUserId}`
                    : undefined
                }
                onNavigate={onClose}
              />
            </div>
            <ReadOnlyField
              label="Description"
              value={deck.description?.trim() || "No description"}
            />
            <div>
              <div className="mb-2 type-caption font-semibold text-primary-light-grey">
                Cards ({deck.cards.length})
              </div>
              <div className="flex max-h-none flex-col gap-2 md:max-h-72 md:overflow-y-auto">
                {deck.cards.map((card) => (
                  <div
                    key={card.id}
                    className="rounded-lg border border-border bg-background/50 px-3 py-2"
                  >
                    <div className="flex gap-2 type-body">
                      <span className="w-4 shrink-0 text-success-green">Q</span>
                      <span className="min-w-0 break-words text-fg [overflow-wrap:anywhere]">
                        {card.question}
                      </span>
                    </div>
                    <div className="mt-1 flex gap-2 type-body">
                      <span className="w-4 shrink-0 text-accent">A</span>
                      <span className="min-w-0 break-words whitespace-pre-line text-primary-light-grey [overflow-wrap:anywhere]">
                        {card.answer}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {errorMessage ? (
              <div className="text-sm text-danger-red">{errorMessage}</div>
            ) : null}
          </div>
        ) : null}
      </ModalBody>
      {deck ? (
        <ModalFooter>
          <div className="w-full flex justify-end items-center gap-2">
            <ExportDiscoverableDeckButton deckId={deckId} />
            <Button
              text={isSaving ? "Adding…" : "Add To My Dashboard"}
              color="accent"
              textColor="white"
              disabled={isSaving}
              onClick={() => {
                void addToDashboard();
              }}
            />
          </div>
        </ModalFooter>
      ) : null}
    </>
  );
}

function ReadOnlyField({
  label,
  value,
  to,
  onNavigate,
}: {
  label: string;
  value: string;
  to?: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xsmall font-semibold text-primary-light-grey">
        {label}
      </span>
      <div className="rounded-lg border border-border bg-primary-grey px-3 py-2 text-small break-words text-fg [overflow-wrap:anywhere]">
        {to ? (
          <Link
            to={to}
            className="font-medium underline-offset-2 hover:text-accent hover:underline"
            onClick={() => onNavigate?.()}
          >
            {value}
          </Link>
        ) : (
          value
        )}
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
