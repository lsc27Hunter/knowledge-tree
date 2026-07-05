import React, { useEffect, useState } from "react";

import { Navbar } from "../components/ui/Navbar";
import ArrowRight from "../assets/arrow-right-thin.svg";
import GreenCheckSquare from "../assets/green-check-square.svg";
import YellowSquare from "../assets/yellow-square.svg";
import RedXSquare from "../assets/red-x-square.svg";
import { getDeckById, type Card as CardData } from "../mockData";
import { useParams } from "react-router-dom";

const StudyPage: React.FC = () => {
  return (
    <>
      <Navbar version="Blank" />
      <StudySection />
    </>
  );
};

type StudySectionPage = "cards" | "results";
type CardId = number;
type Rating = "red" | "yellow" | "green";
type StartFrom = "front" | "back";
type RateResult = "rated" | "unrated";

function StudySection() {
  const deckId = parseInt(useParams().deckId!);
  const [startFrom, setStartFrom] = useState<StartFrom>("front");
  const [page, setPage] = useState<StudySectionPage>("cards");
  const [ratings, setRatings] = useState<Map<CardId, Rating>>(new Map());

  const deck = getDeckById(deckId);
  if (deck == null) {
    console.error("deck not found.");
    return (<div>Error: deck not found.</div>);
  }
  const cards = deck.cards;

  function gotoResults() {
    setPage("results");
  }
  function goBackToCards() {
    setPage("cards");
    setStartFrom("back");
  }
  function rate(id: CardId, rating: Rating): RateResult {
    const newRatings = new Map(ratings);
    const ratingNow = newRatings.get(id);
    let rateResult: RateResult | undefined;
    if (ratingNow === rating) {
      newRatings.delete(id);
      rateResult = "unrated";
    } else {
      newRatings.set(id, rating);
      rateResult = "rated";
    }
    setRatings(newRatings);
    return rateResult;
  }

  function getPage() {
    switch (page) {
      case "cards": return (<CardsSection cards={cards} startFrom={startFrom} ratings={ratings} gotoResults={gotoResults} rate={rate} />);
      case "results": return (<ResultsSection ratings={ratings} cardCount={cards.length} goBackToCards={goBackToCards} />);
    }
  }

  return (
    <div className="flex w-full justify-center">
      <div className="flex flex-col w-full max-w-140 items-center px-3 mt-21">
        {getPage()}
      </div>
    </div>
  );
}

interface CardsSectionProps {
  cards: CardData[],
  startFrom: StartFrom,
  ratings: Map<CardId, Rating>,
  gotoResults: () => void,
  rate: (id: CardId, rating: Rating) => RateResult,
}

