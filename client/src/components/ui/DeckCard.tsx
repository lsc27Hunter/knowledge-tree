import { Button } from "./Button";
import { MasteryBar } from "./MasteryBar";

import { deleteDeck } from "../../api";

import ArrowRight from "../../assets/arrow-right.svg";
import Logo from "../../assets/git_knowledgetree-icon.svg";
import Book from "../../assets/book.svg";
import Danger from "../../assets/danger.svg";
import Trash from "../../assets/trash.svg";
import EditDeckButton from "./EditDeckButton";

interface DeckCardProps {
  deckData: {
    id: number;
    name: string;
    description: string | null;
    mastery: number;
    dueDate: string | null;
    totalCards: number;
    lastStudiedAt: string;
  };
}

export function DeckCard({ deckData }: DeckCardProps) {
  const deckId = deckData.id;
  const dueDateOnly = deckData.dueDate?.slice(0, 10);
  const todayIsoDate = new Date().toISOString().slice(0, 10);

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
        <Button
          text="Study"
          width="full"
          color="accent"
          textColor="white"
          icon={ArrowRight}
          iconPosition="right"
          to={`/study/${deckId}`}
        />
      </div>
    </div>
  );
}
