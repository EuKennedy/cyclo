/**
 * Foundational cycle constants — the single source of truth for the model and
 * prediction engine. Every number here is derived from the verified clinical
 * research in docs/RESEARCH-SPEC.md. Never hardcode these values inline.
 */
export const CYCLE = {
  /** Population fallback mean when a user's history is too sparse to personalize. */
  POP_MEAN_CYCLE: 29,
  /** Classic default shown before any history exists (a median, not a rule). */
  DEFAULT_CYCLE_LENGTH: 28,
  /** Default bleeding duration in days. */
  DEFAULT_PERIOD_LENGTH: 5,
  /** Default luteal-phase length; relatively (not perfectly) constant. */
  LUTEAL_LENGTH: 14,
  /** Clamp range for a per-user calibrated luteal length (LH/BBT-derived). */
  LUTEAL_MIN: 9,
  LUTEAL_MAX: 17,
  /** Fertile window: sperm survive up to ~5 days before ovulation… */
  FERTILE_LEAD: 5,
  /** …and the strict Wilcox 6-day window ends on ovulation day. */
  FERTILE_TAIL: 0,
  /** Recent cycles to weight when averaging (3–12 acceptable). */
  PREDICT_WINDOW: 6,
  /** Cycles of history required before a personalized prediction is shown. */
  MIN_DATA: 2,
  /** Bayesian prior strength (pseudo-cycles) for shrinkage toward the population mean. */
  SHRINK_K: 3,
  /** Recency weight for the exponential moving average (higher = more reactive). */
  EWMA_ALPHA: 0.5,
  /** ACOG adult "normal" band, used only for gentle "consider a clinician" nudges. */
  NORMAL_CYCLE_RANGE: [21, 35] as const,
  /** Adolescent band (cycles run longer and more variable near menarche). */
  ADOLESCENT_RANGE: [21, 45] as const,
  /** Typical bleeding-length band. */
  PERIOD_LENGTH_RANGE: [2, 8] as const,
  /** Wide biological clamp used ONLY to reject impossible outliers before averaging. */
  BIO_HARD_CLAMP: [15, 60] as const,
  /** z for a ~95% prediction interval (Normal approximation). */
  Z_95: 1.96,
} as const;
