const HOUR_MS = 60 * 60_000;

export type WeekdayMode =
  | "off"
  | "cycle-day"
  | "cycle-minute"
  | "cycle-seven-minutes"
  | "cycle-hour"
  | "fixed";

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const VALID_WEEKDAY_MODES = new Set<WeekdayMode>([
  "off",
  "cycle-day",
  "cycle-minute",
  "cycle-seven-minutes",
  "cycle-hour",
  "fixed",
]);

export function migrateWeekdayMode(value: unknown): WeekdayMode {
  if (typeof value === "string" && VALID_WEEKDAY_MODES.has(value as WeekdayMode)) {
    return value as WeekdayMode;
  }

  switch (value) {
    case "subtle":
    case "distinct":
    case "real":
      return "cycle-day";
    case "cycle":
      return "cycle-minute";
    case "off":
    case "fixed":
      return value;
    default:
      return "cycle-day";
  }
}

export function wrapWeekdayIndex(index: number): number {
  return ((index % 7) + 7) % 7;
}

export function formatWeekdayIndex(index: number): string {
  const wrapped = wrapWeekdayIndex(index);
  return `${wrapped} — ${WEEKDAY_NAMES[wrapped]}`;
}

export function resolveWeekdayIndex({
  now,
  date,
  weekdayMode,
  cycleIndex,
  fixedWeekdayIndex,
  paletteCount,
}: {
  now: number;
  date: Date;
  weekdayMode: WeekdayMode;
  cycleIndex: number;
  fixedWeekdayIndex: number;
  paletteCount: number;
}): number | null {
  switch (weekdayMode) {
    case "off":
      return null;

    case "cycle-day":
      return date.getDay();

    case "cycle-minute":
      return cycleIndex % 7;

    case "cycle-seven-minutes":
      return Math.floor(cycleIndex / paletteCount) % 7;

    case "cycle-hour":
      return Math.floor(now / HOUR_MS) % 7;

    case "fixed":
      return wrapWeekdayIndex(fixedWeekdayIndex);

    default: {
      const _exhaustive: never = weekdayMode;
      return _exhaustive;
    }
  }
}
