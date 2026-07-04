import { UserButton } from "@clerk/react";

import { Navbar } from "../components/ui/Navbar";

export default function DashboardPage() {
  return (
    <div>
      <Navbar version="Dashboard" userButton={<UserButton />} />
      <div className="px-6 py-10 sm:px-10 md:px-16">
        <h1 className="font-inter text-white text-title">Dashboard</h1>
        <p className="font-inter text-primary-light-grey mt-2">
          Your decks will show up here.
        </p>
      </div>
    </div>
  );
}
