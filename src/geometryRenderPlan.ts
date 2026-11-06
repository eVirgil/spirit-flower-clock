/**
 * Pure Flower geometry visibility plan. Does not depend on partial draw progress,
 * so completed SVG subtrees stay stable throughout each active reveal step.
 */
export function getGeometryRenderPlan(
  stepCount: number,
  activeStepIndex: number,
  isGlowStep: boolean
): { completedCount: number; activeIndex: number | null } {
  const count = Math.max(0, Math.trunc(stepCount));
  if (isGlowStep) return { completedCount: count, activeIndex: null };

  const current = Math.max(0, Math.trunc(activeStepIndex));
  return {
    completedCount: Math.min(current, count),
    activeIndex: current < count ? current : null,
  };
}
