import { useEffect, useState } from "react";

/**
 * Wall time is the displayed value; monotonic time throttles refreshes.
 * No background timer is retained when pauseWhenHidden is enabled.
 * Visibility recovery refreshes immediately, including after sleep.
 */
export function useClockNow(tickMs: number, pauseWhenHidden: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let rafId: number | null = null;
    let timeoutId: number | null = null;
    let active = true;
    let lastTick = performance.now();

    const clearScheduled = () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const schedule = () => {
      // Page visibility events resume the loop. No polling while suspended.
      if (!active || (pauseWhenHidden && document.visibilityState === "hidden")) return;
      if (tickMs >= 64) {
        timeoutId = window.setTimeout(tick, tickMs);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    const tick = () => {
      rafId = null;
      timeoutId = null;
      if (!active) return;
      if (!pauseWhenHidden || document.visibilityState !== "hidden") {
        const elapsed = performance.now() - lastTick;
        if (elapsed >= tickMs || elapsed < 0) {
          setNow(Date.now());
          lastTick = performance.now();
        }
      }
      schedule();
    };

    const onVisibilityChange = () => {
      if (!active) return;
      if (pauseWhenHidden && document.visibilityState === "hidden") {
        clearScheduled();
        return;
      }
      if (document.visibilityState === "visible") {
        setNow(Date.now());
        lastTick = performance.now();
        if (pauseWhenHidden) {
          clearScheduled();
          schedule();
        }
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    schedule();
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearScheduled();
    };
  }, [tickMs, pauseWhenHidden]);
  return now;
}
