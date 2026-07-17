import React, { useEffect, useState } from "react";

import { Navbar } from "../components/ui/Navbar";
import ArrowRight from "../assets/arrow-right-thin.svg";
import GreenCheckSquare from "../assets/green-check-square.svg";
import YellowSquare from "../assets/yellow-square.svg";
import RedXSquare from "../assets/red-x-square.svg";
import { Link, useParams } from "react-router-dom";
import { reviewCard, study, type StudySessionResponse, completeStudySession, nextCard, prevCard, syncStudyPage, changeToResultsPage } from "../api";

const StudyPage: React.FC = () => {
  return (
    <>
      <Navbar version="Blank" />
      <StudySection />
    </>
  );
};

type StudySectionPage = { name: "cards" } | { name: "results", mastery: number }
type CardId = number;
type Rating = "red" | "yellow" | "green";
type RateResult = "rated" | "unrated";

function StudySection() {
  const deckId = parseInt(useParams().deckId!);
  const [studySession, setStudySession] = useState<StudySessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startFrom, setStartFrom] = useState(0);
  const [page, setPage] = useState<StudySectionPage>({ name: "cards" });
  const [ratings, setRatings] = useState<Map<CardId, Rating>>(new Map());

  // const deck = getDeckById(deckId);
  useEffect(() => {
    study({ path: { deckId }}).then(res => {
      if (res.data) {
        const fetchedStudySession = res.data;
        setStudySession(fetchedStudySession);
        const fetchedRatings = new Map();
        for (const card of fetchedStudySession.cards) {
          if (card.rating != null) {
            fetchedRatings.set(card.id, card.rating);
          }
        }
        setStartFrom(fetchedStudySession.position);
        switch (fetchedStudySession.page) {
          case "cards": {
            setPage({ name: "cards" });
            break;
          }
          case "results": {
            setPage({ name: "results", mastery: fetchedStudySession.mastery });
            break;
          }
        }
        setRatings(fetchedRatings);
      }
      setIsLoading(false);
    })
  }, [deckId]);
  if (isLoading) {
    return (<div>Loading...</div>);
  }
  if (studySession == null) {
    console.error("deck not found.");
    return (<div>Error: deck not found.</div>);
  }

  function gotoResults() {
    // setPage("results");
    changeToResultsPage({
      path: {
        deckId,
      },
    }).then(res => {
      if (res.data) {
        setPage({ name: "results", mastery: res.data.mastery });
      }
    });
  }
  function rate(id: CardId, rating: Rating): RateResult {
    reviewCard({
      path: {
        cardId: id,
      },
      body: {
        rating,
      },
    });
    // TODO: Disable undo for now, implement later.
    if (ratings.get(id) !== undefined) return "rated";

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

  function getPage(studySession: StudySessionResponse) {
    function goBackToCards() {
      setPage({ name: "cards" });
      setStartFrom(studySession.cards.length - 1);
      syncStudyPage({
        path: {
          deckId,
        },
        body: {
          page: "cards",
        },
      });
    }
    switch (page.name) {
      case "cards": return (<CardsSection studySession={studySession} startFrom={startFrom} ratings={ratings} gotoResults={gotoResults} rate={rate} />);
      case "results": return (<ResultsSection ratings={ratings} studySession={studySession} mastery={page.mastery} goBackToCards={goBackToCards} />);
    }
  }

  return (
    <div className="flex w-full justify-center">
      <div className="flex flex-col w-full max-w-140 items-center px-3 mt-21">
        {getPage(studySession)}
      </div>
    </div>
  );
}

interface CardsSectionProps {
  studySession: StudySessionResponse,
  startFrom: number,
  ratings: Map<CardId, Rating>,
  gotoResults: () => void,
  rate: (id: CardId, rating: Rating) => RateResult,
}

function CardsSection({ studySession, startFrom, ratings, gotoResults, rate: _rate }: CardsSectionProps) {
  const cards = studySession.cards;
  const [index, setIndex] = useState(startFrom);
  const [revealed, setRevealed] = useState(false);
  function prev() {
    const i = index - 1;
    if (i >= 0) {
      setIndex(i);
      setRevealed(false);
      prevCard({
        path: {
          deckId: studySession.deckId,
        },
        body: {
          cardId: cards[i].id,
        },
      });
    }
  }
  function next() {
    const i = index + 1;
    if (i < cards.length) {
      setIndex(i);
      setRevealed(false);
      nextCard({
        path: {
          deckId: studySession.deckId,
        },
        body: {
          cardId: cards[i].id,
        },
      });
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
      <div className="flex flex-col items-center mt-20 min-h-120">
        <div className="text-white text-lg font-inter">Nothing left to review! ✅</div>
        <Link className="bg-accent text-white font-bold px-4 py-2 rounded mt-8 text-xl" to="/dashboard">Back to dashboard</Link>
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

interface ResultsSectionProps {
  ratings: Map<CardId, Rating>;
  studySession: StudySessionResponse;
  mastery: number;
  goBackToCards: () => void;
}

function ResultsSection({ ratings, studySession, mastery: _mastery, goBackToCards }: ResultsSectionProps) {
  const cardCount = studySession.cards.length;
  useKeyDown("ArrowLeft", goBackToCards);
  function onClickBackToDashboard() {
    completeStudySession({
      path: {
        deckId: studySession.deckId,
      },
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
  const score = rated === 0 ? null : Math.floor((greens * 2 + yellows) / (rated * 2) * 100);
  const mastery = Math.ceil(_mastery);
  return (
    <>
      <ResultsNav prev={goBackToCards} />
      <table className="text-white font-jetbrains mr-6 mt-6 table-fixed border-separate border-spacing-x-3 border-spacing-y-1.5">
        <tr><td className="text-right text-success-green">Mastered</td><td className="text-right">{greens}</td></tr>
        <tr><td className="text-right text-warning-yellow">Working on</td><td className="text-right">{yellows}</td></tr>
        <tr><td className="text-right text-danger-red">Forgot</td><td className="text-right">{reds}</td></tr>
        <tr><td className="text-right text-gray-300">Skipped</td><td className="text-right">{skipped}</td></tr>
      </table>

      <table className="text-lg text-white font-jetbrains mr-1 mt-6 table-fixed border-separate border-spacing-x-3 border-spacing-y-1.5">
        {score !== null && <tr><td className="text-right text-purple-500">Accuracy</td><td className="text-right">{score}%</td></tr>}
        <tr><td className="text-right text-blue-500">Mastery</td><td className="text-right">{mastery}%</td></tr>
      </table>

      {/* <div className="flex flex-col items-end">

        {score !== null && <div className="text-lg font-jetbrains flex gap-x-3 mt-6">
          <div className="text-purple-500">Accuracy</div><div className="text-white">{score}%</div>
        </div>}
        <div className="text-lg font-jetbrains flex gap-x-3 mt-1">
          <div className="text-blue-500">Mastery</div><div className="text-white">{mastery}%</div>
        </div>
      </div> */}
      <Link className="bg-accent text-white font-bold px-4 py-2 rounded mt-4 text-xl" to="/dashboard" onClick={onClickBackToDashboard}>Back to dashboard</Link>
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
