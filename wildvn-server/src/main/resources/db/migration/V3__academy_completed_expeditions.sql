-- Preserve the complete client Academy state across devices.
ALTER TABLE academy_progress
    ADD COLUMN IF NOT EXISTS completed_expeditions JSONB NOT NULL DEFAULT '[]'::jsonb;
