import type { FlowerClockProps } from "./FlowerOfLifeClock";

export const DEFAULT_CLOCK_CONFIG = {
  mode: "wall-clock",
  paletteMode: "dayPhase",

  performanceMode: "balanced",
  pauseWhenHidden: true,

  showStatus: true,
  showMinuteTicks: false,

  showDrawHead: true,
  showIntersectionNodes: true,

  showStarfield: true,
  showBackground: true,
  backgroundMode: "full",
  backgroundStrength: 0.75,
  weekdayMode: "cycle-day",
  showWeekdayInStatus: false,

  paletteTransitionMs: 1500,
  lerpFactor: 0.18,
} satisfies Partial<FlowerClockProps>;

export const DEMO_CLOCK_CONFIG = {
  mode: "cycle",
  cycleMs: 30_000,
  paletteMode: "cycle",

  performanceMode: "quality",
  pauseWhenHidden: true,

  showStatus: true,
  showMinuteTicks: true,

  showDrawHead: true,
  showIntersectionNodes: true,

  showStarfield: true,
  showBackground: true,
  backgroundMode: "full",
  backgroundStrength: 1,
  weekdayMode: "cycle-minute",
  showWeekdayInStatus: true,

  paletteTransitionMs: 1200,
  lerpFactor: 0.18,

  showHeavyGlowEffects: true,
} satisfies Partial<FlowerClockProps>;