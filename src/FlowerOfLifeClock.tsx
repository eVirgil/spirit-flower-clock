/**
 * FlowerOfLifeClock
 *
 * Animated SVG clock built around Flower of Life sacred geometry.
 *
 * The component draws the geometry over a timed cycle, optionally aligned to the
 * real current minute. Each reveal step draws one or more circles with SVG stroke
 * dashes. A comet-like draw head can trace the active stroke, intersection nodes
 * can pulse when geometry becomes complete, and the final phase can add a glow
 * completion effect.
 *
 * Time layers
 * ----------
 * - Minute: reveal progress across the full Flower of Life cycle.
 * - Optional minute ticks: sixty outer tick marks, lit by elapsed cycle progress.
 * - Hour/day phase: palette selection can follow a simple cycle, the current hour,
 *   or broad day phases such as night, dawn, day, sunset, and evening.
 * - Weekday: subtle background atmosphere can change star rhythm, sky tint, and
 *   aura breathing without changing the core Flower geometry.
 *
 * Performance strategy
 * --------------------
 * This file is the optimized version of the visual clock. The original richer
 * version used many always-running Framer Motion animations and an extra RAF loop
 * for lerped progress. This version keeps one clock driver, limits animated stars
 * and nodes by performance mode, renders overflow visual elements statically, and
 * disables heavy glow layers by default in balanced/lite modes.
 *
 * Recommended defaults
 * --------------------
 * - Use `performanceMode="balanced"` for normal UI use.
 * - Use `performanceMode="lite"` for dashboards, always-on displays, laptops, or
 *   mobile devices.
 * - Use `performanceMode="quality"` only when the full ceremonial effect is worth
 *   the extra GPU/CPU cost.
 *
 * Example
 * -------
 * ```tsx
 * <FlowerOfLifeClock
 *   mode="wall-clock"
 *   paletteMode="dayPhase"
 *   performanceMode="balanced"
 *   showDayAtmosphere
 * />
 * ```
 */
import { motion } from "framer-motion";
import { memo, useEffect, useMemo, useRef, useState } from "react";

const SQRT3 = Math.sqrt(3);
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

/** Hex-grid distance ring used to place Flower of Life circle centers. */
type Ring = 0 | 1 | 2 | 3;
/**
 * Controls how reveal progress is calculated.
 *
 * - `cycle`: repeat using `cycleMs`. Useful for demos or non-clock animations.
 * - `wall-clock`: align the reveal to the current real minute. `cycleMs` is ignored.
 */
type ClockMode = "cycle" | "wall-clock";
/**
 * Controls how the active color palette is selected.
 *
 * - `cycle`: palette advances each redraw cycle.
 * - `hour`: palette follows the current hour of the day.
 * - `dayPhase`: palette follows broad time-of-day phases.
 */
type PaletteMode = "cycle" | "hour" | "dayPhase";
/**
 * Controls how weekday atmosphere is selected.
 *
 * - `real`: use the actual current weekday.
 * - `cycle`: cycle weekday atmosphere by redraw index for testing/demo mode.
 */
type WeekdayMode = "real" | "cycle";
/**
 * Weekday background behavior mode.
 *
 * - `rhythm`: star twinkle timing + aura breathing.
 * - `weather`: rhythm plus directional star drift.
 * - `aura`: aura and sky tint only.
 * - `full`: all weekday atmosphere effects.
 */
type DayAtmosphereMode = "rhythm" | "weather" | "aura" | "full";
/**
 * Built-in performance presets.
 *
 * - `quality`: closest to the full visual design; highest GPU/CPU cost.
 * - `balanced`: recommended default; keeps the look but caps animation counts.
 * - `lite`: lowest cost; mostly static background/nodes and slower updates.
 */
type PerformanceMode = "quality" | "balanced" | "lite";

type Pt = {
  x: number;
  y: number;
  id: string;
  ring: Ring;
  q: number;
  s: number;
};

type Palette = {
  name: string;
  line: string;
  bright: string;
  glow: string;
  soft: string;
};

type Piece =
  | {
      kind: "circle";
      id: string;
      cx: number;
      cy: number;
      r: number;
      strokeWidth: number;
      opacity: number;
      clipped: boolean;
    };

type RevealStep = {
  id: string;
  label: string;
  pieces: Piece[];
};

type DrawHeadTrailPoint = {
  id: string;
  x: number;
  y: number;
  opacity: number;
  scale: number;
};

type DrawHeadParticle = {
  id: string;
  x: number;
  y: number;
  r: number;
  opacity: number;
  delay: number;
};

type DrawHead = {
  id: string;
  x: number;
  y: number;
  clipped: boolean;
  opacity: number;
  tail: DrawHeadTrailPoint[];
  particles: DrawHeadParticle[];
};

type IntersectionNode = {
  id: string;
  x: number;
  y: number;
  pieceIds: [string, string];
};

type Star = {
  id: string;
  x: number;
  y: number;
  r: number;
  opacity: number;
  delay: number;
  duration: number;
  drift: number;
};

type WeekdayAtmosphere = {
  name: string;
  tint: string;
  tintOpacity: number;
  auraDuration: number;
  auraScale: number;
  auraOpacityBoost: number;
  starDurationMul: number;
  starScalePeak: number;
  starOpacityLow: number;
  starOpacityHigh: number;
  starDriftMul: number;
  starDriftAngle: number;
  starStaggerMul: number;
};

/**
 * Public props for {@link FlowerOfLifeClock}.
 *
 * The props are intentionally grouped around four concerns:
 *
 * 1. Geometry/layout: `r`, `rotateDeg`, `clipMul`, `boundaryOffset`, `className`.
 * 2. Time/color: `mode`, `cycleMs`, `tickMs`, `paletteMode`, `paletteTransitionMs`.
 * 3. Visual layers: draw head, ticks, intersections, starfield, and weekday atmosphere.
 * 4. Performance/event hooks: animation caps, heavy-effect toggles, pause behavior,
 *    and callback hooks for audio or external state.
 *
 * Most callers should only set `mode`, `paletteMode`, and `performanceMode`.
 * Tune individual limits only after profiling in the target environment.
 */
