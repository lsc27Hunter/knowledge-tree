import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { useParams } from "react-router-dom";

import {
  completeStudySession,
  reviewCard,
  study,
  type StudySessionCardResponse,
  type StudySessionResponse,
} from "../api";
import ArrowRight from "../assets/arrow-right-thin.svg";
import GreenCheckSquare from "../assets/green-check-square.svg";
import RedXSquare from "../assets/red-x-square.svg";
import YellowSquare from "../assets/yellow-square.svg";
import { Button } from "../components/ui/Button";
import { Navbar } from "../components/ui/Navbar";
import { PageShell } from "../components/ui/PageShell";
import { Spinner } from "../components/ui/Spinner";
import { focusRing, interactive } from "../lib/interaction";
import { fadeUp, slideHorizontal } from "../lib/motion";

const StudyPage: React.FC = () => {
  return (
    <>
      <Navbar version="Study" />
      <StudySection />
    </>
  );
};

type StudySectionPage = "cards" | "results";
type CardId = number;
type Card = StudySessionCardResponse;
type Rating = "red" | "yellow" | "green";
type RateResult = "rated" | "unrated";

type StudyState = ReturnType<typeof useStudyState>

function useStudyState() {
  const deckId = parseInt(useParams().deckId!);
  const [studySession, setStudySession] = useState<StudySessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startFrom, setStartFrom] = useState(0);
  const [page, setPage] = useState<StudySectionPage>("cards");
  const [ratings, setRatings] = useState<Map<CardId, Rating>>(new Map());
  const [mastery, setMastery] = useState<number | null>(null);
  const [cardsLeft, setCardsLeft] = useState<number | null>(null);

  useEffect(() => {
    beginStudy();
  }, [deckId]);

  async function beginStudy() {
    setIsLoading(true);
    const res = await study({ path: { deckId }});
    setIsLoading(false);
    if (res.error) {
      setStudySession(null);
      setIsLoading(false);
      toast.error("Couldn't start study session", {
        description:
          res.error instanceof Error ? res.error.message : "Please try again.",
      });
      return;
    }
    const fetchedStudySession = res.data;
    setStudySession(fetchedStudySession);
    const fetchedRatings = new Map();
    for (const card of fetchedStudySession.cards) {
      if (card.rating != null) {
        fetchedRatings.set(card.id, card.rating);
      }
    }
    setStartFrom(fetchedStudySession.index);
    setPage(fetchedStudySession.page);
    setRatings(fetchedRatings);
    setCardsLeft(fetchedStudySession.cardsLeft);
    setMastery(fetchedStudySession.mastery);
    setIsLoading(false);
  }

  function gotoResults() {
    setPage("results");
  }

  function updateRating(card: Card, rating: Rating): RateResult {
    if (ratings.get(card.id) !== undefined) return "unrated";

    if (mastery === null || cardsLeft === null || studySession === null) return "unrated";

    const masteryChange = getMasteryChange(card, rating);
    const newRatings = new Map(ratings);
    const ratingNow = newRatings.get(card.id);
    let rateResult: RateResult | undefined;
    if (ratingNow === rating) {
      newRatings.delete(card.id);
      rateResult = "unrated";
      setMastery((mastery * studySession.totalCardsInDeck - masteryChange * 100) / studySession.totalCardsInDeck);
      setCardsLeft(cardsLeft + 1);
    } else {
      newRatings.set(card.id, rating);
      rateResult = "rated";
      setMastery((mastery * studySession.totalCardsInDeck + masteryChange * 100) / studySession.totalCardsInDeck);
      setCardsLeft(cardsLeft - 1);
    }

    setRatings(newRatings);
    return rateResult;
  }

  function goBackToCards() {
    if (!studySession) return;
    setPage("cards");
    setStartFrom(studySession.cards.length - 1);
  }

  return {
    deckId,
    studySession, setStudySession,
    isLoading, setIsLoading,
    startFrom, setStartFrom,
    page, setPage,
    ratings, setRatings,
    mastery, setMastery,
    cardsLeft, setCardsLeft,
    beginStudy,
    gotoResults,
    updateRating,
    goBackToCards,
  };
}

