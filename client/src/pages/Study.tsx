import React, { useEffect, useState } from "react";

import { Navbar } from "../components/ui/Navbar";
import ArrowRight from "../assets/arrow-right-thin.svg";
import GreenCheckSquare from "../assets/green-check-square.svg";
import YellowSquare from "../assets/yellow-square.svg";
import RedXSquare from "../assets/red-x-square.svg";
import { Link, useParams } from "react-router-dom";
import { reviewCard, study, type StudySessionResponse, completeStudySession, getDeckMastery, type StudySessionCardResponse } from "../api";

const StudyPage: React.FC = () => {
  return (
    <>
      <Navbar version="Blank" />
      <StudySection />
    </>
  );
};

type StudySectionPage = { name: "cards" } | { name: "results", mastery: number | null, oldMastery: number }
type CardId = number;
type Card = StudySessionCardResponse;
type Rating = "red" | "yellow" | "green";
type RateResult = "rated" | "unrated";

function StudySection() {
  const deckId = parseInt(useParams().deckId!);
  const [studySession, setStudySession] = useState<StudySessionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startFrom, setStartFrom] = useState(0);
  const [page, setPage] = useState<StudySectionPage>({ name: "cards" });
  const [ratings, setRatings] = useState<Map<CardId, Rating>>(new Map());
  const [mastery, setMastery] = useState<number | null>(null);
  const [cardsLeft, setCardsLeft] = useState<number | null>(null);

  function beginStudy() {
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
        setStartFrom(fetchedStudySession.index);
        switch (fetchedStudySession.page) {
          case "cards": {
            setPage({ name: "cards" });
            break;
          }
          case "results": {
            setPage({
              name: "results",
              mastery: fetchedStudySession.mastery,
              oldMastery: fetchedStudySession.oldMastery,
            });
            break;
          }
        }
        setRatings(fetchedRatings);
        setCardsLeft(fetchedStudySession.cardsLeft);
        setMastery(fetchedStudySession.mastery);
      }
      setIsLoading(false);
    });
  }

  useEffect(() => {
    beginStudy();
  }, [deckId]);
  if (isLoading) {
    return (<div>Loading...</div>);
  }
  if (studySession == null) {
    console.error("deck not found.");
    return (<div>Error: deck not found.</div>);
  }

  function gotoResults(oldMastery: number, newCardsLeft: number | null = null ) {
    setPage({ name: "results", mastery, oldMastery });
    if (newCardsLeft !== null) {
      setCardsLeft(newCardsLeft);
    }
  }
  console.log("Mastery:", mastery);
  function rate(card: Card, rating: Rating): RateResult {
    // TODO: Disable undo for now, implement later.
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
    console.log("Card:", card);
    console.log("Mastery Change:", masteryChange);
    setRatings(newRatings);
    return rateResult;
  }

  function getPage(studySession: StudySessionResponse) {
    function goBackToCards() {
      setPage({ name: "cards" });
      setStartFrom(studySession.cards.length - 1);
    }
    function updateResultsPage(mastery: number, newCardsLeft: number | null = null) {
      // setPage({ name: "results", mastery, oldMastery: studySession.oldMastery });
      if (newCardsLeft !== null) {
        setCardsLeft(newCardsLeft);
      }
    }
    switch (page.name) {
      case "cards": return (<CardsPage studySession={studySession} startFrom={startFrom} ratings={ratings} gotoResults={gotoResults} updateResultsPage={updateResultsPage} rate={rate} />);
      case "results": return (<ResultsPage ratings={ratings} studySession={studySession} mastery={mastery} oldMastery={page.oldMastery} cardsLeft={cardsLeft} goBackToCards={goBackToCards} beginStudy={beginStudy} />);
    }
  }

  return (
    <div className="flex w-full justify-center">
      <div className="flex flex-col w-full max-w-140 items-center px-3 mt-14">
        {getPage(studySession)}
      </div>
    </div>
  );
}

interface CardsPageProps {
  studySession: StudySessionResponse,
  startFrom: number,
  ratings: Map<CardId, Rating>,
  gotoResults(oldMastery: number, cardsLeft?: number): void,
  updateResultsPage(mastery: number, cardsLeft?: number): void,
  rate(card: Card, rating: Rating): RateResult,
}

function getMasteryChange(card: Card, rating: Rating) {
  switch (rating) {
    case "red": return card.masteryChangeOnRed;
    case "yellow": return card.masteryChangeOnYellow;
    case "green": return card.masteryChangeOnGreen;
  }
}

