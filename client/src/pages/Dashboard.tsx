import React from "react";

import { Navbar } from "../components/ui/Navbar";

import Checkmark from "../assets/checkmark-circle.svg";
import StarBadge from "../assets/star-badge.svg";
import Danger from "../assets/danger.svg";

const DashboardPage: React.FC = () => {
  // to do: fetch decks from backend, remove mock demo data
  const decks = [
    {
      id: 1,
      name: "Deck 1",
      mastery: 0.5,
      cardsDueToday: null,
      totalCards: 10,
      lastStudiedAt: "2023-06-25T12:00:00Z",
    },
    {
      id: 2,
      name: "Deck 2",
      mastery: 0.5,
      cardsDueToday: null,
      totalCards: 10,
      lastStudiedAt: "2023-06-25T12:00:00Z",
    },
    {
      id: 3,
      name: "Deck 3",
      mastery: 0.5,
      cardsDueToday: null,
      totalCards: 10,
      lastStudiedAt: "2023-06-25T12:00:00Z",
    },
  ];
  const deckCount = decks.length;
  const cardCount = decks.reduce((acc, deck) => acc + deck.totalCards, 0);
  return (
    <div>
      <Navbar version="Dashboard" />

      <h2 className="font-inter text-white text-title-medium font-medium mx-15 mt-20">
        My decks
      </h2>
      <div className="font-inter text-primary-light-grey text-regular font-regular mx-15 mt-2">
        {deckCount} {deckCount === 1 ? "deck" : "decks"}{" "}
        <span aria-hidden="true">&bull;</span> {cardCount}{" "}
        {cardCount === 1 ? "card" : "cards"}
      </div>
      <div className="flex flex-row justify-between items-center mt-15 ml-15 w-7/10 bg-primary-grey rounded-2xl p-9 text-white font-jetbrains">
        <div className="flex flex-row items-center">
          <img src={Checkmark} alt="Checkmark" className="w-20 h-20 " />
          <div className="flex flex-col">
            <div className="text-title-large pl-2">38% </div>
            <div className="text-small text-primary-light-grey pl-2 ">
              Average Mastery
            </div>
          </div>
        </div>

        <div className="flex flex-row items-center">
          <img src={StarBadge} alt="Star Badge" className="w-20 h-20" />
          <div className="flex flex-col">
            <div className="text-title-large pl-2">7</div>
            <div className="text-small text-primary-light-grey pl-2 ">
              Day streak
            </div>
          </div>
        </div>
        <div className="flex flex-row items-center">
          <img src={Danger} alt="Danger" className="w-20 h-20" />
          <div className="flex flex-col">
            <div className="text-title-large pl-2 pr-50">1</div>
            <div className="text-small text-primary-light-grey pl-2">
              Cards Due Today
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