export type FlowerClockProps = {
  /**
   * Full redraw duration in milliseconds when `mode="cycle"`.
   *
   * Default: `60_000`.
   * Ignored when `mode="wall-clock"`, because wall-clock mode always maps the
   * animation to the current real minute.
   */
  cycleMs?: number;
  /**
   * Minimum interval between clock/progress updates.
   *
   * Lower values are smoother but cause more React/SVG work. When omitted, the
   * value comes from `performanceMode`: quality ≈ 16ms, balanced ≈ 33ms,
   * lite ≈ 66ms.
   */
  tickMs?: number;
  /**
   * Base radius for every Flower of Life circle in SVG coordinate units.
   *
   * Default: `60`. Increasing this scales the core geometry and all derived
   * boundaries. Prefer changing the surrounding CSS size before changing `r`.
   */
  r?: number;
  /**
   * Rotation applied to the Flower geometry group in degrees.
   *
   * Default: `30`, preserving the locked-in orientation from the original design.
   */
  rotateDeg?: number;
  /**
   * Multiplier used to calculate the clipping radius around the core geometry.
   *
   * Default: `3`. The clipped ring-three circles appear as outer arcs inside
   * this boundary.
   */
  clipMul?: number;
  /**
   * Additional spacing between the inner clip boundary and the outer boundary.
   *
   * Default: `10` SVG units.
   */
  boundaryOffset?: number;
  /**
   * Optional class applied to the root wrapper.
   *
   * When omitted, the component uses a full-size black flex container suitable
   * for centered display.
   */
  className?: string;
  /**
   * Whether to show small text beneath the SVG with step/cycle/time information.
   *
   * Default: `true`. Disable for ambient/zen display.
   */
  showStatus?: boolean;
  /**
   * Per-render smoothing factor for active stroke progress.
   *
   * Range: `0..1`. Higher values catch up faster; lower values feel softer but
   * lag behind the true clock. This optimized version does not create a second
   * RAF loop for smoothing.
   *
   * Default: `0.18`.
   */
  lerpFactor?: number;
  /**
   * Controls whether the animation is a free-running cycle or a real clock.
   *
   * - `cycle`: uses `cycleMs` and repeats continuously.
   * - `wall-clock`: maps progress to the current second/millisecond of the minute.
   *
   * Default: `"cycle"`.
   */
  mode?: ClockMode;
  /**
   * Selects the active palette strategy.
   *
   * - `cycle`: changes palette each redraw cycle.
   * - `hour`: changes palette by current hour.
   * - `dayPhase`: changes palette by broad time-of-day phases.
   *
   * Default in this optimized file: `"dayPhase"`.
   */
  paletteMode?: PaletteMode;
  /**
   * Palette crossfade duration in milliseconds near palette boundaries.
   *
   * Default: `1_500`. Set to `0` for hard palette cuts.
   */
  paletteTransitionMs?: number;
  /**
   * Whether to show the comet/spark at the active stroke edge.
   *
   * This is one of the more dynamic layers, but it is cheaper than the old version
   * because most particles are static SVG circles rather than Framer Motion nodes.
   */
  showDrawHead?: boolean;
  /**
   * Base radius of the active draw-head spark.
   *
   * Default: `3` SVG units. Halo/tail elements are scaled from this value.
   */
  drawHeadRadius?: number;
  /**
   * Whether to render sixty outer minute/second ticks around the boundary.
   *
   * Major ticks appear every five marks. Lit ticks follow cycle progress.
   */
  showMinuteTicks?: boolean;
  /**
   * Whether to render pulse nodes at circle intersections after both contributing
   * circles are visible.
   *
   * Animated node count is capped by `animatedIntersectionNodeLimit`; remaining
   * nodes render statically to protect performance.
   */
  showIntersectionNodes?: boolean;
  /**
   * Whether to render the background star/dust field.
   *
   * Animated star count is capped by `animatedStarLimit`; remaining stars render
   * statically. Disable for maximum battery/GPU savings.
   */
  showStarfield?: boolean;
  /**
   * Total star/dust count.
   *
   * When omitted, the value comes from `performanceMode`. Hard-capped internally
   * to avoid accidental runaway rendering.
   */
  starCount?: number;
  /**
   * Enables subtle weekday identity in the background only.
   *
   * This never changes the Flower geometry. It affects star rhythm, aura breathing,
   * directional drift, and faint sky tint depending on `dayAtmosphereMode`.
   */
  showDayAtmosphere?: boolean;
  /**
   * Selects which weekday atmosphere channels are active.
   *
   * - `rhythm`: star twinkle cadence and aura breathing.
   * - `weather`: rhythm plus directional star drift.
   * - `aura`: sky tint/aura only.
   * - `full`: all channels.
   *
   * Default: `"rhythm"` for a restrained background.
   */
  dayAtmosphereMode?: DayAtmosphereMode;
  /**
   * Strength of weekday atmosphere blending.
   *
   * Range: `0..1`. Values outside the range are clamped. Use `0.5..0.8` if the
   * background starts competing with the Flower.
   */
  dayAtmosphereStrength?: number;
  /**
   * Selects weekday source for atmosphere.
   *
   * - `real`: actual local weekday from `Date`.
   * - `cycle`: weekday index follows `cycleIndex`, useful for testing each style.
   */
  weekdayMode?: WeekdayMode;
  /**
   * Whether to include the weekday name in the secondary status line.
   *
   * Default: `false`, preserving the ambient visual design without textual labels.
   */
  showWeekdayInStatus?: boolean;
  /**
   * Built-in performance preset.
   *
   * - `quality`: richer visuals, 16ms updates, many animated elements.
   * - `balanced`: recommended default, about 30fps updates and capped animations.
   * - `lite`: slow updates, mostly static background/nodes, best for always-on use.
   */
  performanceMode?: PerformanceMode;
  /**
   * Maximum number of stars that use Framer Motion animation.
   *
   * Remaining stars render as plain SVG circles. Omit to use the selected preset.
   */
  animatedStarLimit?: number;
  /**
   * Maximum number of intersection nodes that use Framer Motion animation.
   *
   * Remaining nodes render as static SVG dots. Omit to use the selected preset.
   */
  animatedIntersectionNodeLimit?: number;
  /**
   * Number of comet particles generated per active drawing circle.
   *
   * Omit to use the selected preset. Lower this first if the spark looks good but
   * the GPU is still too busy.
   */
  drawHeadParticleCount?: number;
  /**
   * Number of tail samples behind the active drawing spark.
   *
   * Omit to use the selected preset. Tail circles are plain SVG and cheaper than
   * animated particles.
   */
  drawHeadTailCount?: number;
  /**
   * Enables the heaviest final-glow layers.
   *
   * Includes shockwave, phoenix sweep, shimmer overlay, and soft blur glow. Omit to
   * use the preset default. Keep disabled for dashboards, mobile, or long-running
   * always-on sessions.
   */
  showHeavyGlowEffects?: boolean;
  /**
   * Pauses clock state updates while the document is hidden.
   *
   * Default: `true`. This does not permanently stop CSS/Framer internals, but it
   * prevents the component's own progress driver from doing work in hidden tabs.
   */
  pauseWhenHidden?: boolean;
  /**
   * Called whenever the active reveal step changes.
   *
   * Useful for status sync, telemetry, or external UI. Keep handlers cheap because
   * they run on step boundaries during the animation.
   */
  onStepChange?: (step: {
    stepIndex: number;
    totalSteps: number;
    label: string;
    paletteName: string;
    cycleIndex: number;
  }) => void;
  /**
   * Fires when the previous reveal step completes and its geometry pieces become
   * fully visible.
   *
   * Intended for lightweight sound hooks such as a chime or procedural audio cue.
   */
  onCircleComplete?: (event: {
    pieceId: string;
    stepIndex: number;
    label: string;
    paletteName: string;
    cycleIndex: number;
  }) => void;
  /**
   * Fires when the final glow/completion phase begins.
   *
   * Intended for completion sounds, telemetry, or external state changes.
   */
  onGlowStart?: (event: {
    stepIndex: number;
    totalSteps: number;
    paletteName: string;
    cycleIndex: number;
  }) => void;
  /**
   * Fires when one full redraw cycle rolls into the next cycle.
   *
   * In wall-clock mode, this effectively happens on minute boundaries.
   */
  onCycleComplete?: (event: {
    completedCycleIndex: number;
    nextCycleIndex: number;
    paletteName: string;
  }) => void;
};

const palettes: Palette[] = [
  // Reds
  {
    name: "Rose Bloom",
    line: "#ff4081",
    bright: "#ffffff",
    glow: "#f50057",
    soft: "#ff80ab",
  },
  // Oranges
  {
    name: "Cosmic Fire",
    line: "#ff6d00",
    bright: "#ffffff",
    glow: "#dd2c00",
    soft: "#ff9e80",
  },
  // Yellows
  {
    name: "Solar Gold",
    line: "#ffd740",
    bright: "#ffffff",
    glow: "#ff9100",
    soft: "#ffe082",
  },
  // Greens
  {
    name: "Emerald Life",
    line: "#00e676",
    bright: "#ffffff",
    glow: "#00bfa5",
    soft: "#b9f6ca",
  },
  // Blues
  {
    name: "Ocean Cyan",
    line: "#00e5ff",
    bright: "#ffffff",
    glow: "#0091ea",
    soft: "#80d8ff",
  },
  // Indigos
  {
    name: "Astral Indigo",
    line: "#536dfe",
    bright: "#ffffff",
    glow: "#304ffe",
    soft: "#8c9eff",
  },
  // Violets
  {
    name: "Violet Dusk",
    line: "#b44fff",
    bright: "#ffffff",
    glow: "#7f2fff",
    soft: "#ce93d8",
  },
];

const DAY_PHASES: { startHour: number; paletteIndex: number }[] = [
  { startHour: 0, paletteIndex: 5 }, // night: Astral Indigo
  { startHour: 5, paletteIndex: 2 }, // dawn/morning: Solar Gold
  { startHour: 10, paletteIndex: 3 }, // day: Emerald Life
  { startHour: 14, paletteIndex: 4 }, // afternoon: Ocean Cyan
  { startHour: 17, paletteIndex: 1 }, // sunset: Cosmic Fire
  { startHour: 20, paletteIndex: 6 }, // evening: Violet Dusk
  { startHour: 22, paletteIndex: 0 }, // late night: Rose Bloom
];

const WEEKDAY_ATMOSPHERES: WeekdayAtmosphere[] = [
  {
    name: "Sunday",
    tint: "#ffd740",
    tintOpacity: 0.045,
    auraDuration: 5.2,
    auraScale: 1.06,
    auraOpacityBoost: 0.16,
    starDurationMul: 1.12,
    starScalePeak: 1.32,
    starOpacityLow: 0.32,
    starOpacityHigh: 1.08,
    starDriftMul: 0.78,
    starDriftAngle: -Math.PI / 2,
    starStaggerMul: 1.0,
  },
  {
    name: "Monday",
    tint: "#8c9eff",
    tintOpacity: 0.04,
    auraDuration: 6.8,
    auraScale: 1.035,
    auraOpacityBoost: 0.1,
    starDurationMul: 1.42,
    starScalePeak: 1.16,
    starOpacityLow: 0.4,
    starOpacityHigh: 0.92,
    starDriftMul: 0.56,
    starDriftAngle: -Math.PI * 0.72,
    starStaggerMul: 1.35,
  },
  {
    name: "Tuesday",
    tint: "#ff80ab",
    tintOpacity: 0.038,
    auraDuration: 3.1,
    auraScale: 1.075,
    auraOpacityBoost: 0.18,
    starDurationMul: 0.68,
    starScalePeak: 1.44,
    starOpacityLow: 0.22,
    starOpacityHigh: 1.18,
    starDriftMul: 1.22,
    starDriftAngle: -Math.PI * 0.36,
    starStaggerMul: 0.62,
  },
  {
    name: "Wednesday",
    tint: "#00e5ff",
    tintOpacity: 0.038,
    auraDuration: 4.4,
    auraScale: 1.045,
    auraOpacityBoost: 0.12,
    starDurationMul: 0.92,
    starScalePeak: 1.24,
    starOpacityLow: 0.3,
    starOpacityHigh: 1.0,
    starDriftMul: 0.92,
    starDriftAngle: -Math.PI * 0.25,
    starStaggerMul: 0.86,
  },
  {
    name: "Thursday",
    tint: "#536dfe",
    tintOpacity: 0.046,
    auraDuration: 6.1,
    auraScale: 1.06,
    auraOpacityBoost: 0.17,
    starDurationMul: 1.2,
    starScalePeak: 1.28,
    starOpacityLow: 0.28,
    starOpacityHigh: 1.06,
    starDriftMul: 0.82,
    starDriftAngle: Math.PI / 2,
    starStaggerMul: 1.1,
  },
  {
    name: "Friday",
    tint: "#b44fff",
    tintOpacity: 0.048,
    auraDuration: 3.5,
    auraScale: 1.09,
    auraOpacityBoost: 0.2,
    starDurationMul: 0.74,
    starScalePeak: 1.5,
    starOpacityLow: 0.22,
    starOpacityHigh: 1.22,
    starDriftMul: 1.08,
    starDriftAngle: -Math.PI * 0.82,
    starStaggerMul: 0.58,
  },
  {
    name: "Saturday",
    tint: "#00e676",
    tintOpacity: 0.04,
    auraDuration: 7.4,
    auraScale: 1.04,
    auraOpacityBoost: 0.11,
    starDurationMul: 1.55,
    starScalePeak: 1.18,
    starOpacityLow: 0.36,
    starOpacityHigh: 0.96,
    starDriftMul: 0.48,
    starDriftAngle: Math.PI * 0.82,
    starStaggerMul: 1.55,
  },
];

