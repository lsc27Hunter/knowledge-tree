import React, { useEffect, useState } from "react";

import { Navbar } from "../components/ui/Navbar";
import ArrowRight from "../assets/arrow-right-thin.svg";
import GreenCheckSquare from "../assets/green-check-square.svg";
import YellowSquare from "../assets/yellow-square.svg";
import RedXSquare from "../assets/red-x-square.svg";
import { getCards } from "../mockData";

const StudyPage: React.FC = () => {
  const cards = getCards();
  const [index, setIndex] = useState(0);
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
    }
  }
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      switch (e.key) {
        case "ArrowLeft": { prev(); break; }
        case "ArrowRight": { next(); break; }
        case " ": { toggleRevealed(); break; }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  });
  function onRed() {
    next();
  }
  function onYellow() {
    next();
  }
  function onGreen() {
    next();
  }
  function toggleRevealed() {
    setRevealed(!revealed);
  }

  const card = cards.length > 0 ? cards[index] : null;

  return (
    <>
      <Navbar version="Blank" />
      <div className="flex w-full justify-center">
        <div className="flex flex-col w-full max-w-140 items-center px-3 mt-24 select-none">
          <div className="grid w-full items-center" style={{ gridTemplateColumns: "1fr auto 1fr"}}>
            {index > 0 && <button className="cursor-pointer col-1 justify-self-start" onClick={prev}>
              <img className="rotate-180" src={ArrowRight} alt="next" />
            </button>}
            {cards.length > 0 && <div className="text-gray-400 font-jetbrains col-2 justify-self-center">{index + 1}/{cards.length}</div>}
            <button className="cursor-pointer col-3 justify-self-end" onClick={next}>
              <img src={ArrowRight} alt="next" />
            </button>
          </div>
          <div className="mt-3 flex flex-col pt-11 pb-6 px-6 font-jetbrains items-center justify-between bg-primary-grey border active:bg-[#222] border-primary-light-grey rounded w-full min-h-60 cursor-pointer"
            onClick={toggleRevealed}>
            {card === null ?
              <div className="text-white">No cards!</div> :
              revealed ? 
                <div className="text-white whitespace-pre-line">{card.answer}</div> :
                <>
                  <div className="text-white whitespace-pre-line">{card.question}</div>
                  <div className="text-primary-light-grey">Click to reveal</div>
                </>
            }
          </div>
          <div className="grid items-center w-full sm:px-15 h-20 sm:mt-4 mt-3" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
            <button className="cursor-pointer justify-self-center" onClick={onRed}>
              <img className="h-14 active:h-20" style={{ transition: "height 0.08s ease-out" }} src={RedXSquare} alt="forgot" />
            </button>
            <button className="relative text-5xl active:text-[calc(3rem*20/14)] cursor-pointer justify-self-center" onClick={onYellow}>
              <img className="h-14 active:h-20 z-1 bg-transparent" style={{ transition: "height 0.08s ease-out" }} src={YellowSquare} alt="took a while" />
              <div className="pb-[1.3ch] pointer-events-none absolute flex left-0 top-0 w-full h-full items-center justify-center text-warning-yellow"
                style={{ transition: "font-size 0.08s ease-out" }}>
                ...
              </div>
            </button>
            <button className="cursor-pointer justify-self-center" onClick={onGreen}>
              <img className="h-14 active:h-20" style={{ transition: "height 0.08s ease-out" }} src={GreenCheckSquare} alt="knew it instantly" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default StudyPage;
