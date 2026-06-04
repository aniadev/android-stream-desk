/**
 * S-UX1 typography tokens.
 *
 * Minimum font-size tiers for dashboard HUD, body, and control labels.
 * Bump these to keep dense UI readable on Windows desktop (1366x768+).
 * Anything smaller than FONT_HUD_MIN_PX must use a dedicated "badge" tier
 * with explicit semantic role (count, status dot, etc.), never body text.
 */

export const FONT_HUD_MIN_PX = 9;
export const FONT_LABEL_MIN_PX = 9;
export const FONT_BODY_MIN_PX = 10;
export const FONT_CONTROL_MIN_PX = 10;

export type FontTier = 'hud' | 'label' | 'body' | 'control';

export const FONT_TIER_PX: Record<FontTier, number> = {
  hud: FONT_HUD_MIN_PX,
  label: FONT_LABEL_MIN_PX,
  body: FONT_BODY_MIN_PX,
  control: FONT_CONTROL_MIN_PX,
};

/**
 * Tailwind class strings exposed for the 3 size tiers.
 * Match these in `style scoped` blocks of consuming views.
 *
 * Order: 2xs (HUD), xs (label/control), sm (body)
 */
export const FONT_TIER_CLASS: Record<FontTier, string> = {
  hud: 'cyber-text-2xs',
  label: 'cyber-text-xs',
  control: 'cyber-text-xs',
  body: 'cyber-text-sm',
};

export function assertFontMin(actualPx: number, tier: FontTier): void {
  const min = FONT_TIER_PX[tier];
  if (actualPx < min) {
    throw new Error(
      `Font size ${actualPx}px below minimum ${min}px for tier "${tier}". ` +
        `Use the FONT_TIER_PX token to keep dashboard readable on Windows.`,
    );
  }
}
