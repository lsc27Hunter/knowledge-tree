import React from "react";

import { Navbar } from "../components/ui/Navbar";
import { About } from "../components/ui/About";
import { Button } from "../components/ui/Button";

import ArrowRight from "../assets/arrow-right.svg";

const LandingPage: React.FC = () => {
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
          to="/login"
        />
      </div>
    </div>
  );
};

export default LandingPage;
