import { UserButton, useUser } from "@clerk/react";

import { useEffect, useRef, useState } from "react";

import { Navbar } from "../components/ui/Navbar";
import { DeckCard } from "../components/ui/DeckCard";

import Checkmark from "../assets/checkmark-circle.svg";
import StarBadge from "../assets/star-badge.svg";
import Danger from "../assets/danger.svg";

export default function DashboardPage() {
  const { isLoaded, user } = useUser();
  const [sortingOption, setSortingOption] = useState("Due Date");
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  const sortingOptions = ["Due Date", "Mastery", "Last Studied"];

  useEffect(() => {
    const closeMenuOnOutsideClick = (event: MouseEvent | TouchEvent) => {
      if (
        sortMenuRef.current &&
        !sortMenuRef.current.contains(event.target as Node)
      ) {
        setIsSortMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenuOnOutsideClick);
    document.addEventListener("touchstart", closeMenuOnOutsideClick);

    return () => {
      document.removeEventListener("mousedown", closeMenuOnOutsideClick);
      document.removeEventListener("touchstart", closeMenuOnOutsideClick);
    };
  }, []);

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background px-6 py-10 text-primary-light-grey font-inter">
        Loading...
      </div>
    );
  }

  const userData = {
    userId: user?.id,
    userName: user?.username ?? user?.fullName ?? user?.firstName ?? "Learner",
    userEmail: user?.primaryEmailAddress?.emailAddress ?? "",
    userFirstName:
      user?.username?.split(" ")[0] ?? user?.firstName ?? "Learner",
    currentStreak: 7, // to do: figure out how to calculate this from backend data
  };

  // to do: fetch decks from backend, remove mock demo data
  const decks = [
    {
      id: 1,
      name: "OperatingSystemsLec1-09/23",
      description: "Operating Systems Cumulative Deck",
      mastery: 0.27,
      dueDate: null,
      totalCards: 23,
      lastStudiedAt: "2023-06-25T12:00:00Z",
    },
    {
      id: 2,
      name: "Spanish Verbs",
      description: null,
      mastery: 0.5,
      dueDate: null,
      totalCards: 10,
      lastStudiedAt: "2026-06-25T12:00:00Z",
    },
    {
      id: 3,
      name: "Discrete Structures",
      description: null,
      mastery: 1,
      dueDate: "2026-07-06:00:00Z",
      totalCards: 40,
      lastStudiedAt: "2026-06-25T12:00:00Z",
    },
    {
      id: 4,
      name: "Databases & SQL",
      description: null,
      mastery: 1,
      dueDate: null,
      totalCards: 40,
      lastStudiedAt: "2026-06-25T12:00:00Z",
    },
  ];

  decks.sort((a, b) => {
    if (sortingOption === "Due Date") {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    } else if (sortingOption === "Mastery") {
      return b.mastery - a.mastery;
    } else if (sortingOption === "Last Studied") {
      return (
        new Date(b.lastStudiedAt).getTime() -
        new Date(a.lastStudiedAt).getTime()
      );
    }
    return 0;
  });

  const deckCount = decks.length;

  const cardCount = decks.reduce((acc, deck) => acc + deck.totalCards, 0);

  const averageMastery =
    decks.reduce((acc, deck) => acc + deck.mastery, 0) / deckCount;

  const decksDueThisWeek = decks.filter((deck) => {
    if (!deck.dueDate) return false;

    const dueDateOnly = deck.dueDate.slice(0, 10);
    const dueDate = new Date(`${dueDateOnly}T00:00:00`);

    if (Number.isNaN(dueDate.getTime())) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const oneWeekFromToday = new Date(today);
    oneWeekFromToday.setDate(today.getDate() + 7);

    return dueDate >= today && dueDate <= oneWeekFromToday;
  });

  return (
    <div>
      <Navbar version="Dashboard" userButton={<UserButton />} />

      <h2 className="font-inter text-white text-title-medium font-medium mx-15 mt-15 sm:text-regular">
        {userData.userFirstName
          ? `${userData.userFirstName}'s decks`
          : "My decks"}
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
      <div className="mx-4 mt-2 flex justify-center sm:mx-15 sm:justify-end">
        <div className="relative" ref={sortMenuRef}>
          <button
            type="button"
            className="rounded-lg bg-background px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-accent"
            aria-haspopup="menu"
            aria-expanded={isSortMenuOpen}
            onClick={() => setIsSortMenuOpen((open) => !open)}
          >
            Sort by {sortingOption} v
          </button>

          {isSortMenuOpen ? (
            <div
              role="menu"
              className="absolute left-1/2 top-full z-40 mt-2 w-48 -translate-x-1/2 rounded-lg border border-primary-grey bg-background p-1 shadow-lg sm:left-auto sm:right-0 sm:translate-x-0"
            >
              {sortingOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  role="menuitem"
                  className="block w-full rounded-md px-3 py-2 text-left text-white hover:bg-primary-grey"
                  onClick={() => {
                    setSortingOption(option);
                    setIsSortMenuOpen(false);
                  }}
                >
                  Sort by {option}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="mx-15 mt-15 grid grid-cols-1 gap-15 md:grid-cols-2 xl:grid-cols-3">
        {decks.map((deck) => (
          <DeckCard key={deck.id} deckData={deck} />
        ))}
      </div>
    </div>
  );
}
