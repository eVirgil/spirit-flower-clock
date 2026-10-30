/** Pure clock-time math, shared between renderer and regression tests. */
export const CLOCK_MINUTE_MS = 60_000;

export function getCycleTiming(
  now: number,
  mode: "cycle" | "wall-clock",
  requestedCycleMs: number
): { durationMs: number; cycleIndex: number; elapsedMs: number } {
  const durationMs = mode === "wall-clock" ? CLOCK_MINUTE_MS : Math.max(1_000, requestedCycleMs);
  const cycleIndex = Math.floor(now / durationMs);
  const elapsedMs = ((now % durationMs) + durationMs) % durationMs;
  return { durationMs, cycleIndex, elapsedMs };
}

/** Palette changes follow the chosen cadence, not an unrelated drawing minute. */
export function getWeekdayCycleTiming(
  now: number,
  date: Date,
  weekdayMode: "off" | "cycle-day" | "cycle-minute" | "cycle-seven-minutes" | "cycle-hour" | "fixed",
  cycleIndex: number,
  cycleElapsed: number,
  cycleDuration: number,
  paletteCount: number
): { elapsedMs: number; durationMs: number } {
  switch (weekdayMode) {
    case "cycle-day": {
      const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      return { elapsedMs: now - start.getTime(), durationMs: end.getTime() - start.getTime() };
    }
    case "cycle-seven-minutes": {
      const position = ((cycleIndex % paletteCount) + paletteCount) % paletteCount;
      return { elapsedMs: position * cycleDuration + cycleElapsed, durationMs: cycleDuration * paletteCount };
    }
    case "cycle-hour":
      return {
        elapsedMs: date.getMinutes() * 60_000 + date.getSeconds() * 1_000 + date.getMilliseconds(),
        durationMs: 3_600_000,
      };
    case "cycle-minute":
    case "off":
      return { elapsedMs: cycleElapsed, durationMs: cycleDuration };
    case "fixed":
      return { elapsedMs: 0, durationMs: 1 };
  }
}
