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
