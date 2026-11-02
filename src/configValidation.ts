/**
 * Parse boundary: imported JSON is untrusted even in a developer-only panel.
 * Keep this module free of React so validation can be independently tested.
 */
const STRING_OPTIONS: Record<string, readonly string[]> = {
  clockMode: ["living-clock", "ambient-clock", "static-emblem", "showcase"],
  paletteMode: ["cycle", "hour", "day-atmosphere", "weekday", "fixed"],
  weekdayMode: ["off", "cycle-day", "cycle-minute", "cycle-seven-minutes", "cycle-hour", "fixed", "subtle", "distinct", "real", "cycle"],
  backgroundMode: ["off", "aura", "stars", "motion", "full", "rhythm", "weather", "solar", "mood"],
  performanceMode: ["quality", "balanced", "low-power"],
  reducedMotion: ["system", "on", "off"],
  glowIntensity: ["low", "normal", "high"],
  clockSize: ["small", "normal", "large", "fullscreen"],
  rotation: ["default", "flat", "tilted", "custom"],
  sponsorVisibility: ["show", "hide"],
  forcePhase: ["auto", "circle", "seed", "flower", "glow"],
};

const NUMERIC_RANGES: Record<string, readonly [number, number]> = {
  backgroundIntensity: [0, 1],
  cycleDurationMs: [1_000, 3_600_000],
  radius: [1, 500],
  clipMultiplier: [1, 5],
  boundaryOffset: [0, 100],
  tickMs: [16, 1_000],
  customRotationDeg: [-360, 360],
  glowBlurStrength: [0, 30],
  interiorStrokeWidth: [0.1, 20],
  boundaryStrokeWidth: [0.1, 20],
  auraOpacity: [0, 2],
  glowOpacity: [0, 2],
  fixedPaletteIndex: [0, 6],
  fixedWeekdayIndex: [0, 6],
};

export function pickValidatedClockOverrides<T extends object>(
  input: Record<string, unknown>,
  defaults: T
): Partial<T> | null {
  const overrides: Record<string, unknown> = {};
  for (const [key, fallback] of Object.entries(defaults)) {
    if (!Object.hasOwn(input, key)) continue;
    const value = input[key];
    if (typeof value !== typeof fallback) return null;
    if (typeof fallback === "string") {
      if (typeof value !== "string" || !STRING_OPTIONS[key]?.includes(value)) return null;
    } else if (typeof fallback === "number") {
      if (typeof value !== "number" || !Number.isFinite(value)) return null;
      const range = NUMERIC_RANGES[key];
      if (!range || value < range[0] || value > range[1]) return null;
      if ((key === "fixedPaletteIndex" || key === "fixedWeekdayIndex") && !Number.isInteger(value)) return null;
    } else if (typeof fallback !== "boolean") {
      return null;
    }
    overrides[key] = value;
  }
  return overrides as Partial<T>;
}
