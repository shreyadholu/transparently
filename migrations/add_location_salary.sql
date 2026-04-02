-- ============================================================
-- TRANSPARENTLY — ADD LOCATION AND SALARY MIGRATION
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Safely add new columns to the `jobs` table if they don't already exist.
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'location') THEN
        ALTER TABLE jobs ADD COLUMN location text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'salary_min') THEN
        ALTER TABLE jobs ADD COLUMN salary_min integer;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'salary_max') THEN
        ALTER TABLE jobs ADD COLUMN salary_max integer;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'created_by') THEN
        ALTER TABLE jobs ADD COLUMN created_by uuid;
    END IF;
END $$;

-- Verify changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'jobs' 
ORDER BY ordinal_position;