type PerformanceConfig = {
  defaultTickMs: number;
  defaultStarCount: number;
  animatedStarLimit: number;
  animatedIntersectionNodeLimit: number;
  drawHeadParticleCount: number;
  drawHeadTailCount: number;
  heavyGlowEffects: boolean;
};

/**
 * Preset budgets for animation cost.
 *
 * These values are deliberately conservative in `balanced` and `lite`. The goal is
 * to stop long-running GPU/memory waves caused by many simultaneous SVG/Motion
 * animations while preserving the clock's identity.
 */
const PERFORMANCE_CONFIGS: Record<PerformanceMode, PerformanceConfig> = {
  quality: {
    defaultTickMs: 16,
    defaultStarCount: 64,
    animatedStarLimit: 64,
    animatedIntersectionNodeLimit: 96,
    drawHeadParticleCount: 18,
    drawHeadTailCount: 10,
    heavyGlowEffects: true,
  },
  balanced: {
    defaultTickMs: 33,
    defaultStarCount: 36,
    animatedStarLimit: 14,
    animatedIntersectionNodeLimit: 18,
    drawHeadParticleCount: 7,
    drawHeadTailCount: 7,
    heavyGlowEffects: false,
  },
  lite: {
    defaultTickMs: 66,
    defaultStarCount: 18,
    animatedStarLimit: 0,
    animatedIntersectionNodeLimit: 0,
    drawHeadParticleCount: 0,
    drawHeadTailCount: 4,
    heavyGlowEffects: false,
  },
};

/** Returns a safe performance config, falling back to `balanced` for unknown input. */
function getPerformanceConfig(mode: PerformanceMode) {
  return PERFORMANCE_CONFIGS[mode] ?? PERFORMANCE_CONFIGS.balanced;
}


function clamp01(t: number) {
  return Math.max(0, Math.min(1, t));
}

function axialToXY(q: number, s: number, r: number) {
  return {
    x: r * (q + s / 2),
    y: r * (s * (SQRT3 / 2)),
  };
}

function cubeDistance(q: number, s: number) {
  const x = q;
  const z = s;
  const y = -x - z;
  return Math.max(Math.abs(x), Math.abs(y), Math.abs(z));
}

function angleCW(x: number, y: number) {
  const a = Math.atan2(y, x);
  return (2 * Math.PI - ((a + 2 * Math.PI) % (2 * Math.PI))) % (2 * Math.PI);
}

function easeOutCubic(t: number) {
  const x = clamp01(t);
  return 1 - Math.pow(1 - x, 3);
}

function easeInOutQuart(t: number) {
  const x = clamp01(t);
  return x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
}

function lerp(start: number, end: number, factor: number) {
  return start + (end - start) * factor;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(
    normalized.length === 3
      ? normalized
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : normalized,
    16
  );

  if (!Number.isFinite(value)) return { r: 255, g: 255, b: 255 };

  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(from: string, to: string, t: number) {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  const x = clamp01(t);

  return rgbToHex({
    r: lerp(a.r, b.r, x),
    g: lerp(a.g, b.g, x),
    b: lerp(a.b, b.b, x),
  });
}

function mixPalette(from: Palette, to: Palette, t: number): Palette {
  return {
    name: to.name,
    line: mixHex(from.line, to.line, t),
    bright: mixHex(from.bright, to.bright, t),
    glow: mixHex(from.glow, to.glow, t),
    soft: mixHex(from.soft, to.soft, t),
  };
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 999.937) * 43758.5453123;
  return x - Math.floor(x);
}

function blendNumber(base: number, atmospheric: number, strength: number) {
  return lerp(base, atmospheric, clamp01(strength));
}

function hasDayRhythm(mode: DayAtmosphereMode) {
  return mode === "rhythm" || mode === "weather" || mode === "full";
}

function hasDayWeather(mode: DayAtmosphereMode) {
  return mode === "weather" || mode === "full";
}

function hasDayAura(mode: DayAtmosphereMode) {
  return mode === "rhythm" || mode === "aura" || mode === "weather" || mode === "full";
}

function getWeekdayAtmosphereByIndex(index: number) {
  return WEEKDAY_ATMOSPHERES[((index % 7) + 7) % 7] ?? WEEKDAY_ATMOSPHERES[0];
}

function getWeekdayAtmosphere(date: Date, weekdayMode: WeekdayMode, cycleIndex: number) {
  if (weekdayMode === "cycle") {
    return getWeekdayAtmosphereByIndex(cycleIndex);
  }

  return getWeekdayAtmosphereByIndex(date.getDay());
}

/**
 * Builds axial/hex-grid circle centers for the Flower of Life layout.
 *
 * The grid uses cube-distance rings. Ring 0 is the center circle, ring 1 forms
 * the Seed of Life, ring 2 expands the Flower, and ring 3 is used for clipped
 * outer arcs.
 */
