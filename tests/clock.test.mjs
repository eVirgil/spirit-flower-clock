import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

// Bundle dependency-free TypeScript modules without installing a new test framework.
async function importSource(path) {
  const result = await build({ entryPoints: [path], bundle: true, format: "esm", platform: "node", write: false });
  return import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64"));
}

const { getCycleTiming } = await importSource("src/clockTiming.ts");
const { pickValidatedClockOverrides } = await importSource("src/configValidation.ts");
const { resolveWeekdayIndex } = await importSource("src/weekdayMode.ts");

test("real-time clock aligns to the actual minute even when requested cycle differs", () => {
  assert.deepEqual(getCycleTiming(125_500, "wall-clock", 120_000), {
    durationMs: 60_000, cycleIndex: 2, elapsedMs: 5_500
  });
});

test("showcase honors its independent cycle duration and crosses boundaries", () => {
  assert.equal(getCycleTiming(120_000, "cycle", 30_000).cycleIndex, 4);
  assert.equal(getCycleTiming(59_999, "cycle", 30_000).elapsedMs, 29_999);
  assert.equal(getCycleTiming(60_000, "cycle", 30_000).elapsedMs, 0);
});

test("configuration validation rejects invalid values and strips unknown keys", () => {
  const defaults = { radius: 60, tickMs: 33, paletteMode: "day-atmosphere", showDebugMetadata: false };
  assert.equal(pickValidatedClockOverrides({ radius: -50 }, defaults), null);
  assert.equal(pickValidatedClockOverrides({ tickMs: "fast" }, defaults), null);
  assert.equal(pickValidatedClockOverrides({ paletteMode: "unexpected" }, defaults), null);
  assert.equal(pickValidatedClockOverrides({ showDebugMetadata: "yes" }, defaults), null);
  assert.deepEqual(pickValidatedClockOverrides({ radius: 70, extra: "ignore" }, defaults), { radius: 70 });
});

test("weekday calculation honors real local weekday and fixed index", () => {
  const date = new Date("2026-10-30T12:00:00");
  const args = { now: date.getTime(), date, cycleIndex: 5, fixedWeekdayIndex: 2, paletteCount: 7 };
  assert.equal(resolveWeekdayIndex({ ...args, weekdayMode: "cycle-day" }), date.getDay());
  assert.equal(resolveWeekdayIndex({ ...args, weekdayMode: "fixed" }), 2);
  assert.equal(resolveWeekdayIndex({ ...args, weekdayMode: "off" }), null);
});