function StudySection() {
  const studyState = useStudyState();
  const {
    studySession,
    isLoading,
    page,
  } = studyState;

  if (isLoading) {
    return (
      <PageShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      </PageShell>
    );
  }
  if (studySession == null) {
    return (
      <PageShell>
        <div className="mt-8 flex flex-col items-center gap-4 text-center">
          <p className="type-heading text-fg">Deck Not Found</p>
          <p className="max-w-md type-body text-primary-light-grey">
            This deck may have been deleted, or you might not have access to it.
          </p>
          <Button text="Back To Dashboard" to="/dashboard" color="accent" textColor="white" />
        </div>
      </PageShell>
    );
  }

  function getPage(studySession: StudySessionResponse) {
    switch (page) {
      case "cards": return (<CardsPage studySession={studySession} studyState={studyState} />);
      case "results": return (<ResultsPage studySession={studySession} oldMastery={studySession.oldMastery} studyState={studyState} />);
    }
  }

  return (
    <PageShell>
      <div className="mx-auto flex w-full max-w-xl flex-col items-center">
        {getPage(studySession)}
      </div>
    </PageShell>
  );
}

interface CardsPageProps {
  studySession: StudySessionResponse;
  studyState: StudyState;
}

function getMasteryChange(card: Card, rating: Rating) {
  switch (rating) {
    case "red": return card.masteryChangeOnRed;
    case "yellow": return card.masteryChangeOnYellow;
    case "green": return card.masteryChangeOnGreen;
  }
}

function CardsPage({
  studySession,
  studyState: {
    startFrom,
    ratings,
    gotoResults,
    updateRating,
  },
}: CardsPageProps) {
  const cards = studySession.cards;
  const [index, setIndex] = useState(startFrom);
  const [direction, setDirection] = useState(0);
  const [revealed, setRevealed] = useState(false);
  function prev() {
    const i = index - 1;
    if (i >= 0) {
      setDirection(-1);
      setIndex(i);
      setRevealed(false);
    }
  }
  function nextCard() {
    const i = index + 1;
    if (i < cards.length) {
      setDirection(1);
      setIndex(i);
      setRevealed(false);
      return true;
    } else {
      return false;
    }
  }
  function next() {
    if (!nextCard()) {
      gotoResults();
    }
  }
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowLeft": { prev(); break; }
        case "ArrowRight": { next(); break; }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  });
  function rate(rating: Rating) {
    if (cards.length === 0) return;
    const card = cards[index];
    const rateResult = updateRating(card, rating);
    if (rateResult === "rated") {
      reviewCard({
        path: {
          cardId: card.id,
        },
        body: {
          rating,
        },
      }).catch((error) => {
        toast.error("Couldn't save rating", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
        return null;
      });
      if (!nextCard()) {
        gotoResults();
      }
    }
  }
  function onRed() {
    rate("red");
  }
  function onYellow() {
    rate("yellow");
  }
  function onGreen() {
    rate("green");
  }
  function toggleRevealed() {
    setRevealed(!revealed);
  }

  if (cards.length === 0) {
    return (
      <div className="mt-16 flex min-h-80 flex-col items-center text-center">
        <div className="type-title text-fg">Nothing Left To Review</div>
        <p className="type-caption mt-2 text-primary-light-grey">
          You&apos;re caught up on this deck for now.
        </p>
        <div className="mt-8">
          <Button text="Back To Dashboard" to="/dashboard" color="accent" textColor="white" />
        </div>
      </div>
    );
  }
  const card = cards[index];
  const rating = ratings.get(card.id);
  
  return (
    <>
      <CardNav cardCount={cards.length} index={index} prev={prev} next={next} />
      <div className="relative mt-3 w-full overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={card.id}
            custom={direction}
            variants={slideHorizontal}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full"
          >
            <Card
              question={card.question}
              answer={card.answer}
              revealed={revealed}
              rating={rating}
              toggleRevealed={toggleRevealed}
            />
          </motion.div>
        </AnimatePresence>
      </div>
      <ButtonRow className="mt-6 sm:mt-8" onRed={onRed} onYellow={onYellow} onGreen={onGreen} rating={rating} />
    </>
  );
}

interface ResultsPageProps {
  studySession: StudySessionResponse;
  oldMastery: number;
  studyState: StudyState;
}

