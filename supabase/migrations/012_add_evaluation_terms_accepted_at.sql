-- ============================================================================
-- Migration 012: Add Evaluation Agreement Acceptance Timestamp (Audit Trail)
-- Table: public.performance_evaluations
-- ============================================================================
-- Records the exact timestamp when an evaluatee accepts the pre-evaluation
-- agreement & PDPA consent for a specific fiscal year and evaluation round.
-- Idempotent and safe to re-run.
-- ============================================================================

ALTER TABLE public.performance_evaluations
    ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.performance_evaluations.terms_accepted_at
    IS 'Timestamp when the evaluatee accepted the pre-evaluation agreement for this fiscal round (ว 15/2561 & PDPA audit trail).';