export function makeCenters(r: number, maxRing: Ring) {
  if (!(r > 0) || !Number.isFinite(r)) {
    return {
      ring0: [] as Pt[],
      ring1: [] as Pt[],
      ring2: [] as Pt[],
      ring3: [] as Pt[],
      all: [] as Pt[],
    };
  }

  const pts: Pt[] = [];

  for (let q = -maxRing; q <= maxRing; q++) {
    for (let s = -maxRing; s <= maxRing; s++) {
      const d = cubeDistance(q, s);
      if (d <= maxRing) {
        const { x, y } = axialToXY(q, s, r);
        pts.push({ x, y, q, s, ring: d as Ring, id: `q${q}_s${s}` });
      }
    }
  }

  const byRing = (ring: Ring) =>
    pts
      .filter((p) => p.ring === ring)
      .sort((a, b) => angleCW(a.x, a.y) - angleCW(b.x, b.y));

  return {
    ring0: byRing(0),
    ring1: byRing(1),
    ring2: byRing(2),
    ring3: byRing(3),
    all: pts,
  };
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

/**
 * Drives the component clock using a single RAF loop with a minimum update interval.
 *
 * This replaces scattered animation timers with one coarse clock source. When
 * `pauseWhenHidden` is enabled, state updates pause while the page is hidden.
 */
function useNow(tickMs: number, pauseWhenHidden: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let rafId: number | null = null;
    let lastTime = Date.now();
    let mounted = true;

    const tick = () => {
      if (!mounted) return;

      const hidden =
        pauseWhenHidden &&
        typeof document !== "undefined" &&
        document.visibilityState === "hidden";

      const currentTime = Date.now();
      if (!hidden && currentTime - lastTime >= tickMs) {
        setNow(currentTime);
        lastTime = currentTime;
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      mounted = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [tickMs, pauseWhenHidden]);

  return now;
}

/**
 * Smooths active-step progress without scheduling its own animation loop.
 *
 * Important: this hook is render-driven. The previous implementation used an
 * additional RAF/state loop, which doubled render pressure and contributed to
 * memory/GPU spikes. On step changes, it immediately returns the new target to
 * prevent a one-frame full-circle flash.
 */
function useLerpedProgress(targetProgress: number, lerpFactor: number, stepIndex: number) {
  const stateRef = useRef({
    progress: targetProgress,
    stepIndex,
  });

  // Render-driven smoothing only. This deliberately avoids its own RAF/state loop.
  // useNow already drives the component clock; adding another RAF here was the main
  // source of extra renders and memory churn.
  if (stateRef.current.stepIndex !== stepIndex) {
    stateRef.current = {
      progress: targetProgress,
      stepIndex,
    };
    return targetProgress;
  }

  const diff = Math.abs(targetProgress - stateRef.current.progress);
  stateRef.current.progress =
    diff < 0.001 ? targetProgress : lerp(stateRef.current.progress, targetProgress, lerpFactor);

  return stateRef.current.progress;
}

function makeCirclePiece(
  id: string,
  p: Pt,
  r: number,
  options?: Partial<Pick<Piece, "strokeWidth" | "opacity" | "clipped">>
): Piece {
  return {
    kind: "circle",
    id,
    cx: p.x,
    cy: p.y,
    r,
    strokeWidth: options?.strokeWidth ?? 2,
    opacity: options?.opacity ?? 0.9,
    clipped: options?.clipped ?? true,
  };
}

function makeBoundaryPiece(
  id: string,
  radius: number,
  strokeWidth: number,
  opacity: number
): Piece {
  return {
    kind: "circle",
    id,
    cx: 0,
    cy: 0,
    r: radius,
    strokeWidth,
    opacity,
    clipped: false,
  };
}

/**
 * Creates the ordered reveal sequence.
 *
 * The sequence is: center circle, Seed of Life ring, Flower ring grouped into
 * pairs, inner/outer boundaries, clipped outer arcs, then a separate glow phase
 * handled by the component.
 */
function makeRevealSteps(r: number, clipRadius: number, outerBoundary: number) {
  const { ring0, ring1, ring2, ring3 } = makeCenters(r, 3);
  const center = ring0[0];

  const steps: RevealStep[] = [];

  if (center) {
    steps.push({
      id: "circle",
      label: "Circle",
      pieces: [makeCirclePiece("center", center, r, { opacity: 0.94 })],
    });
  }

  for (const [i, p] of ring1.entries()) {
    steps.push({
      id: `seed-${i + 1}`,
      label: "Seed of Life",
      pieces: [makeCirclePiece(`seed-${p.id}`, p, r, { opacity: 0.9 })],
    });
  }

  // Ring 2 is grouped into pairs so the whole cycle stays near 2-5 seconds per step.
  for (const [i, group] of chunk(ring2, 2).entries()) {
    steps.push({
      id: `flower-ring2-${i + 1}`,
      label: "Flower of Life",
      pieces: group.map((p) =>
        makeCirclePiece(`r2-${p.id}`, p, r, { opacity: 0.86 })
      ),
    });
  }

  // Boundary rings draw before the clipped ring3 arcs, matching the base animation.
  steps.push({
    id: "boundary-inner",
    label: "Boundary",
    pieces: [makeBoundaryPiece("boundary-inner", clipRadius, 6, 0.96)],
  });

  steps.push({
    id: "boundary-outer",
    label: "Boundary",
    pieces: [makeBoundaryPiece("boundary-outer", outerBoundary, 3, 0.76)],
  });

  // Ring 3 is grouped into triples; clipped by the boundary, so it appears as outer arcs.
  for (const [i, group] of chunk(ring3, 3).entries()) {
    steps.push({
      id: `outer-arcs-${i + 1}`,
      label: "Outer Arcs",
      pieces: group.map((p) =>
        makeCirclePiece(`r3-${p.id}`, p, r, { opacity: 0.82 })
      ),
    });
  }

  return {
    steps,
    allPieces: steps.flatMap((s) => s.pieces),
  };
}

function circlePointAtProgress(piece: Piece, progress: number) {
  const t = clamp01(progress);
  const angle = Math.PI * 2 * t;

  return {
    x: piece.cx + piece.r * Math.cos(angle),
    y: piece.cy + piece.r * Math.sin(angle),
    angle,
  };
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) + 1;
}

/**
 * Builds comet/spark geometry for the active reveal step.
 *
 * The draw head is calculated from the same progress value used by the SVG stroke
 * dash, so it follows the drawn stroke. Particle and tail counts are supplied by
 * performance settings and are intentionally generated as plain SVG data.
 */
function makeDrawHeads(
  step: RevealStep | undefined,
  progress: number,
  tailCount: number,
  particleCount: number
): DrawHead[] {
  if (!step || !Number.isFinite(progress)) return [];

  const t = clamp01(progress);
  const safeTailCount = Math.max(0, Math.floor(tailCount));
  const safeParticleCount = Math.max(0, Math.floor(particleCount));
  const tailSpacing = 0.016;

  // Rapid lifecycle polish: fade in at stroke start and fade out before the step swaps.
  // This avoids the instant-spawn look without needing exit animations.
  const fadeIn = easeOutCubic(t / 0.07);
  const fadeOut = easeOutCubic((1 - t) / 0.14);
  const opacity = clamp01(Math.min(fadeIn, fadeOut));

  return step.pieces.map((piece) => {
    const { x, y } = circlePointAtProgress(piece, t);
    const seed = hashString(piece.id);
    const tail: DrawHeadTrailPoint[] = [];
    const particles: DrawHeadParticle[] = [];

    for (let i = 1; i <= safeTailCount; i++) {
      const tailProgress = t - i * tailSpacing;
      if (tailProgress <= 0) continue;

      const point = circlePointAtProgress(piece, tailProgress);
      const falloff = 1 - i / (safeTailCount + 1);
      tail.push({
        id: `tail-${piece.id}-${i}`,
        x: point.x,
        y: point.y,
        opacity: (0.06 + falloff * 0.38) * opacity,
        scale: 0.28 + falloff * 0.92,
      });
    }

    for (let i = 0; i < safeParticleCount; i++) {
      const age = (i + 1) / (safeParticleCount + 1);
      const offset = 0.012 + age * 0.12;
      const particleProgress = t - offset;
      if (particleProgress <= 0 || opacity <= 0.001) continue;

      const base = circlePointAtProgress(piece, particleProgress);
      const tangentX = -Math.sin(base.angle);
      const tangentY = Math.cos(base.angle);
      const normalX = Math.cos(base.angle);
      const normalY = Math.sin(base.angle);
      const jitterA = seededRandom(seed + i * 19 + 3) - 0.5;
      const jitterB = seededRandom(seed + i * 23 + 11) - 0.5;
      const spread = 1.2 + age * 8.5;
      const falloff = Math.pow(1 - age, 1.55);

      particles.push({
        id: `particle-${piece.id}-${i}`,
        x: base.x + normalX * jitterA * spread + tangentX * jitterB * spread * 0.5,
        y: base.y + normalY * jitterA * spread + tangentY * jitterB * spread * 0.5,
        r: 0.35 + seededRandom(seed + i * 29 + 17) * (1.35 - age * 0.55),
        opacity: clamp01((0.08 + falloff * 0.46) * opacity),
        delay: seededRandom(seed + i * 31 + 7) * 0.5,
      });
    }

    return {
      id: `head-${piece.id}`,
      x,
      y,
      clipped: piece.clipped,
      opacity,
      tail,
      particles,
    };
  });
}

function circleIntersections(a: Piece, b: Piece) {
  const dx = b.cx - a.cx;
  const dy = b.cy - a.cy;
  const d = Math.hypot(dx, dy);

  if (d < 0.0001 || d > a.r + b.r + 0.0001 || d < Math.abs(a.r - b.r) - 0.0001) {
    return [] as { x: number; y: number }[];
  }

  const along = (a.r * a.r - b.r * b.r + d * d) / (2 * d);
  const heightSq = a.r * a.r - along * along;
  if (heightSq < -0.0001) return [];

  const height = Math.sqrt(Math.max(0, heightSq));
  const midX = a.cx + (along * dx) / d;
  const midY = a.cy + (along * dy) / d;
  const rx = (-dy * height) / d;
  const ry = (dx * height) / d;

  if (height < 0.0001) return [{ x: midX, y: midY }];

  return [
    { x: midX + rx, y: midY + ry },
    { x: midX - rx, y: midY - ry },
  ];
}

/**
 * Finds unique circle intersections inside the clipped Flower boundary.
 *
 * Nodes are deduped by rounded coordinates and later filtered so they only appear
 * after both contributing circles are visible.
 */
function makeIntersectionNodes(pieces: Piece[], clipRadius: number): IntersectionNode[] {
  const clippedCircles = pieces.filter((piece) => piece.clipped);
  const nodes: IntersectionNode[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < clippedCircles.length; i++) {
    for (let j = i + 1; j < clippedCircles.length; j++) {
      const a = clippedCircles[i];
      const b = clippedCircles[j];
      const points = circleIntersections(a, b);

      for (const point of points) {
        if (Math.hypot(point.x, point.y) > clipRadius + 0.75) continue;

        const key = `${Math.round(point.x * 10) / 10}_${Math.round(point.y * 10) / 10}`;
        if (seen.has(key)) continue;
        seen.add(key);

        nodes.push({
          id: `node-${key}`,
          x: point.x,
          y: point.y,
          pieceIds: [a.id, b.id],
        });
      }
    }
  }

  return nodes.sort((a, b) => angleCW(a.x, a.y) - angleCW(b.x, b.y));
}

/**
 * Generates a deterministic starfield for the current viewport size.
 *
 * The result is stable for a given count/size, avoiding random layout changes on
 * every render. Only a capped subset becomes animated depending on performance.
 */
function makeStarfield(count: number, half: number): Star[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = seededRandom(i + 1) * Math.PI * 2;
    const radius = Math.sqrt(seededRandom(i + 101)) * half * 1.04;

    return {
      id: `star-${i}`,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      r: 0.45 + seededRandom(i + 201) * 1.25,
      opacity: 0.12 + seededRandom(i + 301) * 0.42,
      delay: seededRandom(i + 401) * 4,
      duration: 3.5 + seededRandom(i + 501) * 5.5,
      drift: 1.5 + seededRandom(i + 601) * 4.5,
    };
  });
}

/**
 * Selects previous/current/next palettes and timing metadata for crossfading.
 */
