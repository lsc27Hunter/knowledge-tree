import { useAuth } from "@clerk/react";
import { useNavigate } from "react-router-dom";

import { Navbar } from "../components/ui/Navbar";
import { About } from "../components/ui/About";
import { Button } from "../components/ui/Button";

import ArrowRight from "../assets/arrow-right.svg";

export default function LandingPage() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      <Navbar version="Landing" />
      <div className="px-6 pt-16 sm:px-10 sm:pt-24 md:px-16 md:pt-32 lg:px-25 lg:pt-40">
        <About />
      </div>

      <div className="mt-8 px-6 sm:px-10 md:px-16 lg:px-25">
        <Button
          text="Start Studying"
          width="fit"
          icon={ArrowRight}
          onClick={() => navigate(isSignedIn ? "/dashboard" : "/sign-in")}
        />
      </div>
    </div>
  );
}
