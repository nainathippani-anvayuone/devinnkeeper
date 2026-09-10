import { Variants } from "framer-motion";

// Check if user prefers reduced motion
const prefersReducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: prefersReducedMotion ? 0.01 : 0.5, ease: "easeOut" }
  }
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: prefersReducedMotion ? 0.01 : 0.45, ease: [0.22, 1, 0.36, 1] }
  }
};

export const scaleUp: Variants = {
  hidden: { opacity: 0, scale: prefersReducedMotion ? 1 : 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: prefersReducedMotion ? 0.01 : 0.4, ease: [0.175, 0.885, 0.32, 1.275] }
  }
};

export const slideInLeft: Variants = {
  hidden: { opacity: 0, x: prefersReducedMotion ? 0 : -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: prefersReducedMotion ? 0.01 : 0.4, ease: "easeOut" }
  }
};

export const slideInRight: Variants = {
  hidden: { opacity: 0, x: prefersReducedMotion ? 0 : 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: prefersReducedMotion ? 0.01 : 0.4, ease: "easeOut" }
  }
};

export const staggerContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: prefersReducedMotion ? 0.01 : 0.12,
      delayChildren: 0.1
    }
  }
};

// Hero entrance stagger: Background -> Overlay -> Logo -> Title -> Description -> Buttons
export const heroSequenceContainer: Variants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: prefersReducedMotion ? 0.01 : 0.18,
      delayChildren: 0.2
    }
  }
};

export const buttonHover = {
  hover: prefersReducedMotion ? {} : {
    scale: 1.04,
    boxShadow: "0 10px 25px -5px rgba(14, 116, 144, 0.4), 0 8px 10px -6px rgba(14, 116, 144, 0.3)",
    transition: { duration: 0.2, ease: "easeOut" }
  },
  tap: prefersReducedMotion ? {} : {
    scale: 0.96,
    transition: { duration: 0.1 }
  }
};

export const buttonSecondaryHover = {
  hover: prefersReducedMotion ? {} : {
    scale: 1.04,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    boxShadow: "0 10px 25px -5px rgba(255, 255, 255, 0.2)",
    transition: { duration: 0.2, ease: "easeOut" }
  },
  tap: prefersReducedMotion ? {} : {
    scale: 0.96,
    transition: { duration: 0.1 }
  }
};

export const cardHover = {
  rest: { y: 0, boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)" },
  hover: prefersReducedMotion ? {} : {
    y: -5,
    boxShadow: "0 20px 30px -10px rgba(15, 23, 42, 0.15)",
    transition: { duration: 0.25, ease: "easeOut" }
  }
};

export const pageTransitionVariants: Variants = {
  initial: {
    opacity: 0,
    y: prefersReducedMotion ? 0 : 8,
    scale: prefersReducedMotion ? 1 : 0.99
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: prefersReducedMotion ? 0.01 : 0.35,
      ease: [0.25, 0.1, 0.25, 1]
    }
  },
  exit: {
    opacity: 0,
    y: prefersReducedMotion ? 0 : -8,
    transition: {
      duration: prefersReducedMotion ? 0.01 : 0.2,
      ease: "easeIn"
    }
  }
};