function getPaletteSelection(
  now: number,
  paletteMode: PaletteMode,
  cycleIndex: number,
  cycleElapsed: number,
  cycleDuration: number
) {
  const date = new Date(now);

  if (paletteMode === "hour") {
    const hour = date.getHours();
    const elapsed =
      date.getMinutes() * MINUTE_MS + date.getSeconds() * 1000 + date.getMilliseconds();

    return {
      previous: palettes[(hour - 1 + palettes.length) % palettes.length],
      current: palettes[hour % palettes.length],
      next: palettes[(hour + 1) % palettes.length],
      phaseElapsed: elapsed,
      phaseDuration: HOUR_MS,
      paletteCycleIndex: hour,
    };
  }

  if (paletteMode === "dayPhase") {
    const hourFloat =
      date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
    let phaseIndex = 0;

    for (let i = 0; i < DAY_PHASES.length; i++) {
      if (hourFloat >= DAY_PHASES[i].startHour) phaseIndex = i;
    }

    const phase = DAY_PHASES[phaseIndex];
    const previousPhase = DAY_PHASES[(phaseIndex - 1 + DAY_PHASES.length) % DAY_PHASES.length];
    const nextPhase = DAY_PHASES[(phaseIndex + 1) % DAY_PHASES.length];

    const phaseStart = new Date(date);
    phaseStart.setHours(phase.startHour, 0, 0, 0);
    if (hourFloat < phase.startHour) phaseStart.setDate(phaseStart.getDate() - 1);

    const nextStart = new Date(date);
    nextStart.setHours(nextPhase.startHour, 0, 0, 0);
    if (nextPhase.startHour <= phase.startHour) {
      nextStart.setDate(nextStart.getDate() + 1);
    }

    return {
      previous: palettes[previousPhase.paletteIndex],
      current: palettes[phase.paletteIndex],
      next: palettes[nextPhase.paletteIndex],
      phaseElapsed: Math.max(0, now - phaseStart.getTime()),
      phaseDuration: Math.max(1, nextStart.getTime() - phaseStart.getTime()),
      paletteCycleIndex: phaseIndex,
    };
  }

  return {
    previous: palettes[(cycleIndex - 1 + palettes.length) % palettes.length],
    current: palettes[cycleIndex % palettes.length],
    next: palettes[(cycleIndex + 1) % palettes.length],
    phaseElapsed: cycleElapsed,
    phaseDuration: cycleDuration,
    paletteCycleIndex: cycleIndex,
  };
}

/**
 * Blends palette colors near phase boundaries to avoid abrupt color jumps.
 */
function blendPaletteSelection(
  selection: ReturnType<typeof getPaletteSelection>,
  paletteTransitionMs: number
) {
  const transitionMs = Math.max(
    0,
    Math.min(paletteTransitionMs, selection.phaseDuration / 2)
  );

  if (transitionMs <= 0) return selection.current;

  if (selection.phaseElapsed < transitionMs) {
    return mixPalette(
      selection.previous,
      selection.current,
      easeOutCubic(selection.phaseElapsed / transitionMs)
    );
  }

  const remaining = selection.phaseDuration - selection.phaseElapsed;
  if (remaining < transitionMs) {
    return mixPalette(
      selection.current,
      selection.next,
      easeOutCubic(1 - remaining / transitionMs)
    );
  }

  return selection.current;
}

/**
 * Memoized SVG circle stroke renderer.
 *
 * Uses `pathLength=1` so progress maps cleanly to `strokeDashoffset` in the range
 * `1..0`. This keeps all reveal geometry declarative and inexpensive.
 */
const ClockPiece = memo(function ClockPiece({
  piece,
  progress,
  color,
}: {
  piece: Piece;
  progress: number;
  color: string;
}) {
  if (piece.kind !== "circle") return null;

  const strokeDashoffset = useMemo(
    () => 1 - clamp01(progress),
    [progress]
  );

  return (
    <circle
      cx={piece.cx}
      cy={piece.cy}
      r={piece.r}
      fill="none"
      stroke={color}
      strokeWidth={piece.strokeWidth}
      opacity={piece.opacity}
      pathLength={1}
      strokeDasharray={1}
      strokeDashoffset={strokeDashoffset}
      strokeLinecap="round"
    />
  );
});

/**
 * Renders an optimized Flower of Life clock.
 *
 * The component is designed as an ambient timepiece rather than a conventional UI
 * clock. It can run as a real minute-aligned clock or as an arbitrary repeating
 * animation cycle. Visual intensity is controlled mostly through performance and
 * layer props, so the same component can be used for high-polish hero visuals or
 * low-cost always-on displays.
 *
 * Rendering order
 * ---------------
 * 1. Optional weekday sky tint.
 * 2. Star/dust field, with capped animation count.
 * 3. Central aura, optionally breathing by weekday.
 * 4. Optional outer minute ticks.
 * 5. Flower of Life reveal geometry.
 * 6. Intersection nodes after contributing circles complete.
 * 7. Optional comet draw head on the active stroke.
 * 8. Final completion glow phase.
 * 9. Optional status text below the SVG.
 *
 * Performance guidance
 * --------------------
 * - Start with `performanceMode="balanced"`.
 * - Use `lite` if memory/GPU still climbs during long sessions.
 * - Only use `quality`/`showHeavyGlowEffects` when the animation is foregrounded
 *   and the visual payoff is worth the extra cost.
 * - Prefer lowering `animatedStarLimit`, `animatedIntersectionNodeLimit`, and
 *   `drawHeadParticleCount` before disabling core geometry features.
 *
 * @param props See {@link FlowerClockProps} for all options.
 */
