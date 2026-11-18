-- ============================================================================
-- Migration 003: User UI/UX Preferences Persistence (Supabase + ManStat-Modern)
-- Compliance: PDPA 2562, Multi-device User State Sync
-- ============================================================================

-- 1. Add preferences column to public.staff if not exists
ALTER TABLE IF EXISTS public.staff 
ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{"theme_mode":"auto","preferred_view":"table","compact_mode":false,"mask_citizen_id":true}'::jsonb;

COMMENT ON COLUMN public.staff.preferences IS 'User personalized UI/UX settings (theme_mode, preferred_view, compact_mode, mask_citizen_id)';

-- 2. Create standalone user_settings table for decoupled preference sync if needed
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    preferences JSONB NOT NULL DEFAULT '{"theme_mode":"auto","preferred_view":"table","compact_mode":false,"mask_citizen_id":true}'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Policies for user_settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Users can manage their own settings"
    ON public.user_settings
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enable Realtime for user_settings (optional)
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_settings;
