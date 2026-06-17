import {
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
  onChange: (next: SpiritClockConfig) => void;
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

function NumberControl({
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
}

function SliderControl({
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
}

function Section({
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
}

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
];

const DAY_ATMOSPHERE_OPTIONS: Option<DayAtmosphereMode>[] = [
  { value: "off", label: "Off" },
  { value: "solar", label: "Solar Day Cycle" },
  { value: "mood", label: "Ambient Mood" },
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

const CYCLE_PRESETS = [30_000, 60_000, 120_000] as const;

export default function DeveloperPanel({
  open,
  config,
  debugInfo,
  onClose,
  onChange,
}: DeveloperPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [cyclePreset, setCyclePreset] = useState<"custom" | string>(() =>
    CYCLE_PRESETS.includes(config.cycleDurationMs as (typeof CYCLE_PRESETS)[number])
      ? String(config.cycleDurationMs)
      : "custom"
  );

  const patch = useCallback(
    (partial: Partial<SpiritClockConfig>) => {
      onChange({ ...config, ...partial });
    },
    [config, onChange]
  );

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const handleCopyConfig = async () => {
    await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    setImportStatus("Config copied to clipboard.");
  };

  const handleImportConfig = () => {
    const parsed = parseSpiritClockConfig(importText);
    if (!parsed) {
      setImportStatus("Invalid JSON — config not applied.");
      return;
    }
    onChange(parsed);
    setImportStatus("Config imported.");
  };

  if (!open) return null;

  return (
    <aside
      ref={panelRef}
      className="dev-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Developer Mode"
    >
      <header className="dev-panel-header">
        <h2 className="dev-panel-title">Developer Mode</h2>
        <button
          ref={closeButtonRef}
          type="button"
          className="dev-close"
          aria-label="Close developer panel"
          onClick={onClose}
        >
          ×
        </button>
      </header>

      <div className="dev-panel-scroll">
        <Section title="Common">
          <SelectControl
            label="Clock Mode"
            value={config.clockMode}
            options={CLOCK_MODE_OPTIONS}
            onChange={(clockMode) => patch({ clockMode })}
          />

          <SelectControl
            label="Palette Mode"
            value={config.paletteMode}
            options={PALETTE_MODE_OPTIONS}
            onChange={(paletteMode) => patch({ paletteMode })}
          />

          {config.paletteMode === "fixed" ? (
            <NumberControl
              label="Fixed Palette Index"
              value={config.fixedPaletteIndex}
              min={0}
              max={23}
              onChange={(fixedPaletteIndex) => patch({ fixedPaletteIndex })}
            />
          ) : null}

          <SelectControl
            label="Weekday Mode"
            value={config.weekdayMode}
            options={WEEKDAY_MODE_OPTIONS}
            onChange={(weekdayMode) => patch({ weekdayMode })}
            hint="Affects atmosphere when weekday palette or subtle shifts are active."
          />

          <SelectControl
            label="Day Atmosphere Mode"
            value={config.dayAtmosphereMode}
            options={DAY_ATMOSPHERE_OPTIONS}
            onChange={(dayAtmosphereMode) => patch({ dayAtmosphereMode })}
          />

          <SegmentedControl
            label="Performance Mode"
            value={config.performanceMode}
            options={PERFORMANCE_OPTIONS}
            onChange={(performanceMode) => patch({ performanceMode })}
          />

          <SelectControl
            label="Reduced Motion"
            value={config.reducedMotion}
            options={REDUCED_MOTION_OPTIONS}
            onChange={(reducedMotion) => patch({ reducedMotion })}
          />

          <SegmentedControl
            label="Glow Intensity"
            value={config.glowIntensity}
            options={GLOW_OPTIONS}
            onChange={(glowIntensity) => patch({ glowIntensity })}
          />

          <SegmentedControl
            label="Clock Size"
            value={config.clockSize}
            options={SIZE_OPTIONS}
            onChange={(clockSize) => patch({ clockSize })}
          />

          <SelectControl
            label="Rotation"
            value={config.rotation}
            options={ROTATION_OPTIONS}
            onChange={(rotation) => patch({ rotation })}
          />

          <SegmentedControl
            label="Sponsor"
            value={config.sponsorVisibility}
            options={SPONSOR_OPTIONS}
            onChange={(sponsorVisibility) => patch({ sponsorVisibility })}
          />
        </Section>

        <Section title="Advanced" collapsible defaultCollapsed>
          <div className="dev-subsection">
            <h4 className="dev-subsection-title">Timing</h4>
            <SelectControl
              label="Cycle Duration"
              value={cyclePreset}
              options={[
                { value: "30000", label: "30s" },
                { value: "60000", label: "60s" },
                { value: "120000", label: "120s" },
                { value: "custom", label: "Custom" },
              ]}
              onChange={(value) => {
                setCyclePreset(value);
                if (value !== "custom") {
                  patch({ cycleDurationMs: Number(value) });
                }
              }}
            />
            {cyclePreset === "custom" ? (
              <NumberControl
                label="Custom Cycle (ms)"
                value={config.cycleDurationMs}
                min={1000}
                step={1000}
                onChange={(cycleDurationMs) => patch({ cycleDurationMs })}
              />
            ) : null}
            <NumberControl
              label="Tick Rate (ms)"
              value={config.tickMs}
              min={16}
              step={1}
              onChange={(tickMs) => patch({ tickMs })}
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
              onChange={(radius) => patch({ radius })}
            />
            <SliderControl
              label="Clip Multiplier"
              value={config.clipMultiplier}
              min={2}
              max={4}
              step={0.1}
              onChange={(clipMultiplier) => patch({ clipMultiplier })}
            />
            <SliderControl
              label="Boundary Offset"
              value={config.boundaryOffset}
              min={0}
              max={30}
              step={1}
              onChange={(boundaryOffset) => patch({ boundaryOffset })}
            />
            {config.rotation === "custom" ? (
              <SliderControl
                label="Rotation Degrees"
                value={config.customRotationDeg}
                min={-90}
                max={90}
                step={1}
                onChange={(customRotationDeg) => patch({ customRotationDeg })}
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
              onChange={(glowBlurStrength) => patch({ glowBlurStrength })}
            />
            <SliderControl
              label="Interior Stroke Width"
              value={config.interiorStrokeWidth}
              min={0.5}
              max={6}
              step={0.1}
              onChange={(interiorStrokeWidth) => patch({ interiorStrokeWidth })}
            />
            <SliderControl
              label="Boundary Stroke Width"
              value={config.boundaryStrokeWidth}
              min={0.5}
              max={10}
              step={0.1}
              onChange={(boundaryStrokeWidth) => patch({ boundaryStrokeWidth })}
            />
            <SliderControl
              label="Aura Opacity"
              value={config.auraOpacity}
              min={0}
              max={2}
              step={0.05}
              onChange={(auraOpacity) => patch({ auraOpacity })}
            />
            <SliderControl
              label="Glow Opacity"
              value={config.glowOpacity}
              min={0}
              max={2}
              step={0.05}
              onChange={(glowOpacity) => patch({ glowOpacity })}
            />
          </div>

          <div className="dev-subsection">
            <h4 className="dev-subsection-title">Debug / Preview</h4>
            <SelectControl
              label="Force Phase"
              value={config.forcePhase}
              options={FORCE_PHASE_OPTIONS}
              onChange={(forcePhase) => patch({ forcePhase })}
            />
            <label className="dev-checkbox">
              <input
                type="checkbox"
                checked={config.showDebugMetadata}
                onChange={(event) =>
                  patch({ showDebugMetadata: event.target.checked })
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
                onClick={() => onChange({ ...DEFAULT_SPIRIT_CLOCK_CONFIG })}
              >
                Reset defaults
              </button>
              <button type="button" className="dev-button" onClick={handleCopyConfig}>
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
              onChange={(event) => setImportText(event.target.value)}
              placeholder='{"clockMode":"living-clock",...}'
            />
            <button type="button" className="dev-button" onClick={handleImportConfig}>
              Import config
            </button>
            {importStatus ? <p className="dev-status">{importStatus}</p> : null}
          </div>
        </Section>
      </div>
    </aside>
  );
}
