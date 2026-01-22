-- ============================================
-- Migration: Add updated_at column to matches table
-- Date: 2026-01-21
-- Description: Fix Supabase Realtime error "Could not find the 'updated_at' column"
-- ============================================

-- Add updated_at column if it doesn't exist
ALTER TABLE public.matches 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing rows to have a value
UPDATE public.matches SET updated_at = COALESCE(created_at, NOW()) WHERE updated_at IS NULL;

-- Create trigger to auto-update the column
DROP TRIGGER IF EXISTS update_matches_updated_at ON public.matches;
CREATE TRIGGER update_matches_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure matches is in the realtime publication (ignore error if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE matches;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