export default function FlowerOfLifeClock({
  cycleMs = 60_000,
  tickMs,
  r = 60,
  rotateDeg = 30,
  clipMul = 3,
  boundaryOffset = 10,
  className,
  showStatus = true,
  lerpFactor = 0.18,
  mode = "wall-clock",
  paletteMode = "dayPhase",
  paletteTransitionMs = 1_500,
  showDrawHead = true,
  drawHeadRadius = 3,
  showMinuteTicks = false,
  showIntersectionNodes = true,
  showStarfield = true,
  starCount,
  showDayAtmosphere = true,
  dayAtmosphereMode = "rhythm",
  dayAtmosphereStrength = 1,
  weekdayMode = "real",
  showWeekdayInStatus = false,
  performanceMode = "balanced",
  animatedStarLimit,
  animatedIntersectionNodeLimit,
  drawHeadParticleCount,
  drawHeadTailCount,
  showHeavyGlowEffects,
  pauseWhenHidden = true,
  onStepChange,
  onCircleComplete,
  onGlowStart,
  onCycleComplete,
}: FlowerClockProps) {
  const performanceConfig = getPerformanceConfig(performanceMode);
  const safeTickMs = Math.max(16, tickMs ?? performanceConfig.defaultTickMs);
  const now = useNow(safeTickMs, pauseWhenHidden);

  const effectiveStarCount = Math.max(0, Math.min(140, starCount ?? performanceConfig.defaultStarCount));
  const effectiveAnimatedStarLimit = Math.max(
    0,
    Math.min(effectiveStarCount, animatedStarLimit ?? performanceConfig.animatedStarLimit)
  );
  const effectiveAnimatedIntersectionNodeLimit = Math.max(
    0,
    animatedIntersectionNodeLimit ?? performanceConfig.animatedIntersectionNodeLimit
  );
  const effectiveDrawHeadParticleCount = Math.max(
    0,
    drawHeadParticleCount ?? performanceConfig.drawHeadParticleCount
  );
  const effectiveDrawHeadTailCount = Math.max(
    0,
    drawHeadTailCount ?? performanceConfig.drawHeadTailCount
  );
  const heavyGlowEffectsEnabled = showHeavyGlowEffects ?? performanceConfig.heavyGlowEffects;

  const safeCycleMs = Math.max(1_000, cycleMs);
  const effectiveCycleMs = mode === "wall-clock" ? MINUTE_MS : safeCycleMs;

  const date = useMemo(() => new Date(now), [now]);
  const dayStrength = showDayAtmosphere ? clamp01(dayAtmosphereStrength) : 0;
  const dayRhythmEnabled = dayStrength > 0 && hasDayRhythm(dayAtmosphereMode);
  const dayWeatherEnabled = dayStrength > 0 && hasDayWeather(dayAtmosphereMode);
  const dayAuraEnabled = dayStrength > 0 && hasDayAura(dayAtmosphereMode);
  const clipRadius = clipMul * r;
  const outerBoundary = clipRadius + boundaryOffset;
  const tickRadius = outerBoundary + 16;
  const pad = showMinuteTicks ? 64 : 44;
  const half = outerBoundary + pad;

  const { steps, allPieces } = useMemo(
    () => makeRevealSteps(r, clipRadius, outerBoundary),
    [r, clipRadius, outerBoundary]
  );

  // Geometry steps + one final glow step.
  const totalSteps = Math.max(1, steps.length + 1);
  const stepMs = effectiveCycleMs / totalSteps;

  const wallClockElapsed =
    date.getSeconds() * 1000 + date.getMilliseconds();
  const cycleIndex =
    mode === "wall-clock" ? Math.floor(now / MINUTE_MS) : Math.floor(now / effectiveCycleMs);
  const weekdayAtmosphere = useMemo(
    () => getWeekdayAtmosphere(date, weekdayMode, cycleIndex),
    [date, weekdayMode, cycleIndex]
  );
  const cycleElapsed = mode === "wall-clock" ? wallClockElapsed : now % effectiveCycleMs;
  const cycleProgress = cycleElapsed / effectiveCycleMs;
  const stepFloat = cycleElapsed / stepMs;
  const activeStepIndex = Math.min(totalSteps - 1, Math.floor(stepFloat));
  const rawStepProgress = easeInOutQuart(stepFloat - activeStepIndex);
  const isGlowStep = activeStepIndex >= steps.length;

  // Apply lerp smoothing for butter-smooth animations (resets on step change).
  const activeStepProgress = useLerpedProgress(
    rawStepProgress,
    lerpFactor,
    activeStepIndex
  );

  const paletteSelection = useMemo(
    () => getPaletteSelection(now, paletteMode, cycleIndex, cycleElapsed, effectiveCycleMs),
    [now, paletteMode, cycleIndex, cycleElapsed, effectiveCycleMs]
  );

  const palette = useMemo(
    () => blendPaletteSelection(paletteSelection, paletteTransitionMs),
    [paletteSelection, paletteTransitionMs]
  );

  const activeLabel = useMemo(
    () => (isGlowStep ? "Glow" : steps[activeStepIndex]?.label ?? "Drawing"),
    [isGlowStep, steps, activeStepIndex]
  );

  useEffect(() => {
    onStepChange?.({
      stepIndex: activeStepIndex + 1,
      totalSteps,
      label: activeLabel,
      paletteName: palette.name,
      cycleIndex,
    });
  }, [activeStepIndex, totalSteps, activeLabel, palette.name, cycleIndex, onStepChange]);

  const previousStepIndexRef = useRef(activeStepIndex);
  const previousGlowRef = useRef(isGlowStep);
  const previousCycleIndexRef = useRef(cycleIndex);

  useEffect(() => {
    const previousStepIndex = previousStepIndexRef.current;

    if (previousStepIndex !== activeStepIndex) {
      if (activeStepIndex > previousStepIndex && previousStepIndex < steps.length) {
        const completedStep = steps[previousStepIndex];
        for (const piece of completedStep.pieces) {
          onCircleComplete?.({
            pieceId: piece.id,
            stepIndex: previousStepIndex + 1,
            label: completedStep.label,
            paletteName: palette.name,
            cycleIndex,
          });
        }
      }

      if (!previousGlowRef.current && isGlowStep) {
        onGlowStart?.({
          stepIndex: activeStepIndex + 1,
          totalSteps,
          paletteName: palette.name,
          cycleIndex,
        });
      }

      previousStepIndexRef.current = activeStepIndex;
      previousGlowRef.current = isGlowStep;
    }
  }, [activeStepIndex, isGlowStep, steps, onCircleComplete, onGlowStart, palette.name, cycleIndex, totalSteps]);

  useEffect(() => {
    const previousCycleIndex = previousCycleIndexRef.current;
    if (previousCycleIndex !== cycleIndex) {
      onCycleComplete?.({
        completedCycleIndex: previousCycleIndex,
        nextCycleIndex: cycleIndex,
        paletteName: palette.name,
      });
      previousCycleIndexRef.current = cycleIndex;
    }
  }, [cycleIndex, onCycleComplete, palette.name]);

  const visiblePieceIds = useMemo(() => {
    const ids = new Set<string>();

    steps.forEach((step, stepIndex) => {
      const completed = stepIndex < activeStepIndex || isGlowStep;
      const nearlyCompleteActive = stepIndex === activeStepIndex && activeStepProgress > 0.96;

      if (completed || nearlyCompleteActive) {
        for (const piece of step.pieces) ids.add(piece.id);
      }
    });

    return ids;
  }, [steps, activeStepIndex, isGlowStep, activeStepProgress]);

  const intersectionNodes = useMemo(
    () => makeIntersectionNodes(allPieces, clipRadius),
    [allPieces, clipRadius]
  );

  const visibleIntersectionNodes = useMemo(
    () =>
      intersectionNodes.filter(
        (node) => visiblePieceIds.has(node.pieceIds[0]) && visiblePieceIds.has(node.pieceIds[1])
      ),
    [intersectionNodes, visiblePieceIds]
  );

  const drawHeads = useMemo(
    () =>
      makeDrawHeads(
        steps[activeStepIndex],
        activeStepProgress,
        effectiveDrawHeadTailCount,
        effectiveDrawHeadParticleCount
      ),
    [
      steps,
      activeStepIndex,
      activeStepProgress,
      effectiveDrawHeadTailCount,
      effectiveDrawHeadParticleCount,
    ]
  );

  const stars = useMemo(
    () => makeStarfield(effectiveStarCount, half),
    [effectiveStarCount, half]
  );

  // Memoize geometry groups to prevent unnecessary re-renders.
  const geometryGroups = useMemo(
    () =>
      steps.map((step, stepIndex) => {
        if (stepIndex > activeStepIndex) return null;

        const progress =
          stepIndex < activeStepIndex || isGlowStep ? 1 : activeStepProgress;

        const clippedPieces = step.pieces.filter((p) => p.clipped);
        const unclippedPieces = step.pieces.filter((p) => !p.clipped);

        return (
          <g key={step.id}>
            {clippedPieces.length > 0 ? (
              <g clipPath="url(#flowerClockClip)">
                {clippedPieces.map((piece) => (
                  <ClockPiece
                    key={piece.id}
                    piece={piece}
                    progress={progress}
                    color={palette.line}
                  />
                ))}
              </g>
            ) : null}

            {unclippedPieces.map((piece) => (
              <ClockPiece
                key={piece.id}
                piece={piece}
                progress={progress}
                color={palette.line}
              />
            ))}
          </g>
        );
      }),
    [steps, activeStepIndex, isGlowStep, activeStepProgress, palette.line]
  );

  const glowProgress = useMemo(
    () => (isGlowStep ? activeStepProgress : 0),
    [isGlowStep, activeStepProgress]
  );

  const glowOpacity = useMemo(
    () => (isGlowStep ? 0.2 + glowProgress * 0.7 : 0),
    [isGlowStep, glowProgress]
  );

  const baseAuraOpacity = 0.35 + glowOpacity * 0.65;
  const dayTintOpacity = dayStrength * weekdayAtmosphere.tintOpacity;
  const dayAuraOpacityBoost = dayAuraEnabled
    ? dayStrength * weekdayAtmosphere.auraOpacityBoost
    : 0;
  const dayAuraScale = dayAuraEnabled
    ? blendNumber(1, weekdayAtmosphere.auraScale, dayStrength)
    : 1;

  // Memoize clipped and unclipped pieces for glow effect.
  const { clippedGlowPieces, unclippedGlowPieces } = useMemo(
    () => ({
      clippedGlowPieces: allPieces.filter((p) => p.clipped),
      unclippedGlowPieces: allPieces.filter((p) => !p.clipped),
    }),
    [allPieces]
  );

  const elapsedTickCount = Math.floor(cycleProgress * 60);
  const timeLabel = useMemo(
    () =>
      date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [date]
  );

  return (
    <div className={className ?? "clock-root"}>
      <div className="clock-stage">
        <svg
          viewBox={`${-half} ${-half} ${half * 2} ${half * 2}`}
          className="clock-svg"
        >
        <defs>
          <clipPath id="flowerClockClip">
            <circle cx={0} cy={0} r={clipRadius} />
          </clipPath>

          <radialGradient id="flowerClockAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={palette.glow} stopOpacity="0.22" />
            <stop offset="70%" stopColor={palette.glow} stopOpacity="0.05" />
            <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
          </radialGradient>

          {/* Enhanced multi-layer glow filters */}
          <filter id="flowerClockGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="flowerClockGlowIntense" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="8" result="blurIntense" />
            <feColorMatrix
              in="blurIntense"
              type="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1.5 0"
              result="boosted"
            />
            <feMerge>
              <feMergeNode in="boosted" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="flowerClockGlowSoft" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="15" result="blurSoft" />
            <feMerge>
              <feMergeNode in="blurSoft" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="flowerClockShimmer" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2" result="blurShimmer" />
            <feColorMatrix
              in="blurShimmer"
              type="matrix"
              values="1.3 0 0 0 0  0 1.3 0 0 0  0 0 1.3 0 0  0 0 0 1 0"
              result="brightened"
            />
            <feMerge>
              <feMergeNode in="brightened" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <filter id="flowerClockDropShadow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow
              dx="0"
              dy="0"
              stdDeviation="4"
              floodColor={palette.glow}
              floodOpacity="0.6"
            />
          </filter>

          {/* Spark uses layered vectors instead of a blur filter to avoid visible filter boxes. */}

          {/* Phoenix gradient for upward sweep */}
          <linearGradient id="flowerClockPhoenix" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor={palette.glow} stopOpacity="0" />
            <stop offset="50%" stopColor={palette.bright} stopOpacity="0.4" />
            <stop offset="100%" stopColor={palette.bright} stopOpacity="0" />
          </linearGradient>

          {/* Shimmer ray gradient */}
          <linearGradient id="flowerClockRay" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={palette.glow} stopOpacity="0" />
            <stop offset="50%" stopColor={palette.glow} stopOpacity="0.3" />
            <stop offset="100%" stopColor={palette.glow} stopOpacity="0" />
          </linearGradient>
        </defs>

        {dayTintOpacity > 0 ? (
          <motion.rect
            x={-half}
            y={-half}
            width={half * 2}
            height={half * 2}
            fill={weekdayAtmosphere.tint}
            opacity={dayTintOpacity}
            animate={
              dayAuraEnabled
                ? { opacity: [dayTintOpacity * 0.65, dayTintOpacity, dayTintOpacity * 0.72] }
                : undefined
            }
            transition={
              dayAuraEnabled
                ? {
                    duration: weekdayAtmosphere.auraDuration,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
                : undefined
            }
            style={{ pointerEvents: "none" }}
          />
        ) : null}

        {showStarfield ? (
          <g opacity={0.9}>
            {stars.map((star, index) => {
              const duration = dayRhythmEnabled
                ? star.duration * blendNumber(1, weekdayAtmosphere.starDurationMul, dayStrength)
                : star.duration;
              const highOpacity = dayRhythmEnabled
                ? Math.min(0.82, star.opacity * blendNumber(1, weekdayAtmosphere.starOpacityHigh, dayStrength))
                : star.opacity;
              const lowOpacity = dayRhythmEnabled
                ? star.opacity * blendNumber(0.35, weekdayAtmosphere.starOpacityLow, dayStrength)
                : star.opacity * 0.35;
              const peakScale = dayRhythmEnabled
                ? blendNumber(1.25, weekdayAtmosphere.starScalePeak, dayStrength)
                : 1.25;
              const driftMul = dayWeatherEnabled
                ? blendNumber(1, weekdayAtmosphere.starDriftMul, dayStrength)
                : 1;
              const driftAngle = dayWeatherEnabled ? weekdayAtmosphere.starDriftAngle : -Math.PI / 2;
              const driftX = Math.cos(driftAngle) * star.drift * driftMul;
              const driftY = Math.sin(driftAngle) * star.drift * driftMul;
              const delay = dayRhythmEnabled
                ? star.delay * blendNumber(1, weekdayAtmosphere.starStaggerMul, dayStrength) +
                  (index % 7) * 0.035 * dayStrength
                : star.delay;

              const starFill = dayRhythmEnabled
                ? mixHex(palette.soft, weekdayAtmosphere.tint, dayStrength * 0.28)
                : palette.soft;

              if (index >= effectiveAnimatedStarLimit) {
                return (
                  <circle
                    key={star.id}
                    cx={star.x}
                    cy={star.y}
                    r={star.r}
                    fill={starFill}
                    opacity={(lowOpacity + highOpacity) * 0.32}
                  />
                );
              }

              return (
                <motion.circle
                  key={star.id}
                  cx={star.x}
                  cy={star.y}
                  r={star.r}
                  fill={starFill}
                  opacity={star.opacity}
                  animate={{
                    opacity: [lowOpacity, highOpacity, lowOpacity],
                    scale: [0.8, peakScale, 0.84],
                    x: [0, driftX, 0],
                    y: [0, driftY, 0],
                  }}
                  transition={{
                    duration,
                    delay,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  style={{ transformOrigin: `${star.x}px ${star.y}px` }}
                />
              );
            })}
          </g>
        ) : null}

        {/* Background aura grows subtly during the final glow step and breathes by weekday. */}
        <motion.circle
          cx={0}
          cy={0}
          r={outerBoundary + 24}
          fill="url(#flowerClockAura)"
          opacity={baseAuraOpacity + dayAuraOpacityBoost * 0.5}
          animate={
            dayAuraEnabled
              ? {
                  opacity: [
                    baseAuraOpacity,
                    Math.min(1, baseAuraOpacity + dayAuraOpacityBoost),
                    baseAuraOpacity + dayAuraOpacityBoost * 0.38,
                  ],
                  scale: [1, dayAuraScale, 1],
                }
              : undefined
          }
          transition={
            dayAuraEnabled
              ? {
                  duration: weekdayAtmosphere.auraDuration,
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              : undefined
          }
          style={{ transformOrigin: "0px 0px" }}
        />

        {showMinuteTicks ? (
          <g>
            {Array.from({ length: 60 }, (_, i) => {
              const angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
              const isMajor = i % 5 === 0;
              const lit = i <= elapsedTickCount;
              const inner = tickRadius - (isMajor ? 12 : 7);
              const outer = tickRadius;

              return (
                <line
                  key={`minute-tick-${i}`}
                  x1={Math.cos(angle) * inner}
                  y1={Math.sin(angle) * inner}
                  x2={Math.cos(angle) * outer}
                  y2={Math.sin(angle) * outer}
                  stroke={lit ? palette.bright : palette.soft}
                  strokeWidth={isMajor ? 2.4 : 1.2}
                  strokeLinecap="round"
                  opacity={lit ? 0.82 : 0.22}
                />
              );
            })}
          </g>
        ) : null}

        <g transform={`rotate(${rotateDeg})`}>
          {geometryGroups}

          {showIntersectionNodes && visibleIntersectionNodes.length > 0 ? (
            <g clipPath="url(#flowerClockClip)">
              {visibleIntersectionNodes.map((node, index) => {
                const delay = (index % 13) * 0.055;

                if (index >= effectiveAnimatedIntersectionNodeLimit) {
                  return (
                    <g key={node.id} opacity={0.72}>
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={2.15}
                        fill="none"
                        stroke={palette.glow}
                        strokeWidth={0.7}
                        opacity={0.58}
                      />
                      <circle
                        cx={node.x}
                        cy={node.y}
                        r={1.05}
                        fill={palette.bright}
                        opacity={0.82}
                      />
                    </g>
                  );
                }

                return (
                  <motion.g
                    key={node.id}
                    initial={{ opacity: 0, scale: 0.42 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.42, ease: "easeOut" }}
                    style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                  >
                    <motion.circle
                      cx={node.x}
                      cy={node.y}
                      r={5.4}
                      fill={palette.glow}
                      opacity={0.08}
                      animate={{ opacity: [0.05, 0.18, 0.06], scale: [0.82, 1.24, 0.9] }}
                      transition={{ duration: 2.6, delay, repeat: Infinity, ease: "easeInOut" }}
                      style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                    />
                    <motion.circle
                      cx={node.x}
                      cy={node.y}
                      r={4.2}
                      fill="none"
                      stroke={palette.soft}
                      strokeWidth={0.55}
                      opacity={0}
                      animate={{ opacity: [0, 0.32, 0], scale: [0.55, 1.45, 1.9] }}
                      transition={{ duration: 1.4, delay: delay * 0.5, ease: "easeOut" }}
                      style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                    />
                    <motion.circle
                      cx={node.x}
                      cy={node.y}
                      r={2.75}
                      fill="none"
                      stroke={palette.glow}
                      strokeWidth={0.8}
                      opacity={0.78}
                      animate={{ opacity: [0.52, 0.9, 0.58] }}
                      transition={{ duration: 2.1, delay, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.g
                      animate={{ rotate: [0, 180, 360], opacity: [0.25, 0.62, 0.25] }}
                      transition={{ duration: 4.8, delay, repeat: Infinity, ease: "linear" }}
                      style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                    >
                      <line
                        x1={node.x - 3.7}
                        y1={node.y}
                        x2={node.x + 3.7}
                        y2={node.y}
                        stroke={palette.soft}
                        strokeWidth={0.42}
                        strokeLinecap="round"
                      />
                      <line
                        x1={node.x}
                        y1={node.y - 3.7}
                        x2={node.x}
                        y2={node.y + 3.7}
                        stroke={palette.soft}
                        strokeWidth={0.42}
                        strokeLinecap="round"
                      />
                    </motion.g>
                    <motion.circle
                      cx={node.x}
                      cy={node.y}
                      r={1.28}
                      fill={palette.bright}
                      opacity={0.94}
                      animate={{ scale: [0.86, 1.16, 0.92], opacity: [0.78, 1, 0.84] }}
                      transition={{ duration: 1.8, delay, repeat: Infinity, ease: "easeInOut" }}
                      style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                    />
                    <circle
                      cx={node.x - 0.34}
                      cy={node.y - 0.34}
                      r={0.42}
                      fill="#ffffff"
                      opacity={0.92}
                    />
                  </motion.g>
                );
              })}
            </g>
          ) : null}

          {showDrawHead && !isGlowStep && drawHeads.length > 0 ? (
            <>
              <g clipPath="url(#flowerClockClip)">
                {drawHeads
                  .filter((head) => head.clipped)
                  .map((head) => (
                    <motion.g
                      key={head.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: head.opacity }}
                      transition={{ duration: 0.16, ease: "easeOut" }}
                    >
                      {head.particles.map((particle) => (
                        <circle
                          key={particle.id}
                          cx={particle.x}
                          cy={particle.y}
                          r={particle.r}
                          fill={palette.soft}
                          opacity={particle.opacity}
                        />
                      ))}
                      {head.tail.map((point) => (
                        <circle
                          key={point.id}
                          cx={point.x}
                          cy={point.y}
                          r={drawHeadRadius * point.scale}
                          fill={palette.glow}
                          opacity={point.opacity * head.opacity}
                        />
                      ))}
                      <motion.circle
                        cx={head.x}
                        cy={head.y}
                        r={drawHeadRadius * 2.8}
                        fill={palette.glow}
                        opacity={0.18 * head.opacity}
                        animate={{ scale: [0.88, 1.14, 0.96] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                        style={{ transformOrigin: `${head.x}px ${head.y}px` }}
                      />
                      <motion.circle
                        cx={head.x}
                        cy={head.y}
                        r={drawHeadRadius * 1.55}
                        fill={palette.soft}
                        opacity={0.34 * head.opacity}
                        animate={{ scale: [0.92, 1.2, 0.98] }}
                        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                        style={{ transformOrigin: `${head.x}px ${head.y}px` }}
                      />
                      <circle
                        cx={head.x}
                        cy={head.y}
                        r={drawHeadRadius}
                        fill={palette.bright}
                        opacity={0.94 * head.opacity}
                      />
                      <circle
                        cx={head.x - drawHeadRadius * 0.22}
                        cy={head.y - drawHeadRadius * 0.22}
                        r={drawHeadRadius * 0.34}
                        fill="#ffffff"
                        opacity={0.96 * head.opacity}
                      />
                    </motion.g>
                  ))}
              </g>

              {drawHeads
                .filter((head) => !head.clipped)
                .map((head) => (
                  <motion.g
                    key={head.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: head.opacity }}
                    transition={{ duration: 0.16, ease: "easeOut" }}
                  >
                    {head.particles.map((particle) => (
                      <circle
                        key={particle.id}
                        cx={particle.x}
                        cy={particle.y}
                        r={particle.r}
                        fill={palette.soft}
                        opacity={particle.opacity}
                      />
                    ))}
                    {head.tail.map((point) => (
                      <circle
                        key={point.id}
                        cx={point.x}
                        cy={point.y}
                        r={drawHeadRadius * point.scale}
                        fill={palette.glow}
                        opacity={point.opacity * head.opacity}
                      />
                    ))}
                    <motion.circle
                      cx={head.x}
                      cy={head.y}
                      r={drawHeadRadius * 2.8}
                      fill={palette.glow}
                      opacity={0.18 * head.opacity}
                      animate={{ scale: [0.88, 1.14, 0.96] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                      style={{ transformOrigin: `${head.x}px ${head.y}px` }}
                    />
                    <motion.circle
                      cx={head.x}
                      cy={head.y}
                      r={drawHeadRadius * 1.55}
                      fill={palette.soft}
                      opacity={0.34 * head.opacity}
                      animate={{ scale: [0.92, 1.2, 0.98] }}
                      transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
                      style={{ transformOrigin: `${head.x}px ${head.y}px` }}
                    />
                    <circle
                      cx={head.x}
                      cy={head.y}
                      r={drawHeadRadius}
                      fill={palette.bright}
                      opacity={0.94 * head.opacity}
                    />
                    <circle
                      cx={head.x - drawHeadRadius * 0.22}
                      cy={head.y - drawHeadRadius * 0.22}
                      r={drawHeadRadius * 0.34}
                      fill="#ffffff"
                      opacity={0.96 * head.opacity}
                    />
                  </motion.g>
                ))}
            </>
          ) : null}

          {/* Sacred Phoenix Pulse - Enhanced completion effect */}
          {isGlowStep ? (
            <>
              {/* Shimmer Rays - Rotating beams */}
              {heavyGlowEffectsEnabled ? (
                <motion.g
                  opacity={glowProgress * 0.6}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                  style={{ transformOrigin: "0px 0px" }}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <line
                      key={`ray-${i}`}
                      x1={0}
                      y1={0}
                      x2={outerBoundary * 0.8 * Math.cos((i * Math.PI) / 4)}
                      y2={outerBoundary * 0.8 * Math.sin((i * Math.PI) / 4)}
                      stroke="url(#flowerClockRay)"
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                  ))}
                </motion.g>
              ) : null}

              {/* Radial Shockwave - Expanding ring pulse */}
              {heavyGlowEffectsEnabled && glowProgress > 0.4 && (
                <motion.circle
                  cx={0}
                  cy={0}
                  r={clipRadius}
                  fill="none"
                  stroke={palette.glow}
                  strokeWidth={4}
                  initial={{ r: clipRadius * 0.5, opacity: 0.8 }}
                  animate={{ r: clipRadius * 1.5, opacity: 0 }}
                  transition={{
                    duration: 0.8,
                    ease: "easeOut",
                  }}
                />
              )}

              {/* Soft outer glow layer */}
              {heavyGlowEffectsEnabled ? (
                <motion.g
                  filter="url(#flowerClockGlowSoft)"
                  opacity={glowProgress * 0.4}
                >
                  <g clipPath="url(#flowerClockClip)">
                    {clippedGlowPieces.map((piece) => (
                      <ClockPiece
                        key={`soft-${piece.id}`}
                        piece={{
                          ...piece,
                          strokeWidth: Math.max(piece.strokeWidth + 2, 5),
                          opacity: 0.3,
                        }}
                        progress={1}
                        color={palette.glow}
                      />
                    ))}
                  </g>
                </motion.g>
              ) : null}

              {/* Main glow with Sacred Pulse (double heartbeat) + Phoenix Rising */}
              <motion.g
                filter="url(#flowerClockGlowIntense)"
                initial={{ opacity: 0, scale: 1 }}
                animate={{
                  // Sacred Pulse: double heartbeat pattern.
                  opacity: [0, glowOpacity * 0.4, glowOpacity * 0.6, glowOpacity * 0.85, glowOpacity],
                  scale: [1, 1.04, 1.01, 1.06, 1.02],
                }}
                transition={{
                  duration: Math.max(1.2, stepMs / 1000),
                  ease: [0.43, 0.13, 0.23, 0.96],
                  times: [0, 0.15, 0.3, 0.45, 1],
                }}
                style={{ transformOrigin: "0px 0px" }}
              >
                <g clipPath="url(#flowerClockClip)">
                  {clippedGlowPieces.map((piece) => (
                    <ClockPiece
                      key={`glow-${piece.id}`}
                      piece={{
                        ...piece,
                        strokeWidth: Math.max(piece.strokeWidth, 4),
                        opacity: 0.75,
                      }}
                      progress={1}
                      color={palette.bright}
                    />
                  ))}
                </g>

                {unclippedGlowPieces.map((piece) => (
                  <ClockPiece
                    key={`glow-${piece.id}`}
                    piece={{
                      ...piece,
                      strokeWidth: Math.max(piece.strokeWidth + 2, 5),
                      opacity: 0.65,
                    }}
                    progress={1}
                    color={palette.bright}
                  />
                ))}
              </motion.g>

              {/* Phoenix Gradient - Upward sweep overlay */}
              {heavyGlowEffectsEnabled && glowProgress > 0.5 && (
                <motion.rect
                  x={-half}
                  y={-half}
                  width={half * 2}
                  height={half * 2}
                  fill="url(#flowerClockPhoenix)"
                  initial={{ y: half }}
                  animate={{ y: -half * 2 }}
                  transition={{
                    duration: (stepMs / 1000) * 0.5,
                    ease: "easeInOut",
                  }}
                  style={{ pointerEvents: "none" }}
                />
              )}

              {/* Shimmer overlay at peak */}
              {heavyGlowEffectsEnabled && glowProgress > 0.65 && (
                <motion.g
                  filter="url(#flowerClockShimmer)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.7, 0.3] }}
                  transition={{
                    duration: (stepMs / 1000) * 0.35,
                    ease: "easeInOut",
                  }}
                >
                  <g clipPath="url(#flowerClockClip)">
                    {clippedGlowPieces.map((piece) => (
                      <ClockPiece
                        key={`shimmer-${piece.id}`}
                        piece={{
                          ...piece,
                          strokeWidth: Math.max(piece.strokeWidth + 1, 4),
                          opacity: 0.9,
                        }}
                        progress={1}
                        color={palette.bright}
                      />
                    ))}
                  </g>
                </motion.g>
              )}
            </>
          ) : null}
        </g>
      </svg>
      </div>

      {showStatus ? (
        <div className="clock-status">
          <div style={{ color: palette.soft, fontSize: 13 }}>
            {activeLabel} · {activeStepIndex + 1}/{totalSteps}
          </div>
          <div style={{ color: palette.line, fontSize: 11, marginTop: 6 }}>
            {mode === "wall-clock"
              ? `${timeLabel} · ${Math.floor(cycleElapsed / 1000)}s / 60s · ${palette.name}${
                  showWeekdayInStatus ? ` · ${weekdayAtmosphere.name}` : ""
                }`
              : `Cycle ${cycleIndex + 1} · ${palette.name}${
                  showWeekdayInStatus ? ` · ${weekdayAtmosphere.name}` : ""
                }`}
          </div>
        </div>
      ) : null}
    </div>
  );
}


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
  showDayAtmosphere: true,
  dayAtmosphereMode: "rhythm",
  dayAtmosphereStrength: 0.75,
  weekdayMode: "real",
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
  showDayAtmosphere: true,
  dayAtmosphereMode: "full",
  dayAtmosphereStrength: 1,
  weekdayMode: "cycle",
  showWeekdayInStatus: true,

  paletteTransitionMs: 1200,
  lerpFactor: 0.18,

  showHeavyGlowEffects: true,
} satisfies Partial<FlowerClockProps>;