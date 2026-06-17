import { useCallback, useState } from "react";
import "./App.css";
import ClockShell from "./ClockShell";
import DeveloperPanel from "./DeveloperPanel";
import SponsorLink from "./SponsorLink";
import {
  DEFAULT_SPIRIT_CLOCK_CONFIG,
  type SpiritClockConfig,
  type SpiritClockDebugInfo,
} from "./spiritClockConfig";
import { useKonamiCode } from "./useKonamiCode";

const UNLOCK_ANIMATION_MS = 1_300;

export default function App() {
  const [config, setConfig] = useState<SpiritClockConfig>(DEFAULT_SPIRIT_CLOCK_CONFIG);
  const [devUnlocked, setDevUnlocked] = useState(false);
  const [devPanelOpen, setDevPanelOpen] = useState(false);
  const [unlockAnimating, setUnlockAnimating] = useState(false);
  const [debugInfo, setDebugInfo] = useState<SpiritClockDebugInfo | null>(null);

  const handleKonamiUnlock = useCallback(() => {
    if (devUnlocked) {
      setDevPanelOpen(true);
      return;
    }

    setDevUnlocked(true);
    setUnlockAnimating(true);
    window.setTimeout(() => {
      setUnlockAnimating(false);
      setDevPanelOpen(true);
    }, UNLOCK_ANIMATION_MS);
  }, [devUnlocked]);

  useKonamiCode(handleKonamiUnlock);

  return (
    <main className="app-shell">
      <ClockShell
        config={config}
        unlockAnimating={unlockAnimating}
        onDebugInfo={setDebugInfo}
      />
      {config.sponsorVisibility === "show" ? <SponsorLink /> : null}
      {devUnlocked ? (
        <DeveloperPanel
          open={devPanelOpen}
          config={config}
          debugInfo={debugInfo}
          onClose={() => setDevPanelOpen(false)}
          onChange={setConfig}
        />
      ) : null}
    </main>
  );
}
