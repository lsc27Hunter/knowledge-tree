import { Button } from "./Button";
import { MasteryBar } from "./MasteryBar";

import { deleteDeck } from "../../api";

import ArrowRight from "../../assets/arrow-right.svg";
import Logo from "../../assets/git_knowledgetree-icon.svg";
import Book from "../../assets/book.svg";
import Clock from "../../assets/clock.svg";
import Danger from "../../assets/danger.svg";
import Trash from "../../assets/trash.svg";
import EditDeckButton from "./EditDeckButton";

interface DeckCardProps {
  deckData: Deck;
}

export interface Deck {
  id: number;
  name: string;
  description: string | null;
  mastery: number;
  dueDate: string | null;
  nextReviewDate: string | null;
  totalCards: number;
  lastStudiedAt: string;
  activeStudySession: boolean;
}

export function DeckCard({ deckData }: DeckCardProps) {
  const deckId = deckData.id;
  const dueDateOnly = deckData.dueDate?.slice(0, 10);
  const todayIsoDate = new Date().toISOString().slice(0, 10);
  const timeUntilNextReview = formatTimeUntilNextReview(deckData.nextReviewDate);

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
        <div className="flex flex-row">
          <EditDeckButton deckId={deckId} />
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
        </div>
      </div>
      <div className="mt-1 min-h-8 text-xsmall text-primary-light-grey">
        {deckData?.description ?? ""}
      </div>
      <div className="mt-3">
        <MasteryBar percentage={deckData.mastery * 100} />
      </div>
      <div className="mt-1 mb-10 text-xsmall text-primary-light-grey">
        <img src={Book} alt="Book" className="inline-block w-4 h-4 mr-1" />{" "}
        {deckData.totalCards} Cards
      </div>
      <div className="mx-auto flex w-9/10 items-center justify-center p-2 sm:w-9/10 font-medium">
        {timeUntilNextReview === null ?
          <Button
            text={deckData.activeStudySession ? "Continue" : "Study"}
            width="full"
            color="accent"
            textColor="white"
            icon={ArrowRight}
            iconPosition="right"
            to={`/study/${deckId}`}
          /> :
          <div className="bg-success-green text-white w-full py-2 px-4 rounded flex items-center justify-center gap-x-2">
            <div>{timeUntilNextReview}</div>
            <img className="w-4 h-4" src={Clock} alt="Clock" />
          </div>
        }
      </div>
    </div>
  );
}

function formatTimeUntilNextReview(nextReviewDate: string | null) {
  if (nextReviewDate === null) return null;
  const next = (new Date(nextReviewDate + "Z")).getTime();
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