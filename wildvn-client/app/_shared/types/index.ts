/* ─────────────────────────────────────────────
   Types: Shared TypeScript interfaces cho Home module
   ───────────────────────────────────────────── */

export interface SlideStat {
  value: number;
  label: string;
}

export interface SlideData {
  id: number;
  title: string;
  subtitle: string;
  desc: string;
  cta: string;
  accentColor: string;
  stat: SlideStat;
}

export interface SplitTextProps {
  text: string;
  accentColor: string;
}

export interface AnimatedCounterProps {
  value: number;
  label: string;
  accentColor: string;
}

export interface SlideNumberProps {
  index: number;
  total: number;
}

export interface SlidePaginationProps {
  slides: SlideData[];
  activeSlide: number;
  accentColor: string;
  progressPercent: number;
  onSlideChange: (index: number) => void;
}

export interface ScrollIndicatorProps {
  visible: boolean;
}
