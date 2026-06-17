import { useEffect } from "react";

const KONAMI_SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "KeyB",
  "KeyA",
] as const;

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

export function useKonamiCode(onUnlock: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    let position = 0;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;

      const expected = KONAMI_SEQUENCE[position];
      if (event.code === expected) {
        position += 1;
        if (position >= KONAMI_SEQUENCE.length) {
          position = 0;
          onUnlock();
        }
        return;
      }

      position = event.code === KONAMI_SEQUENCE[0] ? 1 : 0;
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onUnlock]);
}
