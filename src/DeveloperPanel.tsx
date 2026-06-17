import {
  memo,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_SPIRIT_CLOCK_CONFIG,
  parseSpiritClockConfig,
  type ClockMode,
  type ClockSize,
  type DayAtmosphereMode,
  type DayAtmosphereBehavior,
  type ForcePhase,
  type GlowIntensity,
  type PaletteMode,
  type PerformanceMode,
  type ReducedMotionMode,
  type RotationPreset,
  type SpiritClockConfig,
  type SpiritClockDebugInfo,
  type SponsorVisibility,
  type WeekdayMode,
} from "./spiritClockConfig";

type DeveloperPanelProps = {
  open: boolean;
  config: SpiritClockConfig;
  debugInfo: SpiritClockDebugInfo | null;
  onClose: () => void;
  onPatch: (partial: Partial<SpiritClockConfig>) => void;
  onReplace: (next: SpiritClockConfig) => void;
};

type Option<T extends string> = { value: T; label: string; disabled?: boolean };

function SegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  hint?: string;
}) {
  const groupId = useId();

  return (
    <div className="dev-field">
      <span className="dev-label" id={groupId}>
        {label}
      </span>
      {hint ? <span className="dev-hint">{hint}</span> : null}
      <div className="dev-segmented" role="group" aria-labelledby={groupId}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={
              value === option.value
                ? "dev-segment dev-segment--active"
                : "dev-segment"
            }
            aria-pressed={value === option.value}
            disabled={option.disabled}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectControl<T extends string>({
  label,
  value,
  options,
  onChange,
  hint,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  hint?: string;
}) {
  const selectId = useId();

  return (
    <div className="dev-field">
      <label className="dev-label" htmlFor={selectId}>
        {label}
      </label>
      {hint ? <span className="dev-hint">{hint}</span> : null}
      <select
        id={selectId}
        className="dev-select"
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

const NumberControl = memo(function NumberControl({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  hint?: string;
}) {
  const inputId = useId();

  return (
    <div className="dev-field">
      <label className="dev-label" htmlFor={inputId}>
        {label}
      </label>
      {hint ? <span className="dev-hint">{hint}</span> : null}
      <input
        id={inputId}
        className="dev-input"
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
});

const SliderControl = memo(function SliderControl({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const inputId = useId();

  return (
    <div className="dev-field dev-field--slider">
      <label className="dev-label" htmlFor={inputId}>
        {label}
        <span className="dev-value">{value}</span>
      </label>
      <input
        id={inputId}
        className="dev-range"
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
});

const Section = memo(function Section({
  title,
  children,
  collapsible = false,
  defaultCollapsed = false,
}: {
  title: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const contentId = useId();

  if (!collapsible) {
    return (
      <section className="dev-section">
        <h3 className="dev-section-title">{title}</h3>
        {children}
      </section>
    );
  }

  return (
    <section className="dev-section">
      <button
        type="button"
        className="dev-section-toggle"
        aria-expanded={!collapsed}
        aria-controls={contentId}
        onClick={() => setCollapsed((current) => !current)}
      >
        <span>{title}</span>
        <span className="dev-section-chevron" aria-hidden="true">
          {collapsed ? "+" : "−"}
        </span>
      </button>
      {!collapsed ? (
        <div id={contentId} className="dev-section-body">
          {children}
        </div>
      ) : null}
    </section>
  );
});

const CLOCK_MODE_OPTIONS: Option<ClockMode>[] = [
  { value: "living-clock", label: "Living Clock" },
  { value: "ambient-clock", label: "Ambient Clock", disabled: true },
  { value: "static-emblem", label: "Static Emblem" },
  { value: "showcase", label: "Showcase", disabled: true },
];

const PALETTE_MODE_OPTIONS: Option<PaletteMode>[] = [
  { value: "cycle", label: "Cycle Every Minute" },
  { value: "fixed", label: "Fixed Palette" },
  { value: "weekday", label: "Weekday Palette" },
  { value: "day-atmosphere", label: "Day Atmosphere" },
];

const WEEKDAY_MODE_OPTIONS: Option<WeekdayMode>[] = [
  { value: "off", label: "Off" },
  { value: "subtle", label: "Subtle Weekday Shift" },
  { value: "distinct", label: "Distinct Daily Theme" },
  { value: "fixed", label: "Fixed Weekday" },
];

const FIXED_WEEKDAY_OPTIONS: Option<string>[] = [
  { value: "0", label: "Sunday (0)" },
  { value: "1", label: "Monday (1)" },
  { value: "2", label: "Tuesday (2)" },
  { value: "3", label: "Wednesday (3)" },
  { value: "4", label: "Thursday (4)" },
  { value: "5", label: "Friday (5)" },
  { value: "6", label: "Saturday (6)" },
];

const DAY_ATMOSPHERE_OPTIONS: Option<DayAtmosphereMode>[] = [
  { value: "off", label: "Off" },
  { value: "solar", label: "Solar Day Cycle" },
  { value: "mood", label: "Ambient Mood" },
];

const DAY_ATMOSPHERE_BEHAVIOR_OPTIONS: Option<DayAtmosphereBehavior>[] = [
  { value: "rhythm", label: "Rhythm" },
  { value: "weather", label: "Weather" },
  { value: "aura", label: "Aura" },
  { value: "full", label: "Full" },
];

const PERFORMANCE_OPTIONS: Option<PerformanceMode>[] = [
  { value: "quality", label: "Quality" },
  { value: "balanced", label: "Balanced" },
  { value: "low-power", label: "Low Power" },
];

const REDUCED_MOTION_OPTIONS: Option<ReducedMotionMode>[] = [
  { value: "system", label: "Use System Setting" },
  { value: "on", label: "Reduced Motion On" },
  { value: "off", label: "Reduced Motion Off" },
];

const GLOW_OPTIONS: Option<GlowIntensity>[] = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
];

const SIZE_OPTIONS: Option<ClockSize>[] = [
  { value: "small", label: "Small" },
  { value: "normal", label: "Normal" },
  { value: "large", label: "Large" },
  { value: "fullscreen", label: "Fullscreen" },
];

const ROTATION_OPTIONS: Option<RotationPreset>[] = [
  { value: "default", label: "Default" },
  { value: "flat", label: "Flat" },
  { value: "tilted", label: "Tilted" },
  { value: "custom", label: "Custom" },
];

const SPONSOR_OPTIONS: Option<SponsorVisibility>[] = [
  { value: "show", label: "Show Sponsor Link" },
  { value: "hide", label: "Hide Sponsor Link" },
];

const FORCE_PHASE_OPTIONS: Option<ForcePhase>[] = [
  { value: "auto", label: "Auto" },
  { value: "circle", label: "Circle" },
  { value: "seed", label: "Seed" },
  { value: "flower", label: "Flower" },
  { value: "glow", label: "Glow" },
];

const CYCLE_DURATION_OPTIONS: Option<string>[] = [
  { value: "30000", label: "30s" },
  { value: "60000", label: "60s" },
  { value: "120000", label: "120s" },
  { value: "custom", label: "Custom" },
];

const CYCLE_PRESETS = [30_000, 60_000, 120_000] as const;

function isFormFieldTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

const CommonControls = memo(function CommonControls({
  config,
  onPatch,
}: {
  config: SpiritClockConfig;
  onPatch: (partial: Partial<SpiritClockConfig>) => void;
}) {
  return (
    <Section title="Common">
      <SelectControl
        label="Clock Mode"
        value={config.clockMode}
        options={CLOCK_MODE_OPTIONS}
        onChange={(clockMode: ClockMode) => onPatch({ clockMode })}
      />

      <SelectControl
        label="Palette Mode"
        value={config.paletteMode}
        options={PALETTE_MODE_OPTIONS}
        onChange={(paletteMode: PaletteMode) => onPatch({ paletteMode })}
      />

      {config.paletteMode === "fixed" ? (
        <NumberControl
          label="Fixed Palette Index"
          value={config.fixedPaletteIndex}
          min={0}
          max={23}
          onChange={(fixedPaletteIndex) => onPatch({ fixedPaletteIndex })}
        />
      ) : null}

      <SelectControl
        label="Weekday Mode"
        value={config.weekdayMode}
        options={WEEKDAY_MODE_OPTIONS}
        onChange={(weekdayMode: WeekdayMode) => onPatch({ weekdayMode })}
        hint="Affects atmosphere when weekday palette or subtle shifts are active."
      />

      {config.weekdayMode === "fixed" ? (
        <SelectControl
          label="Fixed Weekday Index"
          value={String(config.fixedWeekdayIndex)}
          options={FIXED_WEEKDAY_OPTIONS}
          onChange={(value) => onPatch({ fixedWeekdayIndex: Number(value) })}
          hint="Locks atmosphere and weekday palette to this day (0 = Sunday)."
        />
      ) : null}

      <SelectControl
        label="Day Atmosphere Mode"
        value={config.dayAtmosphereMode}
        options={DAY_ATMOSPHERE_OPTIONS}
        onChange={(dayAtmosphereMode: DayAtmosphereMode) => onPatch({ dayAtmosphereMode })}
        hint="Solar enables weekday atmosphere; Ambient Mood softens blend strength."
      />

      <SelectControl
        label="Day Atmosphere Behavior"
        value={config.dayAtmosphereBehavior}
        options={DAY_ATMOSPHERE_BEHAVIOR_OPTIONS}
        onChange={(dayAtmosphereBehavior: DayAtmosphereBehavior) =>
          onPatch({ dayAtmosphereBehavior })
        }
        hint="Rhythm: star timing + aura. Weather: adds star drift. Aura: tint only. Full: all effects."
      />

      <SegmentedControl
        label="Performance Mode"
        value={config.performanceMode}
        options={PERFORMANCE_OPTIONS}
        onChange={(performanceMode: PerformanceMode) => onPatch({ performanceMode })}
      />

      <SelectControl
        label="Reduced Motion"
        value={config.reducedMotion}
        options={REDUCED_MOTION_OPTIONS}
        onChange={(reducedMotion: ReducedMotionMode) => onPatch({ reducedMotion })}
      />

      <SegmentedControl
        label="Glow Intensity"
        value={config.glowIntensity}
        options={GLOW_OPTIONS}
        onChange={(glowIntensity: GlowIntensity) => onPatch({ glowIntensity })}
      />

      <SegmentedControl
        label="Clock Size"
        value={config.clockSize}
        options={SIZE_OPTIONS}
        onChange={(clockSize: ClockSize) => onPatch({ clockSize })}
      />

      <SelectControl
        label="Rotation"
        value={config.rotation}
        options={ROTATION_OPTIONS}
        onChange={(rotation: RotationPreset) => onPatch({ rotation })}
      />

      <SegmentedControl
        label="Sponsor"
        value={config.sponsorVisibility}
        options={SPONSOR_OPTIONS}
        onChange={(sponsorVisibility: SponsorVisibility) => onPatch({ sponsorVisibility })}
      />
    </Section>
  );
});

const AdvancedControls = memo(function AdvancedControls({
  config,
  debugInfo,
  cyclePreset,
  importText,
  importStatus,
  onPatch,
  onReplace,
  onCyclePresetChange,
  onImportTextChange,
  onCopyConfig,
  onImportConfig,
}: {
  config: SpiritClockConfig;
  debugInfo: SpiritClockDebugInfo | null;
  cyclePreset: string;
  importText: string;
  importStatus: string | null;
  onPatch: (partial: Partial<SpiritClockConfig>) => void;
  onReplace: (next: SpiritClockConfig) => void;
  onCyclePresetChange: (value: string) => void;
  onImportTextChange: (value: string) => void;
  onCopyConfig: () => void;
  onImportConfig: () => void;
}) {
  return (
    <Section title="Advanced" collapsible defaultCollapsed>
      <div className="dev-subsection">
        <h4 className="dev-subsection-title">Timing</h4>
        <SelectControl
          label="Cycle Duration"
          value={cyclePreset}
          options={CYCLE_DURATION_OPTIONS}
          onChange={onCyclePresetChange}
        />
        {cyclePreset === "custom" ? (
          <NumberControl
            label="Custom Cycle (ms)"
            value={config.cycleDurationMs}
            min={1000}
            step={1000}
            onChange={(cycleDurationMs) => onPatch({ cycleDurationMs })}
          />
        ) : null}
        <NumberControl
          label="Tick Rate (ms)"
          value={config.tickMs}
          min={16}
          step={1}
          onChange={(tickMs) => onPatch({ tickMs })}
          hint="Lower values may use more CPU."
        />
      </div>

      <div className="dev-subsection">
        <h4 className="dev-subsection-title">Geometry</h4>
        <SliderControl
          label="Radius"
          value={config.radius}
          min={40}
          max={90}
          step={1}
          onChange={(radius) => onPatch({ radius })}
        />
        <SliderControl
          label="Clip Multiplier"
          value={config.clipMultiplier}
          min={2}
          max={4}
          step={0.1}
          onChange={(clipMultiplier) => onPatch({ clipMultiplier })}
        />
        <SliderControl
          label="Boundary Offset"
          value={config.boundaryOffset}
          min={0}
          max={30}
          step={1}
          onChange={(boundaryOffset) => onPatch({ boundaryOffset })}
        />
        {config.rotation === "custom" ? (
          <SliderControl
            label="Rotation Degrees"
            value={config.customRotationDeg}
            min={-90}
            max={90}
            step={1}
            onChange={(customRotationDeg) => onPatch({ customRotationDeg })}
          />
        ) : null}
      </div>

      <div className="dev-subsection">
        <h4 className="dev-subsection-title">Rendering</h4>
        <SliderControl
          label="Glow Blur Strength"
          value={config.glowBlurStrength}
          min={0}
          max={20}
          step={0.5}
          onChange={(glowBlurStrength) => onPatch({ glowBlurStrength })}
        />
        <SliderControl
          label="Interior Stroke Width"
          value={config.interiorStrokeWidth}
          min={0.5}
          max={6}
          step={0.1}
          onChange={(interiorStrokeWidth) => onPatch({ interiorStrokeWidth })}
        />
        <SliderControl
          label="Boundary Stroke Width"
          value={config.boundaryStrokeWidth}
          min={0.5}
          max={10}
          step={0.1}
          onChange={(boundaryStrokeWidth) => onPatch({ boundaryStrokeWidth })}
        />
        <SliderControl
          label="Aura Opacity"
          value={config.auraOpacity}
          min={0}
          max={2}
          step={0.05}
          onChange={(auraOpacity) => onPatch({ auraOpacity })}
        />
        <SliderControl
          label="Glow Opacity"
          value={config.glowOpacity}
          min={0}
          max={2}
          step={0.05}
          onChange={(glowOpacity) => onPatch({ glowOpacity })}
        />
      </div>

      <div className="dev-subsection">
        <h4 className="dev-subsection-title">Debug / Preview</h4>
        <SelectControl
          label="Force Phase"
          value={config.forcePhase}
          options={FORCE_PHASE_OPTIONS}
          onChange={(forcePhase: ForcePhase) => onPatch({ forcePhase })}
        />
        <label className="dev-checkbox">
          <input
            type="checkbox"
            checked={config.showDebugMetadata}
            onChange={(event) =>
              onPatch({ showDebugMetadata: event.target.checked })
            }
          />
          Show debug metadata
        </label>
        {config.showDebugMetadata && debugInfo ? (
          <pre className="dev-debug">{JSON.stringify(debugInfo, null, 2)}</pre>
        ) : null}
      </div>

      <div className="dev-subsection dev-subsection--reserved">
        <h4 className="dev-subsection-title">Custom Palettes</h4>
        <p className="dev-note">Coming later</p>
      </div>

      <div className="dev-subsection dev-subsection--reserved">
        <h4 className="dev-subsection-title">Atmosphere Config</h4>
        <p className="dev-note">Coming later</p>
      </div>

      <div className="dev-subsection">
        <h4 className="dev-subsection-title">Utilities</h4>
        <div className="dev-actions">
          <button
            type="button"
            className="dev-button"
            onClick={() => onReplace({ ...DEFAULT_SPIRIT_CLOCK_CONFIG })}
          >
            Reset defaults
          </button>
          <button type="button" className="dev-button" onClick={onCopyConfig}>
            Copy config JSON
          </button>
        </div>
        <label className="dev-label" htmlFor="dev-import-json">
          Paste config JSON
        </label>
        <textarea
          id="dev-import-json"
          className="dev-textarea"
          rows={4}
          value={importText}
          onChange={(event) => onImportTextChange(event.target.value)}
          placeholder='{"clockMode":"living-clock",...}'
        />
        <button type="button" className="dev-button" onClick={onImportConfig}>
          Import config
        </button>
        {importStatus ? <p className="dev-status">{importStatus}</p> : null}
      </div>
    </Section>
  );
});

function DeveloperPanel({
  open,
  config,
  debugInfo,
  onClose,
  onPatch,
  onReplace,
}: DeveloperPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const minimizeButtonRef = useRef<HTMLButtonElement>(null);
  const didInitialFocusRef = useRef(false);
  const [minimized, setMinimized] = useState(false);
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [cyclePreset, setCyclePreset] = useState<string>(() =>
    CYCLE_PRESETS.includes(config.cycleDurationMs as (typeof CYCLE_PRESETS)[number])
      ? String(config.cycleDurationMs)
      : "custom"
  );

  useEffect(() => {
    if (!open) {
      didInitialFocusRef.current = false;
      return;
    }

    if (!didInitialFocusRef.current) {
      didInitialFocusRef.current = true;
      minimizeButtonRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isFormFieldTarget(event.target)) return;

      event.preventDefault();
      if (minimized) {
        setMinimized(false);
        return;
      }
      onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, minimized, onClose]);

  const handleCyclePresetChange = useCallback(
    (value: string) => {
      setCyclePreset(value);
      if (value !== "custom") {
        onPatch({ cycleDurationMs: Number(value) });
      }
    },
    [onPatch]
  );

  const handleCopyConfig = useCallback(async () => {
    await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setImportStatus("Config copied to clipboard.");
  }, [config]);

  const handleImportConfig = useCallback(() => {
    const parsed = parseSpiritClockConfig(importText);
    if (!parsed) {
      setImportStatus("Invalid JSON — config not applied.");
      return;
    }
    onReplace(parsed);
    setImportStatus("Config imported.");
  }, [importText, onReplace]);

  if (!open) return null;

  const panelClassName = minimized
    ? "dev-panel dev-panel--minimized"
    : "dev-panel";

  return (
    <aside
      ref={panelRef}
      className={panelClassName}
      role="dialog"
      aria-modal={!minimized}
      aria-label="Developer Mode"
    >
      <header className="dev-panel-header">
        <h2 className="dev-panel-title">Developer Mode</h2>
        <div className="dev-panel-actions">
          <button
            ref={minimizeButtonRef}
            type="button"
            className="dev-icon-button"
            aria-label={minimized ? "Expand developer panel" : "Minimize developer panel"}
            aria-expanded={!minimized}
            onClick={() => setMinimized((current) => !current)}
          >
            {minimized ? "▢" : "−"}
          </button>
          <button
            type="button"
            className="dev-icon-button dev-close"
            aria-label="Close developer panel"
            onClick={onClose}
          >
            ×
          </button>
        </div>
      </header>

      {!minimized ? (
        <div className="dev-panel-scroll">
          <CommonControls config={config} onPatch={onPatch} />
          <AdvancedControls
            config={config}
            debugInfo={debugInfo}
            cyclePreset={cyclePreset}
            importText={importText}
            importStatus={importStatus}
            onPatch={onPatch}
            onReplace={onReplace}
            onCyclePresetChange={handleCyclePresetChange}
            onImportTextChange={setImportText}
            onCopyConfig={handleCopyConfig}
            onImportConfig={handleImportConfig}
          />
        </div>
      ) : null}
    </aside>
  );
}

export default memo(DeveloperPanel);
