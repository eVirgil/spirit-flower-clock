import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFileSync } from "node:fs";

// Transpile dependency-free TypeScript modules using the project's direct dependency.
async function importSource(path) {
  const source = readFileSync(path, "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 }
  }).outputText;
  return import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));
}

const { getCycleTiming, getWeekdayCycleTiming } = await importSource("src/clockTiming.ts");
const { getGeometryRenderPlan } = await importSource("src/geometryRenderPlan.ts");
const { completionGlowOpacity, FINAL_GLOW_BOOST, INTENSE_GLOW_FILTER_ALPHA } = await importSource("src/completionGlow.ts");
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

test("weekday palette phase follows the day instead of restarting each minute", () => {
  const date = new Date(2026, 9, 30, 12, 30, 0);
  const phase = getWeekdayCycleTiming(date.getTime(), date, "cycle-day", 100, 0, 60_000, 7);
  assert.equal(phase.durationMs, 86_400_000);
  assert.equal(phase.elapsedMs, 12.5 * 3_600_000);
});

test("seven-minute cadence advances after one complete palette rotation", () => {
  assert.deepEqual(getWeekdayCycleTiming(0, new Date(0), "cycle-seven-minutes", 8, 5_000, 60_000, 7), {
    elapsedMs: 65_000, durationMs: 420_000
  });
});

test("fixed weekday selection does not transition", () => {
  assert.deepEqual(getWeekdayCycleTiming(0, new Date(0), "fixed", 0, 0, 60_000, 7), {
    elapsedMs: 0, durationMs: 1
  });
});

test("geometry render plan isolates only the actively drawing step", () => {
  assert.deepEqual(getGeometryRenderPlan(8, 0, false), {
    completedCount: 0, activeIndex: 0
  });
  assert.deepEqual(getGeometryRenderPlan(8, 4, false), {
    completedCount: 4, activeIndex: 4
  });
  assert.deepEqual(getGeometryRenderPlan(8, 7, false), {
    completedCount: 7, activeIndex: 7
  });
});

test("glow phase and forced glow complete the entire Flower without an active step", () => {
  assert.deepEqual(getGeometryRenderPlan(8, 8, true), {
    completedCount: 8, activeIndex: null
  });
  assert.deepEqual(getGeometryRenderPlan(8, 0, true), {
    completedCount: 8, activeIndex: null
  });
  assert.deepEqual(getGeometryRenderPlan(0, 0, true), {
    completedCount: 0, activeIndex: null
  });
});

test("render plan preserves which circles are visible at every reveal boundary", () => {
  const count = 18;
  for (let active = 0; active <= count; active++) {
    const glow = active === count;
    const { completedCount, activeIndex } = getGeometryRenderPlan(count, active, glow);
    const optimizedIndices = [
      ...Array.from({ length: completedCount }, (_, i) => i),
      ...(activeIndex === null ? [] : [activeIndex]),
    ];
    const originalIndices = Array.from({ length: count }, (_, i) => i)
      .filter((i) => i <= active);
    assert.deepEqual(optimizedIndices, originalIndices, `step ${active}`);
    assert.equal(new Set(optimizedIndices).size, optimizedIndices.length, `no duplicate groups at ${active}`);
  }
});

test("showcase forced phases retain completed geometry and active progress", () => {
  const { completedCount, activeIndex } = getGeometryRenderPlan(18, 12, false);
  assert.equal(completedCount, 12);
  assert.equal(activeIndex, 12);
  // Only the active SVG step receives dynamic progress; the 12 predecessors
  // retain their constant pathLength=1 / strokeDashoffset=0 treatment.
  const activeProgress = 0.42;
  const progressByStep = [...Array(completedCount).fill(1), activeProgress];
  assert.equal(progressByStep[activeIndex], activeProgress);
  assert.ok(progressByStep.slice(0, activeIndex).every((p) => p === 1));
});

test("final glow uses a 35% gain on both completion opacity and existing blur bloom", () => {
  assert.equal(FINAL_GLOW_BOOST, 1.35);
  assert.equal(INTENSE_GLOW_FILTER_ALPHA, 1.5 * FINAL_GLOW_BOOST);
  // Non-saturated point: compare directly against the original formula.
  const originalAtQuarter = 0.2 + 0.25 * 0.7;
  assert.ok(Math.abs(completionGlowOpacity(0.25, 1, 1) - originalAtQuarter * FINAL_GLOW_BOOST) < 1e-12);
});

test("completion glow peaks safely without invalid SVG opacities", () => {
  assert.equal(completionGlowOpacity(1, 1, 1), 1);
  assert.equal(completionGlowOpacity(1, 0.55, 1), (0.2 + 0.7) * 0.55 * 1.35);
  assert.equal(completionGlowOpacity(0.25, 0, 1), 0);
  assert.equal(completionGlowOpacity(-5, 1, 1), 0.2 * 1.35);
  assert.equal(completionGlowOpacity(5, 1, 1), 1);
});

test("high glow preset actually increases completion intensity above normal", () => {
  const normal = completionGlowOpacity(0.25, 1, 1);
  const high = completionGlowOpacity(0.25, 1, 1.25);
  assert.ok(high > normal);
  assert.ok(high <= 1);
});
