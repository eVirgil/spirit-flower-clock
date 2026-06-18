import {
  DEFAULT_CLOCK_CONFIG,
  type FlowerClockProps,
  type ForcePhase,
} from "./FlowerOfLifeClock";
import {
  migrateBackgroundMode,
  type BackgroundLayerMode,
} from "./backgroundThemes";
import { migrateWeekdayMode, type WeekdayMode } from "./weekdayMode";

export type { ForcePhase };
export type { WeekdayMode };
export type { BackgroundLayerMode as BackgroundMode };

export type ClockMode =
  | "living-clock"
  | "ambient-clock"
  | "static-emblem"
  | "showcase";

export type PaletteMode = "cycle" | "hour" | "day-atmosphere" | "weekday" | "fixed";

export type PerformanceMode = "quality" | "balanced" | "low-power";

export type ReducedMotionMode = "system" | "on" | "off";

export type GlowIntensity = "low" | "normal" | "high";

export type ClockSize = "small" | "normal" | "large" | "fullscreen";

export type RotationPreset = "default" | "flat" | "tilted" | "custom";

export type SponsorVisibility = "show" | "hide";

export type SpiritClockConfig = {
  clockMode: ClockMode;
  paletteMode: PaletteMode;
  weekdayMode: WeekdayMode;
  backgroundMode: BackgroundLayerMode;
  backgroundIntensity: number;
  performanceMode: PerformanceMode;
  reducedMotion: ReducedMotionMode;
  glowIntensity: GlowIntensity;
  clockSize: ClockSize;
  rotation: RotationPreset;
  sponsorVisibility: SponsorVisibility;

  cycleDurationMs: number;
  radius: number;
  clipMultiplier: number;
  boundaryOffset: number;
  tickMs: number;
  forcePhase: ForcePhase;

  customRotationDeg: number;
  glowBlurStrength: number;
  interiorStrokeWidth: number;
  boundaryStrokeWidth: number;
  auraOpacity: number;
  glowOpacity: number;
  fixedPaletteIndex: number;
  fixedWeekdayIndex: number;
  showDebugMetadata: boolean;
};

export type SpiritClockDebugInfo = {
  stepIndex: number;
  totalSteps: number;
  label: string;
  paletteName: string;
  cycleIndex: number;
};

export const DEFAULT_SPIRIT_CLOCK_CONFIG: SpiritClockConfig = {
  clockMode: "living-clock",
  paletteMode: "day-atmosphere",
  weekdayMode: "cycle-day",
  backgroundMode: "full",
  backgroundIntensity: 0.75,
  performanceMode: "balanced",
  reducedMotion: "system",
  glowIntensity: "normal",
  clockSize: "normal",
  rotation: "default",
  sponsorVisibility: "show",

  cycleDurationMs: 60_000,
  radius: 60,
  clipMultiplier: 3,
  boundaryOffset: 10,
  tickMs: 33,
  forcePhase: "auto",

  customRotationDeg: 30,
  glowBlurStrength: 3,
  interiorStrokeWidth: 2,
  boundaryStrokeWidth: 6,
  auraOpacity: 1,
  glowOpacity: 1,
  fixedPaletteIndex: 0,
  fixedWeekdayIndex: 0,
  showDebugMetadata: false,
};

function rotationDegrees(config: SpiritClockConfig): number {
  switch (config.rotation) {
    case "flat":
      return 0;
    case "tilted":
      return 45;
    case "custom":
      return config.customRotationDeg;
    case "default":
    default:
      return 30;
  }
}

function mapPerformanceMode(mode: PerformanceMode): FlowerClockProps["performanceMode"] {
  if (mode === "low-power") return "lite";
  return mode;
}

