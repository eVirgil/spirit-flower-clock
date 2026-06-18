export type AuraShape = "round" | "wide" | "tall" | "soft-diamond";

export type BackgroundLayerMode = "off" | "aura" | "stars" | "motion" | "full";

export type BackgroundTheme = {
  name: string;
  mood: string;
  tint: string;

  gradient: {
    opacity: number;
    radialStrength: number;
    vignetteStrength: number;
  };

  stars: {
    density: number;
    opacityLow: number;
    opacityHigh: number;
    twinkleSpeed: number;
    twinkleSharpness: number;
    sizeMin: number;
    sizeMax: number;
  };

  motion: {
    directionDeg: number;
    driftSpeed: number;
    driftDistance: number;
    turbulence: number;
    stagger: number;
  };

  aura: {
    intensity: number;
    scale: number;
    breathSpeed: number;
    breathDepth: number;
    shape: AuraShape;
  };

  glow: {
    intensity: number;
    blur: number;
    pulseSpeed: number;
    pulseDepth: number;
  };
};

export const BACKGROUND_THEMES: BackgroundTheme[] = [
  {
    name: "Sunday",
    mood: "Warm, open, slow, restorative.",
    tint: "#ffd740",
    gradient: { opacity: 0.11, radialStrength: 0.72, vignetteStrength: 0.28 },
    stars: {
      density: 0.88,
      opacityLow: 0.28,
      opacityHigh: 1.05,
      twinkleSpeed: 0.72,
      twinkleSharpness: 0.35,
      sizeMin: 0.55,
      sizeMax: 1.45,
    },
    motion: {
      directionDeg: 270,
      driftSpeed: 0.58,
      driftDistance: 0.85,
      turbulence: 0.12,
      stagger: 1.05,
    },
    aura: {
      intensity: 0.72,
      scale: 1.1,
      breathSpeed: 0.48,
      breathDepth: 0.22,
      shape: "round",
    },
    glow: { intensity: 0.55, blur: 18, pulseSpeed: 0.42, pulseDepth: 0.18 },
  },
  {
    name: "Monday",
    mood: "Calm, minimal, focused.",
    tint: "#8c9eff",
    gradient: { opacity: 0.055, radialStrength: 0.42, vignetteStrength: 0.18 },
    stars: {
      density: 0.52,
      opacityLow: 0.42,
      opacityHigh: 0.78,
      twinkleSpeed: 0.55,
      twinkleSharpness: 0.2,
      sizeMin: 0.42,
      sizeMax: 1.05,
    },
    motion: {
      directionDeg: 250,
      driftSpeed: 0.38,
      driftDistance: 0.55,
      turbulence: 0.05,
      stagger: 1.4,
    },
    aura: {
      intensity: 0.32,
      scale: 1.02,
      breathSpeed: 0.38,
      breathDepth: 0.1,
      shape: "round",
    },
    glow: { intensity: 0.22, blur: 12, pulseSpeed: 0.3, pulseDepth: 0.08 },
  },
  {
    name: "Tuesday",
    mood: "Forward-moving, energetic, directional.",
    tint: "#ff80ab",
    gradient: { opacity: 0.075, radialStrength: 0.58, vignetteStrength: 0.22 },
    stars: {
      density: 0.78,
      opacityLow: 0.18,
      opacityHigh: 1.22,
      twinkleSpeed: 1.35,
      twinkleSharpness: 0.88,
      sizeMin: 0.5,
      sizeMax: 1.55,
    },
    motion: {
      directionDeg: 35,
      driftSpeed: 1.48,
      driftDistance: 1.35,
      turbulence: 0.28,
      stagger: 0.55,
    },
    aura: {
      intensity: 0.52,
      scale: 1.06,
      breathSpeed: 1.05,
      breathDepth: 0.16,
      shape: "wide",
    },
    glow: { intensity: 0.38, blur: 14, pulseSpeed: 0.95, pulseDepth: 0.14 },
  },
  {
    name: "Wednesday",
    mood: "Light, airy, balanced, midweek transition.",
    tint: "#00e5ff",
    gradient: { opacity: 0.068, radialStrength: 0.52, vignetteStrength: 0.2 },
    stars: {
      density: 0.62,
      opacityLow: 0.26,
      opacityHigh: 0.95,
      twinkleSpeed: 0.88,
      twinkleSharpness: 0.45,
      sizeMin: 0.48,
      sizeMax: 1.2,
    },
    motion: {
      directionDeg: 90,
      driftSpeed: 0.72,
      driftDistance: 1.05,
      turbulence: 0.18,
      stagger: 0.82,
    },
    aura: {
      intensity: 0.44,
      scale: 1.04,
      breathSpeed: 0.62,
      breathDepth: 0.14,
      shape: "soft-diamond",
    },
    glow: { intensity: 0.32, blur: 15, pulseSpeed: 0.55, pulseDepth: 0.11 },
  },
  {
    name: "Thursday",
    mood: "Broad, deep, expansive, powerful.",
    tint: "#536dfe",
    gradient: { opacity: 0.095, radialStrength: 0.82, vignetteStrength: 0.38 },
    stars: {
      density: 0.74,
      opacityLow: 0.24,
      opacityHigh: 1.02,
      twinkleSpeed: 0.62,
      twinkleSharpness: 0.38,
      sizeMin: 0.52,
      sizeMax: 1.35,
    },
    motion: {
      directionDeg: 180,
      driftSpeed: 0.52,
      driftDistance: 1.15,
      turbulence: 0.1,
      stagger: 1.12,
    },
    aura: {
      intensity: 0.68,
      scale: 1.24,
      breathSpeed: 0.4,
      breathDepth: 0.28,
      shape: "tall",
    },
    glow: { intensity: 0.48, blur: 20, pulseSpeed: 0.35, pulseDepth: 0.2 },
  },
  {
    name: "Friday",
    mood: "Lively, brighter, celebratory.",
    tint: "#b44fff",
    gradient: { opacity: 0.12, radialStrength: 0.75, vignetteStrength: 0.3 },
    stars: {
      density: 1.12,
      opacityLow: 0.16,
      opacityHigh: 1.28,
      twinkleSpeed: 1.22,
      twinkleSharpness: 0.82,
      sizeMin: 0.58,
      sizeMax: 1.65,
    },
    motion: {
      directionDeg: 300,
      driftSpeed: 1.15,
      driftDistance: 1.22,
      turbulence: 0.32,
      stagger: 0.52,
    },
    aura: {
      intensity: 0.78,
      scale: 1.12,
      breathSpeed: 0.92,
      breathDepth: 0.24,
      shape: "wide",
    },
    glow: { intensity: 0.62, blur: 16, pulseSpeed: 0.88, pulseDepth: 0.22 },
  },
  {
    name: "Saturday",
    mood: "Rich, dreamy, spacious, immersive.",
    tint: "#00e676",
    gradient: { opacity: 0.13, radialStrength: 0.88, vignetteStrength: 0.42 },
    stars: {
      density: 1.32,
      opacityLow: 0.22,
      opacityHigh: 1.15,
      twinkleSpeed: 0.58,
      twinkleSharpness: 0.42,
      sizeMin: 0.62,
      sizeMax: 1.75,
    },
    motion: {
      directionDeg: 120,
      driftSpeed: 0.48,
      driftDistance: 1.45,
      turbulence: 0.22,
      stagger: 1.48,
    },
    aura: {
      intensity: 0.85,
      scale: 1.16,
      breathSpeed: 0.44,
      breathDepth: 0.26,
      shape: "round",
    },
    glow: { intensity: 0.7, blur: 22, pulseSpeed: 0.4, pulseDepth: 0.24 },
  },
];

