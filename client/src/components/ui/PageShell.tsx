import type { ReactNode } from "react";
import { motion } from "motion/react";
import { fadeIn } from "../../lib/motion";

interface PageShellProps {
  children: ReactNode;
  /** Use wide for dashboard / discovery grids */
  width?: "default" | "wide";
  className?: string;
  animate?: boolean;
}

/** Standard page padding + max-width for logged-in screens. */
export function PageShell({
  children,
  width = "default",
  className = "",
  animate = true,
}: PageShellProps) {
  const widthClass =
    width === "wide" ? "max-w-7xl" : "max-w-6xl";

  const body = (
    <div
      className={`mx-auto w-full ${widthClass} px-4 pb-10 pt-8 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  );

  if (!animate) return body;

  return (
    <motion.div
      className="w-full"
      variants={fadeIn}
      initial="hidden"
      animate="show"
    >
      {body}
    </motion.div>
  );
}
