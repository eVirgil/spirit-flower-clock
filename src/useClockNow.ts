import { useEffect, useState } from "react";

/**
 * Wall time is the displayed value; monotonic time throttles refreshes.
 * Visibility recovery always refreshes immediately, including after sleep.
 */
export function useClockNow(tickMs: number, pauseWhenHidden: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    let rafId: number | null = null;
    let timeoutId: number | null = null;
    let active = true;
    let lastTick = performance.now();

    const schedule = () => {
      if (!active) return;
      if ((pauseWhenHidden && document.visibilityState === "hidden") || tickMs >= 64) {
        timeoutId = window.setTimeout(tick, pauseWhenHidden && document.visibilityState === "hidden" ? 1_000 : tickMs);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };

    const tick = () => {
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
      if (document.visibilityState === "visible") {
        setNow(Date.now());
        lastTick = performance.now();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    schedule();
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (rafId !== null) cancelAnimationFrame(rafId);
      if (timeoutId !== null) window.clearTimeout(timeoutId);
    };
  }, [tickMs, pauseWhenHidden]);
  return now;
}
