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
    if (!devUnlocked) {
      setDevUnlocked(true);
      setUnlockAnimating(true);
      window.setTimeout(() => {
        setUnlockAnimating(false);
        setDevPanelOpen(true);
      }, UNLOCK_ANIMATION_MS);
      return;
    }
    setDevPanelOpen(true);
  }, [devUnlocked]);

  useKonamiCode(handleKonamiUnlock);

  const handleConfigPatch = useCallback((partial: Partial<SpiritClockConfig>) => {
    setConfig((current) => ({ ...current, ...partial }));
  }, []);

  const handleConfigReplace = useCallback((next: SpiritClockConfig) => {
    setConfig(next);
  }, []);

  const handleDebugInfo = useCallback((info: SpiritClockDebugInfo) => {
    setDebugInfo((current) => {
      if (
        current &&
        current.stepIndex === info.stepIndex &&
        current.totalSteps === info.totalSteps &&
        current.label === info.label &&
        current.paletteName === info.paletteName &&
        current.cycleIndex === info.cycleIndex
      ) {
        return current;
      }
      return info;
    });
  }, []);

  const handleCloseDevPanel = useCallback(() => {
    setDevPanelOpen(false);
  }, []);

  return (
    <main className="app-shell">
      <ClockShell
        config={config}
        unlockAnimating={unlockAnimating}
        onDebugInfo={config.showDebugMetadata ? handleDebugInfo : undefined}
      />
      {config.sponsorVisibility === "show" ? <SponsorLink /> : null}
      {devUnlocked ? (
        <DeveloperPanel
          open={devPanelOpen}
          config={config}
          debugInfo={config.showDebugMetadata ? debugInfo : null}
          onClose={handleCloseDevPanel}
          onPatch={handleConfigPatch}
          onReplace={handleConfigReplace}
        />
      ) : null}
    </main>
  );
}