export function getBackgroundThemeByIndex(index: number): BackgroundTheme {
  return BACKGROUND_THEMES[((index % 7) + 7) % 7] ?? BACKGROUND_THEMES[0];
}

export function hasBackgroundAura(mode: BackgroundLayerMode): boolean {
  return mode === "aura" || mode === "full";
}

export function hasBackgroundStars(mode: BackgroundLayerMode): boolean {
  return mode === "stars" || mode === "motion" || mode === "full";
}

export function hasBackgroundMotion(mode: BackgroundLayerMode): boolean {
  return mode === "motion" || mode === "full";
}

export function hasBackgroundGlow(mode: BackgroundLayerMode): boolean {
  return mode === "full";
}

export function hasBackgroundGradient(mode: BackgroundLayerMode): boolean {
  return mode === "aura" || mode === "full";
}

export function getAuraShapeTransform(shape: AuraShape): {
  scaleX: number;
  scaleY: number;
  rotate: number;
} {
  switch (shape) {
    case "wide":
      return { scaleX: 1.22, scaleY: 0.86, rotate: 0 };
    case "tall":
      return { scaleX: 0.86, scaleY: 1.22, rotate: 0 };
    case "soft-diamond":
      return { scaleX: 1.12, scaleY: 1.12, rotate: 45 };
    case "round":
    default:
      return { scaleX: 1, scaleY: 1, rotate: 0 };
  }
}

const VALID_BACKGROUND_MODES = new Set<BackgroundLayerMode>([
  "off",
  "aura",
  "stars",
  "motion",
  "full",
]);

export function migrateBackgroundMode(value: unknown): BackgroundLayerMode {
  if (typeof value === "string" && VALID_BACKGROUND_MODES.has(value as BackgroundLayerMode)) {
    return value as BackgroundLayerMode;
  }

  switch (value) {
    case "rhythm":
      return "stars";
    case "weather":
      return "motion";
    case "aura":
      return "aura";
    case "full":
      return "full";
    case "solar":
    case "mood":
      return "motion";
    default:
      return "motion";
  }
}
