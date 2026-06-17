import {
  DEFAULT_CLOCK_CONFIG,
  type FlowerClockProps,
  type ForcePhase,
} from "./FlowerOfLifeClock";

export type { ForcePhase };

export type ClockMode =
  | "living-clock"
  | "ambient-clock"
  | "static-emblem"
  | "showcase";

export type PaletteMode = "cycle" | "fixed" | "weekday" | "day-atmosphere";

export type WeekdayMode = "off" | "subtle" | "distinct";

export type DayAtmosphereMode = "off" | "solar" | "mood";

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
  dayAtmosphereMode: DayAtmosphereMode;
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
  weekdayMode: "subtle",
  dayAtmosphereMode: "solar",
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

function mapWeekdayAtmosphere(config: SpiritClockConfig): Pick<
  FlowerClockProps,
  "showDayAtmosphere" | "dayAtmosphereMode" | "dayAtmosphereStrength" | "weekdayMode"
> {
  if (config.weekdayMode === "off") {
    return {
      showDayAtmosphere: false,
      dayAtmosphereMode: "rhythm",
      dayAtmosphereStrength: 0,
      weekdayMode: "real",
    };
  }

  if (config.weekdayMode === "distinct") {
    return {
      showDayAtmosphere: true,
      dayAtmosphereMode: "full",
      dayAtmosphereStrength: 0.85,
      weekdayMode: "real",
    };
  }

  return {
    showDayAtmosphere: true,
    dayAtmosphereMode: "weather",
    dayAtmosphereStrength: 0.75,
    weekdayMode: "real",
  };
}

function mapDayAtmosphere(config: SpiritClockConfig): Pick<
  FlowerClockProps,
  "showDayAtmosphere" | "dayAtmosphereMode" | "dayAtmosphereStrength"
> {
  const weekday = mapWeekdayAtmosphere(config);

  if (config.dayAtmosphereMode === "off") {
    return {
      showDayAtmosphere: false,
      dayAtmosphereMode: "rhythm",
      dayAtmosphereStrength: 0,
    };
  }

  if (config.dayAtmosphereMode === "mood") {
    return {
      showDayAtmosphere: true,
      dayAtmosphereMode: "aura",
      dayAtmosphereStrength: 0.55,
    };
  }

  return weekday;
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

export function configToFlowerProps(config: SpiritClockConfig): FlowerClockProps {
  const clockMode = mapClockMode(config);
  const dayAtmosphere = mapDayAtmosphere(config);
  const glow = mapGlowIntensity(config.glowIntensity);
  const performanceMode = mapPerformanceMode(config.performanceMode);

  const tickMs =
    config.performanceMode === "low-power"
      ? Math.max(config.tickMs, 66)
      : config.tickMs;

  return {
    ...DEFAULT_CLOCK_CONFIG,
    ...clockMode,
    ...dayAtmosphere,
    ...glow,
    paletteMode: mapPaletteMode(config.paletteMode),
    fixedPaletteIndex: config.fixedPaletteIndex,
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
    const parsed = JSON.parse(json) as Partial<SpiritClockConfig>;
    return { ...DEFAULT_SPIRIT_CLOCK_CONFIG, ...parsed };
  } catch {
    return null;
  }
}
