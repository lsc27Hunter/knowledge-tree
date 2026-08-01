import type { Variants } from "motion/react";

const easeOut = [0.22, 1, 0.36, 1] as const;

// Keep animations short — just enough to show state changes.
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: easeOut },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

export const staggerChildren: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

// Study card swipe: custom={1} next, custom={-1} prev.
export const slideHorizontal: Variants = {
  enter: (direction: number) => ({
    x: direction >= 0 ? 36 : -36,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.28, ease: easeOut },
  },
  exit: (direction: number) => ({
    x: direction >= 0 ? -28 : 28,
    opacity: 0,
    transition: { duration: 0.18, ease: "easeIn" },
  }),
};
