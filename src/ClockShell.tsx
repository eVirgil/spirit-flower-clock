import { useCallback, useEffect, useMemo, useState } from "react";
import FlowerOfLifeClock, { type FlowerClockReadout } from "./FlowerOfLifeClock";
import {
  clockSizeClass,
  configToFlowerProps,
  type SpiritClockConfig,
  type SpiritClockDebugInfo,
} from "./spiritClockConfig";

const TITLE_INTRO_MS = 10_000;

const EMPTY_READOUT: FlowerClockReadout = {
  timeShort: "",
  timeFull: "",
  paletteName: "",
  phaseLabel: "",
  paletteLine: "rgba(255, 255, 255, 0.88)",
  paletteSoft: "rgba(255, 255, 255, 0.55)",
};

type ClockShellProps = {
  config: SpiritClockConfig;
  unlockAnimating?: boolean;
  onDebugInfo?: (info: SpiritClockDebugInfo) => void;
};

export default function ClockShell({
  config,
  unlockAnimating = false,
  onDebugInfo,
}: ClockShellProps) {
  const [readout, setReadout] = useState<FlowerClockReadout>(EMPTY_READOUT);
  const [titleIntro, setTitleIntro] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setTitleIntro(false), TITLE_INTRO_MS);
    return () => window.clearTimeout(id);
  }, []);

  const flowerProps = useMemo(() => configToFlowerProps(config), [config]);
  const sizeClass = useMemo(() => clockSizeClass(config.clockSize), [config.clockSize]);

  const handleReadoutChange = useCallback((next: FlowerClockReadout) => {
    setReadout(next);
  }, []);

  const handleStepChange = useCallback(
    (step: SpiritClockDebugInfo) => {
      onDebugInfo?.(step);
    },
    [onDebugInfo]
  );

  const shellClassName = [
    "flower-clock-shell",
    sizeClass,
    unlockAnimating ? "flower-clock-shell--unlock" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={shellClassName} tabIndex={0}>
      {unlockAnimating ? (
        <div className="dev-unlock-banner" role="status" aria-live="polite">
          DEVELOPER MODE UNLOCKED
        </div>
      ) : null}

      <div
        className={titleIntro ? "clock-title clock-title--intro" : "clock-title"}
        aria-hidden={!titleIntro}
      >
        Spirit Flower Clock
      </div>

      <FlowerOfLifeClock
        {...flowerProps}
        onReadoutChange={handleReadoutChange}
        onStepChange={handleStepChange}
      />

      <div className="clock-readout">
        <div className="clock-time" style={{ color: readout.paletteLine }}>
          <span className="clock-time-layer clock-time-short" aria-hidden="false">
            {readout.timeShort}
          </span>
          <span className="clock-time-layer clock-time-full" aria-hidden="true">
            {readout.timeFull}
          </span>
        </div>

        <div className="clock-meta" style={{ color: readout.paletteSoft }}>
          <span className="clock-meta-layer clock-meta-short" aria-hidden="false">
            {readout.paletteName}
          </span>
          <span className="clock-meta-layer clock-meta-detail" aria-hidden="true">
            {readout.paletteName} · {readout.phaseLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

export { TITLE_INTRO_MS };