function CardsSection({ cards, startFrom, ratings, gotoResults, rate: _rate }: CardsSectionProps) {
  const [index, setIndex] = useState(toInitialIndex(startFrom, cards.length));
  const [revealed, setRevealed] = useState(false);
  function prev() {
    const i = index - 1;
    if (i >= 0) {
      setIndex(i);
      setRevealed(false);
    }
  }
  function next() {
    const i = index + 1;
    if (i < cards.length) {
      setIndex(i);
      setRevealed(false);
    } else {
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
    const rateResult = _rate(card.id, rating);
    if (rateResult === "rated") {
      next();
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
      <div className="flex justify-center items-center min-h-120">
        <div className="text-white font-inter">No cards!</div>
      </div>
    );
  }
  const card = cards[index];
  const rating = ratings.get(card.id);
  
  return (
    <>
      <CardNav cardCount={cards.length} index={index} prev={prev} next={next} />
      <Card className="mt-1" question={card.question} answer={card.answer} revealed={revealed} rating={rating} toggleRevealed={toggleRevealed} />
      <ButtonRow className="sm:mt-7 mt-6" onRed={onRed} onYellow={onYellow} onGreen={onGreen} rating={rating} />
    </>
  );
}

function toInitialIndex(startFrom: StartFrom, cardCount: number) {
  switch (startFrom) {
    case "front": { return 0; }
    case "back": { return cardCount - 1; }
  }
}

interface ResultsSectionProps {
  ratings: Map<CardId, Rating>;
  cardCount: number;
  goBackToCards: () => void;
}

function ResultsSection({ ratings, cardCount, goBackToCards }: ResultsSectionProps) {
  useKeyDown("ArrowLeft", goBackToCards);
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
  const score = rated === 0 ? null : Math.floor((greens * 2 + yellows) / (rated * 2) * 100);
  return (
    <>
      <ResultsNav prev={goBackToCards} />
      <table className="text-white font-jetbrains mr-6 mt-6 table-fixed border-separate border-spacing-x-3 border-spacing-y-1.5">
        <tr><td className="text-right text-success-green">Mastered</td><td className="text-right">{greens}</td></tr>
        <tr><td className="text-right text-warning-yellow">Working on</td><td className="text-right">{yellows}</td></tr>
        <tr><td className="text-right text-danger-red">Forgot</td><td className="text-right">{reds}</td></tr>
        <tr><td className="text-right text-gray-300">Skipped</td><td className="text-right">{skipped}</td></tr>
      </table>

      {score !== null && <div className="text-lg font-jetbrains flex gap-x-3 mt-6">
        <div className="text-purple-500">Final Score</div><div className="text-white">{score}%</div>
      </div>}
    </>
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
    <div className="grid w-full items-center h-10 select-none" style={{ gridTemplateColumns: "1fr auto 1fr"}}>
      {index > 0 && <button className="h-full cursor-pointer col-1 justify-self-start" onClick={prev}>
        <img className="rotate-180" src={ArrowRight} alt="next" />
      </button>}
      {cardCount > 0 && <div className="text-gray-400 font-jetbrains col-2 justify-self-center">{index + 1}/{cardCount}</div>}
      <button className="h-full cursor-pointer col-3 justify-self-end" onClick={next}>
        <img src={ArrowRight} alt="next" />
      </button>
    </div>
  );
}

interface ResultsNavProps {
  prev: () => void;
}

function ResultsNav({ prev }: ResultsNavProps) {
  return (
    <div className="grid w-full items-center h-10 select-none" style={{ gridTemplateColumns: "1fr auto 1fr"}}>
      <button className="h-full cursor-pointer col-1 justify-self-start" onClick={prev}>
        <img className="rotate-180" src={ArrowRight} alt="next" />
      </button>
      <div className="text-white text-2xl font-inter col-2 justify-self-center">Results</div>
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

function ButtonRow({ className = "", rating, onRed, onYellow, onGreen }: ButtonRowProps) {
  return (
    <div className={`grid items-center w-full sm:px-15 h-14 ${className}`} style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
      <RedButton onPress={onRed} selected={rating === "red"} />
      <YellowButton onPress={onYellow} selected={rating === "yellow"} />
      <GreenButton onPress={onGreen} selected={rating === "green"} />
    </div>
  );
}

interface ButtonProps {
  selected: boolean;
  onPress: () => void;
}

function RedButton({ selected, onPress }: ButtonProps) {
  const scale = useButtonScale("1", selected, onPress);
  return (
    <button className={`cursor-pointer justify-self-center ${scale}`}
      style={{ transition: "scale 0.08s ease-out" }} onClick={onPress}>
      <img className="h-14" src={RedXSquare} alt="forgot" />
    </button>
  );
}

function YellowButton({ selected, onPress }: ButtonProps) {
  const scale = useButtonScale("2", selected, onPress);
  return (
    <button className={`relative text-5xl cursor-pointer justify-self-center ${scale}`}
      style={{ transition: "scale 0.08s ease-out" }} onClick={onPress}>
      <img className="h-14" src={YellowSquare} alt="took a while" />
      <div className="pb-[1.3ch] pointer-events-none absolute flex left-0 top-0 w-full h-full items-center justify-center text-warning-yellow">
        ...
      </div>
    </button>
  );
}

function GreenButton({ selected, onPress }: ButtonProps) {
  const scale = useButtonScale("3", selected, onPress);
  return (
    <button className={`cursor-pointer justify-self-center ${scale}`}
      style={{ transition: "scale 0.08s ease-out" }} onClick={onPress}>
      <img className="h-14" src={GreenCheckSquare} alt="knew it instantly" />
    </button>
  );
}

function useButtonScale(key: string, selected: boolean, onPress: () => void) {
  const keyPressed = useKeyPress(key, onPress);
  if (selected) return "scale-[calc(10/14)]";
  if (keyPressed) return "active:scale-[calc(12/14)] scale-[calc(12/14)]";
  return "active:scale-[calc(12/14)]";
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
  const bgColor = useKeyDown(" ", toggleRevealed) ? "bg-[#222]" : "bg-primary-grey";
  return (
    <div className={`flex flex-col pt-11 pb-6 px-6 font-jetbrains items-center justify-between ${bgColor} active:bg-[#222] border ${borderColor} rounded w-full min-h-60 cursor-pointer select-none ${className}`}
      onClick={toggleRevealed}>
        {revealed ? 
          <div className="text-white whitespace-pre-line">{answer}</div> :
          <>
            <div className="text-white whitespace-pre-line">{question}</div>
            <div className="text-primary-light-grey">Click to reveal</div>
          </>
        }
    </div>
  );
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
      return "border-primary-light-grey";
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
