import { useCallback, useEffect, useState } from "react";
import FlowerOfLifeClock, {
  DEFAULT_CLOCK_CONFIG,
  type FlowerClockReadout,
} from "./FlowerOfLifeClock";

const TITLE_INTRO_MS = 10_000;

const EMPTY_READOUT: FlowerClockReadout = {
  timeShort: "",
  timeFull: "",
  paletteName: "",
  phaseLabel: "",
  paletteLine: "rgba(255, 255, 255, 0.88)",
  paletteSoft: "rgba(255, 255, 255, 0.55)",
};

export default function ClockShell() {
  const [readout, setReadout] = useState<FlowerClockReadout>(EMPTY_READOUT);
  const [titleIntro, setTitleIntro] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setTitleIntro(false), TITLE_INTRO_MS);
    return () => window.clearTimeout(id);
  }, []);

  const handleReadoutChange = useCallback((next: FlowerClockReadout) => {
    setReadout(next);
  }, []);

  return (
    <div className="flower-clock-shell" tabIndex={0}>
      <div
        className={titleIntro ? "clock-title clock-title--intro" : "clock-title"}
        aria-hidden={!titleIntro}
      >
        Spirit Flower Clock
      </div>

      <FlowerOfLifeClock
        {...DEFAULT_CLOCK_CONFIG}
        showStatus={false}
        onReadoutChange={handleReadoutChange}
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