function ResultsPage({
  studySession,
  oldMastery,
  studyState: {
    cardsLeft,
    mastery,
    ratings,
    beginStudy,
    goBackToCards,
  },
}: ResultsPageProps) {
  const masteryAnim = useMasteryAnim(oldMastery, mastery ?? oldMastery);
  const masteryAnimRounded = Math.round(masteryAnim);
  const cardCount = studySession.cards.length;
  useKeyDown("ArrowLeft", goBackToCards);
  function continueThisDeck() {
    completeStudySession({
      path: {
        deckId: studySession.deckId,
      },
    })
      .then((res) => {
        if (res.error) {
          throw res.error;
        }
        if (res.data) {
          beginStudy();
        }
      })
      .catch((error) => {
        toast.error("Couldn't continue session", {
          description:
            error instanceof Error ? error.message : "Please try again.",
        });
      });
  }
  function finishReview() {
    completeStudySession({
      path: {
        deckId: studySession.deckId,
      },
    }).catch((error) => {
      toast.error("Couldn't finish session", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    });
  }
  let greens = 0;
  let yellows = 0;
  let reds = 0;
  for (const rating of ratings.values()) {
    switch (rating) {
      case "green": { greens++; break; }
      case "yellow": { yellows++; break; }
      case "red": { reds++; break; }
    }
  }
  const skipped = cardCount - greens - yellows - reds;
  const rated = cardCount - skipped;
  const accuracy = rated === 0 ? null : Math.floor((greens * 2 + yellows) / (rated * 2) * 100);
  const masteryColor = getMasteryColor(masteryAnim);

  return (
    <div className="flex w-full flex-col items-center">
      <ResultsNav prev={goBackToCards} />
      <div className="mt-8 w-full max-w-sm rounded-2xl border border-border bg-primary-grey p-5 shadow-sm sm:p-6">
        <div className="type-mono text-center text-lg">
          <span style={{ color: masteryColor }}>Mastery</span>
          <span className="ml-3 text-fg">{masteryAnimRounded}%</span>
        </div>
        <div className="mt-3 grid h-2 rounded-full bg-border">
          <div className="h-full rounded-full" style={{ width: `${masteryAnim}%`, backgroundColor: `color-mix(in lab, black 15%, ${masteryColor})`, gridArea: "1 / 1" }}></div>
          <div className="h-full rounded-full" style={{ width: `${oldMastery}%`, backgroundColor: masteryColor, gridArea: "1 / 1" }}></div>
        </div>
        <table className="type-mono mx-auto mt-6 table-fixed border-separate border-spacing-x-3 border-spacing-y-1.5 text-fg">
          <tbody>
            <tr><td className="text-right text-success-green">Mastered</td><td className="text-right">{greens}</td></tr>
            <tr><td className="text-right text-warning-yellow">Working On</td><td className="text-right">{yellows}</td></tr>
            <tr><td className="text-right text-danger-red">Forgot</td><td className="text-right">{reds}</td></tr>
            <tr><td className="text-right text-primary-light-grey">Skipped</td><td className="text-right">{skipped}</td></tr>
          </tbody>
        </table>
        <div className={`type-mono mt-4 text-center text-lg ${accuracy === null ? "invisible" : ""}`}>
          <span className="text-accent">Accuracy</span>
          <span className="ml-3 text-fg">{accuracy}%</span>
        </div>
      </div>
      {(cardsLeft === null || cardsLeft > 0) ? (
        <div className="mt-6 w-full max-w-sm">
          <Button
            text="Continue This Deck"
            width="full"
            color="accent"
            textColor="white"
            onClick={continueThisDeck}
          />
        </div>
      ) : (
        <div className="mt-6 type-title text-fg">Deck Complete!</div>
      )}
      <div className="mb-2 mt-3 w-full max-w-sm">
        <Button
          text="Finish Review"
          width="full"
          color="accent"
          textColor="white"
          to="/dashboard"
          onClick={finishReview}
        />
      </div>
    </div>
  );
}

interface CardNavProps {
  cardCount: number;
  index: number;
  prev: () => void;
  next: () => void;
}

function CardNav({ cardCount, index, prev, next }: CardNavProps) {
  return (
    <div className="grid min-h-11 w-full select-none items-center" style={{ gridTemplateColumns: "1fr auto 1fr"}}>
      {index > 0 && (
        <button
          type="button"
          className={`${interactive} ${focusRing} col-1 inline-flex min-h-11 min-w-11 items-center justify-self-start rounded-md px-2 hover:opacity-80`}
          onClick={prev}
          aria-label="Previous Card"
        >
          <img className="theme-icon h-3.5 w-auto max-w-8 rotate-180" src={ArrowRight} alt="" />
        </button>
      )}
      {cardCount > 0 && (
        <div className="type-mono col-2 justify-self-center text-primary-light-grey">
          {index + 1}/{cardCount}
        </div>
      )}
      <button
        type="button"
        className={`${interactive} ${focusRing} col-3 inline-flex min-h-11 min-w-11 items-center justify-self-end rounded-md px-2 hover:opacity-80`}
        onClick={next}
        aria-label="Next Card"
      >
        <img className="theme-icon h-3.5 w-auto max-w-8" src={ArrowRight} alt="" />
      </button>
    </div>
  );
}

interface ResultsNavProps {
  prev: () => void;
}

function ResultsNav({ prev }: ResultsNavProps) {
  return (
    <div className="grid min-h-11 w-full select-none items-center" style={{ gridTemplateColumns: "1fr auto 1fr"}}>
      <button
        type="button"
        className={`${interactive} ${focusRing} col-1 inline-flex min-h-11 min-w-11 items-center justify-self-start rounded-md px-2 hover:opacity-80`}
        onClick={prev}
        aria-label="Back To Cards"
      >
        <img className="theme-icon h-3.5 w-auto max-w-8 rotate-180" src={ArrowRight} alt="" />
      </button>
      <div className="type-heading col-2 justify-self-center text-fg">Results</div>
    </div>
  );
}

interface ButtonRowProps {
  className?: string;
  rating: Rating | undefined;
  onRed: () => void;
  onYellow: () => void;
  onGreen: () => void;
}

export function ButtonRow({ className = "", rating, onRed, onYellow, onGreen }: ButtonRowProps) {
  const hasSelection = rating !== undefined;
  return (
    <div className={`grid h-14 w-full items-center px-1 sm:px-8 ${className}`} style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
      <RedButton onPress={onRed} selected={rating === "red"} hasSelection={hasSelection} />
      <YellowButton onPress={onYellow} selected={rating === "yellow"} hasSelection={hasSelection} />
      <GreenButton onPress={onGreen} selected={rating === "green"} hasSelection={hasSelection} />
    </div>
  );
}

interface ButtonProps {
  selected: boolean;
  hasSelection: boolean;
  onPress: () => void;
}

function RedButton({ selected, hasSelection, onPress }: ButtonProps) {
  const scale = useButtonScale("1", selected, hasSelection, onPress);
  return (
    <button
      type="button"
      className={`${interactive} ${focusRing} justify-self-center rounded-xl w-14 h-14`}
      onClick={onPress}
      aria-label="Forgot"
      aria-pressed={selected}
    >
      <img className={`${scale} w-full h-full`} src={RedXSquare} alt="" style={{ transition: "scale 0.08s ease-out, opacity 0.15s ease-out" }} />
    </button>
  );
}

function YellowButton({ selected, hasSelection, onPress }: ButtonProps) {
  const scale = useButtonScale("2", selected, hasSelection, onPress);
  return (
    <button
      type="button"
      className={`${interactive} ${focusRing} justify-self-center rounded-xl w-14 h-14`}
      onClick={onPress}
      aria-label="Working On"
      aria-pressed={selected}
    >
      <div className={`${scale} relative w-full h-full`} style={{ transition: "scale 0.08s ease-out, opacity 0.15s ease-out" }}>
        <img className="w-full h-full" src={YellowSquare} alt="" />
        <div className="pointer-events-none absolute left-0 top-0 flex h-full w-full items-center justify-center pb-[0.925ch] text-5xl text-warning-yellow">
          ...
        </div>
      </div>
    </button>
  );
}

function GreenButton({ selected, hasSelection, onPress }: ButtonProps) {
  const scale = useButtonScale("3", selected, hasSelection, onPress);
  return (
    <button
      type="button"
      className={`${interactive} ${focusRing} justify-self-center rounded-xl w-14 h-14`}
      onClick={onPress}
      aria-label="Mastered"
      aria-pressed={selected}
    >
      <img className={`${scale} w-full h-full`} src={GreenCheckSquare} alt="" style={{ transition: "scale 0.08s ease-out, opacity 0.15s ease-out" }} />
    </button>
  );
}

interface CardProps {
  className?: string;
  question: string;
  answer: string;
  revealed: boolean;
  rating: Rating | undefined;
  toggleRevealed: () => void;
}

function Card({ className = "", question, answer, revealed, rating, toggleRevealed }: CardProps) {
  const borderColor = toBorderColor(rating);
  const bgColor = useKeyDown(" ", toggleRevealed) ? "bg-surface-raised" : "bg-primary-grey";
  return (
    <div
      role="button"
      tabIndex={0}
      className={`${interactive} ${focusRing} flex min-h-56 w-full select-none flex-col items-center justify-between rounded-2xl border ${borderColor} ${bgColor} px-4 pb-5 pt-9 font-jetbrains shadow-sm active:bg-surface-raised sm:min-h-64 sm:px-6 sm:pb-6 sm:pt-11 ${className}`}
      onClick={toggleRevealed}
      onKeyDown={(e) => {
        if (e.key === "Enter") toggleRevealed();
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={revealed ? "answer" : "question"}
          className="flex w-full min-w-0 flex-1 flex-col items-center justify-between"
          variants={fadeUp}
          initial="hidden"
          animate="show"
          exit={{ opacity: 0, y: -6, transition: { duration: 0.12 } }}
        >
          {revealed ? (
            <div className="break-words whitespace-pre-line text-center text-fg [overflow-wrap:anywhere]">
              {answer}
            </div>
          ) : (
            <>
              <div className="break-words whitespace-pre-line text-center text-fg [overflow-wrap:anywhere]">
                {question}
              </div>
              <div className="type-caption text-primary-light-grey">Click To Reveal</div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function useMasteryAnim(oldMastery: number, newMastery: number) {
  const speed = Math.max(Math.pow(Math.abs(newMastery - oldMastery), 1/3) * 8, 1);
  const [masteryAnim, setMasteryAnim] = useState(oldMastery);
  useEffect(() => {
    const timeStart = Date.now();
    let handle = requestAnimationFrame(tick);
    function tick() {
      const elapsed = Date.now() - timeStart;
      const next = Math.min(oldMastery + speed * elapsed / 1000, newMastery);
      setMasteryAnim(next);
      if (next < newMastery) {
        handle = requestAnimationFrame(tick);
      }
    }
    return () => {
      cancelAnimationFrame(handle);
    };
  }, [oldMastery, newMastery]);
  if (newMastery <= oldMastery) {
    return newMastery;
  }
  return masteryAnim;
}

function getMasteryColor(percent: number): string {
  if (percent >= 60) {
    return "var(--color-success-green)";
  }
  if (percent >= 40) {
    const p = (percent - 40) / 20 * 100;
    return `color-mix(in lab, ${p}% var(--color-success-green), var(--color-warning-yellow))`;
  }
  if (percent >= 20) {
    const p = (percent - 20) / 20 * 100;
    return `color-mix(in lab, ${p}% var(--color-warning-yellow), var(--color-danger-red))`;
  }
  return "var(--color-danger-red)";
};


function useButtonScale(
  key: string,
  selected: boolean,
  hasSelection: boolean,
  onPress: () => void,
) {
  const keyPressed = useKeyPress(key, onPress);
  // Keep selected ≥44px: dim others instead of shrinking the active control.
  if (hasSelection && !selected) {
    return "opacity-40 active:scale-[calc(12/14)] active:opacity-100";
  }
  if (keyPressed) return "opacity-100 active:scale-[calc(12/14)] scale-[calc(12/14)]";
  return "opacity-100 active:scale-[calc(12/14)]";
}

function toBorderColor(rating: Rating | undefined) {
  switch (rating) {
    case "red": {
      return "border-danger-red";
    }
    case "yellow": {
      return "border-warning-yellow";
    }
    case "green": {
      return "border-success-green";
    }
    case undefined: {
      return "border-border";
    }
  }
}

function useKeyDownHelper(key: string, holdToRepeat: boolean, onPress: () => void) {
  const [keyPressed, setKeyPressed] = useState(false);
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === key && (holdToRepeat || keyPressed === false)) {
        setKeyPressed(true);
        onPress();
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key === key) {
        setKeyPressed(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("keyup", onKeyUp);
    };
  });
  return keyPressed;
}

function useKeyDown(key: string, onPress: () => void) {
  return useKeyDownHelper(key, true, onPress);
}

function useKeyPress(key: string, onPress: () => void) {
  return useKeyDownHelper(key, false, onPress);
}

export default StudyPage;
