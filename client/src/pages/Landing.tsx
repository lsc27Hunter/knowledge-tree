import { useAuth } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";

import { Navbar } from "../components/ui/Navbar";
import { About } from "../components/ui/About";
import { Button } from "../components/ui/Button";
import { fadeUp, staggerChildren } from "../lib/motion";
import { hoverCard } from "../lib/interaction";

import ArrowRight from "../assets/arrow-right.svg";

export default function LandingPage() {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_color-mix(in_srgb,_var(--color-accent)_20%,_transparent),_transparent_58%)]"
      />
      <Navbar version="Landing" />

      <main className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 pb-20 pt-16 text-center sm:px-6 sm:pt-24 lg:pt-28">
        <motion.div
          className="w-full"
          variants={staggerChildren}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeUp}>
            <About centered />
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <Button
              text="Start Studying"
              width="fit"
              icon={ArrowRight}
              themeIcon
              onClick={() => navigate(isSignedIn ? "/dashboard" : "/sign-in")}
            />
            <Button
              text="Explore Discovery"
              width="fit"
              color="primary-grey"
              textColor="fg"
              to={isSignedIn ? "/discovery" : "/sign-in"}
            />
          </motion.div>

          <motion.section
            variants={fadeUp}
            className="mt-16 grid w-full gap-4 text-left sm:mt-20 md:grid-cols-3"
          >
          <Feature
            title="Spaced Review"
            body="SM-2 scheduling keeps hard cards close and mastered cards further out."
          />
          <Feature
            title="Git-Style Merge"
            body="Import classmate CSV updates without wiping the progress you already earned."
          />
          <Feature
            title="Shared Decks"
            body="Publish decks to Discovery and clone useful sets into your own dashboard."
          />
          </motion.section>
        </motion.div>
      </main>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-primary-grey/80 p-5 shadow-sm transition-[border-color,box-shadow] duration-150 ${hoverCard}`}
    >
      <h2 className="type-title text-fg">{title}</h2>
      <p className="type-caption mt-2 leading-relaxed text-primary-light-grey">
        {body}
      </p>
    </div>
  );
}
