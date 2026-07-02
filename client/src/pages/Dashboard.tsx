import { UserButton } from "@clerk/react";

import { Navbar } from "../components/ui/Navbar";
import { DeckCard } from "../components/ui/DeckCard";

import Checkmark from "../assets/checkmark-circle.svg";
import StarBadge from "../assets/star-badge.svg";
import Danger from "../assets/danger.svg";

export default function DashboardPage() {
const DashboardPage: React.FC = () => {
  const userData = {
    userId: 1,
    userName: "daphnebgoode",
    currentStreak: 7, // to do: figure out how to calculate this from backend data
  };
  // to do: fetch decks from backend, remove mock demo data
  const decks = [
    {
      id: 1,
      name: "Deck 1",
      mastery: 0.27,
      dueDate: "2026-07-04:00:00Z",
      totalCards: 23,
      lastStudiedAt: "2023-06-25T12:00:00Z",
    },
    {
      id: 2,
      name: "Deck 2",
      mastery: 0.5,
      dueDate: "2026-07-10:00:00Z",
      totalCards: 10,
      lastStudiedAt: "2026-06-25T12:00:00Z",
    },
    {
      id: 3,
      name: "Deck 3",
      mastery: 1,
      dueDate: null,
      totalCards: 40,
      lastStudiedAt: "2026-06-25T12:00:00Z",
    },
    {
      id: 4,
      name: "Deck 4",
      mastery: 1,
      dueDate: null,
      totalCards: 40,
      lastStudiedAt: "2026-06-25T12:00:00Z",
    },
  ];

  const deckCount = decks.length;

  const cardCount = decks.reduce((acc, deck) => acc + deck.totalCards, 0);

  const averageMastery =
    decks.reduce((acc, deck) => acc + deck.mastery, 0) / deckCount;

  const decksDueThisWeek = decks.filter((deck) => {
    if (!deck.dueDate) return false;
    const dueDate = new Date(deck.dueDate);
    const now = new Date();
    const oneWeekFromNow = new Date();
    oneWeekFromNow.setDate(now.getDate() + 7);

    return dueDate >= now && dueDate <= oneWeekFromNow;
  });

  return (
    <div>
      <Navbar version="Dashboard" userButton={<UserButton />} />
      <div className="px-6 py-10 sm:px-10 md:px-16">
        <h1 className="font-inter text-white text-title">Dashboard</h1>
        <p className="font-inter text-primary-light-grey mt-2">
          Your decks will show up here.
        </p>
      <Navbar version="Dashboard" />

      <h2 className="font-inter text-white text-title-medium font-medium mx-15 mt-15">
        My decks
      </h2>
      <div className="font-inter text-primary-light-grey text-regular font-regular mx-15 mt-2">
        {deckCount} {deckCount === 1 ? "deck" : "decks"}{" "}
        <span aria-hidden="true">&bull;</span> {cardCount}{" "}
        {cardCount === 1 ? "card" : "cards"}
      </div>
      <div className="mt-10 ml-4 w-[calc(100%-2rem)] sm:ml-15 sm:w-7/10">
        <div className="flex flex-col gap-6 rounded-2xl bg-primary-grey p-6 text-white font-jetbrains sm:flex-row sm:items-center sm:justify-between sm:p-9">
          <div className="flex flex-row items-center">
            <img src={Checkmark} alt="Checkmark" className="w-20 h-20 " />
            <div className="flex flex-col">
              <div className="text-title-large pl-2">
                {Math.round(averageMastery * 100)}%
              </div>
              <div className="text-small text-primary-light-grey pl-2 ">
                Average Mastery
              </div>
            </div>
          </div>

          <div className="flex flex-row items-center">
            <img src={StarBadge} alt="Star Badge" className="w-20 h-20" />
            <div className="flex flex-col">
              <div className="text-title-large pl-2">
                {userData.currentStreak}
              </div>
              <div className="text-small text-primary-light-grey pl-2 ">
                Day streak
              </div>
            </div>
          </div>

          <div className="flex flex-row items-center">
            <img src={Danger} alt="Danger" className="w-20 h-20" />
            <div className="flex flex-col">
              <div className="text-title-large pl-2 pr-50">
                {decksDueThisWeek.length}
              </div>
              <div className="text-small text-primary-light-grey pl-2">
                {decksDueThisWeek.length === 1
                  ? "Deck due this week"
                  : "Decks due this week"}
              </div>
            </div>
          </div>
        </div>
      </div>
      <label htmlFor="sortingOptions" className="mx-15 mt-2 flex justify-end">
        <select
          id="sortingOptions"
          className="rounded-lg bg-primary-grey p-2 text-white focus:outline-none focus:ring-2 focus:ring-accent"
        >
          <option value="name">Sort by Name</option>
          <option value="mastery">Sort by Mastery</option>
          <option value="dueDate">Sort by Due Date</option>
        </select>
      </label>
      <div className="mx-15 mt-15 grid grid-cols-1 gap-15 md:grid-cols-2 xl:grid-cols-3">
        {decks.map((deck) => (
          <DeckCard key={deck.id} text={deck.name} />
        ))}
      </div>
    </div>
  );
}