function mapPaletteMode(mode: PaletteMode): FlowerClockProps["paletteMode"] {
  switch (mode) {
    case "cycle":
      return "cycle";
    case "hour":
      return "hour";
    case "fixed":
      return "fixed";
    case "weekday":
      return "weekday";
    case "day-atmosphere":
      return "dayPhase";
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

function mapBackground(config: SpiritClockConfig): Pick<
  FlowerClockProps,
  "showBackground" | "backgroundMode" | "backgroundStrength" | "weekdayMode"
> {
  const backgroundDisabled =
    config.backgroundMode === "off" || config.weekdayMode === "off";

  if (backgroundDisabled) {
    return {
      showBackground: false,
      backgroundMode: "off",
      backgroundStrength: 0,
      weekdayMode: config.weekdayMode,
    };
  }

  return {
    showBackground: true,
    backgroundMode: config.backgroundMode,
    backgroundStrength: config.backgroundIntensity,
    weekdayMode: config.weekdayMode,
  };
}

function mapGlowIntensity(intensity: GlowIntensity): Pick<
  FlowerClockProps,
  "showHeavyGlowEffects" | "glowIntensityMul"
> {
  switch (intensity) {
    case "low":
      return { showHeavyGlowEffects: false, glowIntensityMul: 0.55 };
    case "high":
      return { showHeavyGlowEffects: true, glowIntensityMul: 1.25 };
    case "normal":
    default:
      return { showHeavyGlowEffects: undefined, glowIntensityMul: 1 };
  }
}

function mapClockMode(config: SpiritClockConfig): Pick<
  FlowerClockProps,
  "mode" | "cycleMs" | "forcePhase" | "showDrawHead" | "showMinuteTicks"
> {
  switch (config.clockMode) {
    case "static-emblem":
      return {
        mode: "wall-clock",
        cycleMs: config.cycleDurationMs,
        forcePhase: "glow",
        showDrawHead: false,
        showMinuteTicks: false,
      };
    case "ambient-clock":
      return {
        mode: "wall-clock",
        cycleMs: config.cycleDurationMs,
        forcePhase: config.forcePhase,
        showDrawHead: true,
        showMinuteTicks: false,
      };
    case "showcase":
      return {
        mode: "cycle",
        cycleMs: config.cycleDurationMs,
        forcePhase: config.forcePhase,
        showDrawHead: true,
        showMinuteTicks: true,
      };
    case "living-clock":
    default:
      return {
        mode: "wall-clock",
        cycleMs: config.cycleDurationMs,
        forcePhase: config.forcePhase,
        showDrawHead: true,
        showMinuteTicks: false,
      };
  }
}

function migrateBackgroundIntensity(parsed: Record<string, unknown>): number {
  if (typeof parsed.backgroundIntensity === "number") {
    return Math.max(0, Math.min(1, parsed.backgroundIntensity));
  }

  if (parsed.dayAtmosphereMode === "mood") return 0.55;
  if (parsed.dayAtmosphereMode === "off") return 0;
  if (parsed.dayAtmosphereMode === "solar") return 0.75;

  return DEFAULT_SPIRIT_CLOCK_CONFIG.backgroundIntensity;
}

function migrateConfigFields(
  parsed: Partial<SpiritClockConfig> & Record<string, unknown>
): Pick<SpiritClockConfig, "backgroundMode" | "backgroundIntensity" | "weekdayMode"> {
  const weekdayMode = migrateWeekdayMode(parsed.weekdayMode);

  let backgroundMode: BackgroundLayerMode;
  if (parsed.backgroundMode !== undefined) {
    backgroundMode = migrateBackgroundMode(parsed.backgroundMode);
  } else if (parsed.dayAtmosphereMode === "off" || weekdayMode === "off") {
    backgroundMode = "off";
  } else if (parsed.dayAtmosphereBehavior !== undefined) {
    backgroundMode = migrateBackgroundMode(parsed.dayAtmosphereBehavior);
  } else {
    backgroundMode = DEFAULT_SPIRIT_CLOCK_CONFIG.backgroundMode;
  }

  return {
    weekdayMode,
    backgroundMode,
    backgroundIntensity: migrateBackgroundIntensity(parsed),
  };
}

export function configToFlowerProps(config: SpiritClockConfig): FlowerClockProps {
  const clockMode = mapClockMode(config);
  const background = mapBackground(config);
  const glow = mapGlowIntensity(config.glowIntensity);
  const performanceMode = mapPerformanceMode(config.performanceMode);

  const tickMs =
    config.performanceMode === "low-power"
      ? Math.max(config.tickMs, 66)
      : config.tickMs;

  return {
    ...DEFAULT_CLOCK_CONFIG,
    ...clockMode,
    ...background,
    ...glow,
    paletteMode: mapPaletteMode(config.paletteMode),
    fixedPaletteIndex: config.fixedPaletteIndex,
    fixedWeekdayIndex: config.fixedWeekdayIndex,
    performanceMode,
    tickMs,
    r: config.radius,
    clipMul: config.clipMultiplier,
    boundaryOffset: config.boundaryOffset,
    rotateDeg: rotationDegrees(config),
    showStatus: false,
    glowBlurStrength: config.glowBlurStrength,
    interiorStrokeWidth: config.interiorStrokeWidth,
    boundaryStrokeWidth: config.boundaryStrokeWidth,
    auraOpacityMul: config.auraOpacity,
    glowOpacityMul: config.glowOpacity,
    reducedMotionOverride: config.reducedMotion,
  };
}

export function clockSizeClass(size: ClockSize): string {
  switch (size) {
    case "small":
      return "clock-size--small";
    case "large":
      return "clock-size--large";
    case "fullscreen":
      return "clock-size--fullscreen";
    case "normal":
    default:
      return "clock-size--normal";
  }
}

export function parseSpiritClockConfig(json: string): SpiritClockConfig | null {
  try {
    const parsed = JSON.parse(json) as Partial<SpiritClockConfig> & Record<string, unknown>;
    const migrated = migrateConfigFields(parsed);
    return {
      ...DEFAULT_SPIRIT_CLOCK_CONFIG,
      ...parsed,
      ...migrated,
    };
  } catch {
    return null;
  }
}
