/**
 * The final pre-reset celebration should read visibly brighter without adding
 * extra animated SVG elements or increasing filter radius/compositing cost.
 *
 * Gain is applied to the completion-layer opacity (bounded to [0, 1]) and
 * the existing intense blur filter's alpha channel. The blur gain remains
 * effective when the completion-layer opacity reaches its SVG limit.
 */
export const FINAL_GLOW_BOOST = 1.35;
export const INTENSE_GLOW_FILTER_ALPHA = 1.5 * FINAL_GLOW_BOOST;

function boundedMultiplier(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(2, value)) : 1;
}

export function completionGlowOpacity(
  progress: number,
  opacityMultiplier: number,
  intensityMultiplier: number
): number {
  const phase = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const originalOpacity = 0.2 + phase * 0.7;

  return Math.min(
    1,
    originalOpacity *
      boundedMultiplier(opacityMultiplier) *
      boundedMultiplier(intensityMultiplier) *
      FINAL_GLOW_BOOST
  );
}
