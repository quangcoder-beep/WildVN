/**
 * WILDVN - Motion Token System
 * Enforces unified animation constants for performance, accessibility, and visual harmony.
 */

// Durations (in seconds)
export const MOTION_DURATIONS = {
  INSTANT: 0,
  FAST: 0.15,      // micro-interactions, hover responses
  NORMAL: 0.3,     // standard UI reveals, menu transitions
  CINEMATIC: 0.8,  // editorial content, large panels, story pacing
  SLOW: 1.4,       // ambient scene sweeps, slow transitions
};

// CSS Transitions (matching durations for pure CSS transitions)
export const MOTION_TRANSITIONS = {
  FAST: `all ${MOTION_DURATIONS.FAST}s cubic-bezier(0.16, 1, 0.3, 1)`,
  NORMAL: `all ${MOTION_DURATIONS.NORMAL}s cubic-bezier(0.16, 1, 0.3, 1)`,
  CINEMATIC: `all ${MOTION_DURATIONS.CINEMATIC}s cubic-bezier(0.16, 1, 0.3, 1)`,
};

// Easings (bezier curves)
export const MOTION_EASINGS = {
  // Apple/Codegrid standard out curve (fast start, gradual settle)
  OUT_EXPO: [0.16, 1, 0.3, 1],
  // Smooth symmetric easing for continuous loops
  IN_OUT_SINE: [0.44, 0, 0.56, 1],
  // Easing with subtle bounce for gamification/feedback
  BACK_OUT: [0.34, 1.56, 0.64, 1],
};

// GSAP-formatted easings
export const GSAP_EASINGS = {
  OUT_EXPO: "expo.out",
  IN_OUT_SINE: "sine.inOut",
  SMOOTH_SCROLL: "power2.out",
};

// Framer Motion Springs (prefer springs over easing for layout animations)
export const MOTION_SPRINGS = {
  // Snappy response for cards, buttons
  SNAPPY: {
    type: "spring" as const,
    stiffness: 300,
    damping: 25,
    mass: 1,
  },
  // Smooth, luxurious movement for editorial overlays
  CINEMATIC: {
    type: "spring" as const,
    stiffness: 120,
    damping: 18,
    mass: 1,
  },
  // Slow, floating physics for ambient overlays
  BOUNCY: {
    type: "spring" as const,
    stiffness: 80,
    damping: 12,
    mass: 1,
  },
};

// Animation budget constraints
export const MOTION_BUDGET = {
  MAX_CONCURRENT_ANIMATIONS: 3,
  STAGGER_SPEED_FAST: 0.05, // ms delay between grid children (snappy)
  STAGGER_SPEED_SLOW: 0.12, // ms delay between grid children (cinematic)
};