function CardsPage({ studySession, startFrom, ratings, gotoResults, updateResultsPage, rate: _rate }: CardsPageProps) {
  const cards = studySession.cards;
  const [index, setIndex] = useState(startFrom);
  const [revealed, setRevealed] = useState(false);
  function prev() {
    const i = index - 1;
    if (i >= 0) {
      setIndex(i);
      setRevealed(false);
    }
  }
  function nextCard() {
    const i = index + 1;
    if (i < cards.length) {
      setIndex(i);
      setRevealed(false);
      return true;
    } else {
      return false;
    }
  }
  function next() {
    if (!nextCard()) {
      gotoResults(studySession.oldMastery);
      getDeckMastery({
        path: {
          deckId: studySession.deckId,
        },
      }).then(res => {
        if (res.data) {
          updateResultsPage(res.data.masteryPercentage);
        }
      });
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
    const rateResult = _rate(card, rating);
    if (rateResult === "rated") {
      const reviewCardPromise = reviewCard({
        path: {
          cardId: card.id,
        },
        body: {
          rating,
        },
      });
      if (!nextCard()) {
        gotoResults(studySession.oldMastery);
        reviewCardPromise.then(res => {
          if (res.data) {
            updateResultsPage(res.data.mastery, res.data.cardsLeft);
          }
        });
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

interface ResultsPageProps {
  ratings: Map<CardId, Rating>;
  studySession: StudySessionResponse;
  mastery: number | null;
  oldMastery: number;
  cardsLeft: number | null;
  beginStudy(): void;
  goBackToCards(): void;
}

function useMasteryAnim(oldMastery: number, newMastery: number) {
  // const speed = Math.max(6, (newMastery - oldMastery) / 3);
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

function ResultsPage({ ratings, studySession, mastery, oldMastery, cardsLeft, beginStudy, goBackToCards }: ResultsPageProps) {
  console.log(cardsLeft);
  const masteryAnim = useMasteryAnim(oldMastery, mastery ?? oldMastery);
  const masteryAnimRounded = Math.round(masteryAnim);
  console.log(masteryAnim, mastery);
  const cardCount = studySession.cards.length;
  useKeyDown("ArrowLeft", goBackToCards);
  function continueThisDeck() {
    completeStudySession({
      path: {
        deckId: studySession.deckId,
      },
    }).then(res => {
      if (res.data) {
        beginStudy();
      }
    });
  }
  function finishReview() {
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
  const accuracy = rated === 0 ? null : Math.floor((greens * 2 + yellows) / (rated * 2) * 100);
  const masteryColor = getMasteryColor(masteryAnim);

  return (
    <>
      <ResultsNav prev={goBackToCards} />
      <div className="max-w-80 w-full mt-8">
        <div className="text-center font-jetbrains text-lg">
          <span className="text-right" style={{ color: masteryColor }}>Mastery</span><span className="text-right text-white ml-3">{masteryAnimRounded}%</span>
        </div>
        <div className="bg-primary-light-grey rounded-full h-2 mt-1 grid">
          <div className="h-full rounded-full" style={{ width: `${masteryAnim}%`, backgroundColor: `color-mix(in lab, black 15%, ${masteryColor})`, gridArea: "1 / 1" }}></div>
          <div className="h-full rounded-full" style={{ width: `${oldMastery}%`, backgroundColor: masteryColor, gridArea: "1 / 1" }}></div>
        </div>
      </div>
      <table className="text-white font-jetbrains mr-6 mt-8 table-fixed border-separate border-spacing-x-3 border-spacing-y-1.5">
        <tbody>
          <tr><td className="text-right text-success-green">Mastered</td><td className="text-right">{greens}</td></tr>
          <tr><td className="text-right text-warning-yellow">Working on</td><td className="text-right">{yellows}</td></tr>
          <tr><td className="text-right text-danger-red">Forgot</td><td className="text-right">{reds}</td></tr>
          <tr><td className="text-right text-gray-300">Skipped</td><td className="text-right">{skipped}</td></tr>
        </tbody>
      </table>
      <div className={`text-center font-jetbrains text-lg mt-3 ${accuracy === null ? "invisible" : ""}`}>
        <span className="text-right text-purple-500">Accuracy</span><span className="text-right text-white ml-3">{accuracy}%</span>
      </div>
      {(cardsLeft === null || cardsLeft > 0) ?
        <button className="cursor-pointer bg-accent text-white font-bold w-52 text-center py-2 rounded mt-6 text-lg" onClick={continueThisDeck}>Continue this deck</button> :
        <div className="text-white text-lg font-bold mt-6">Deck complete!</div>
      }
      <Link className="bg-accent text-white font-bold w-52 text-center py-2 rounded mt-4 mb-2 text-xl" to="/dashboard" onClick={finishReview}>Finish review</Link>
    </>
  );
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
    <div className={`flex flex-col pt-11 pb-6 px-6 font-jetbrains items-center justify-between ${bgColor} active:bg-[#222] border ${borderColor} rounded w-full min-h-64 cursor-pointer select-none ${className}`}
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
