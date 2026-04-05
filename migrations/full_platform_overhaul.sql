-- ============================================================
-- TRANSPARENTLY — FULL PLATFORM OVERHAUL MIGRATION
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. NORMALIZE SKILLS TABLE — prevent duplicate skills per user
-- Add unique constraint on (user_id, skill_name) to prevent duplicates
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'skills_user_skill_unique'
  ) THEN
    ALTER TABLE skills ADD CONSTRAINT skills_user_skill_unique UNIQUE (user_id, skill_name);
  END IF;
END $$;

-- 2. ADD INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_skill_name ON skills(skill_name);
CREATE INDEX IF NOT EXISTS idx_applications_student_id ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_job_id ON applications(job_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_student_profiles_user_id ON student_profiles(user_id);

-- 3. UPDATE APPLICATION STATUS CONSTRAINT for 5-stage pipeline
ALTER TABLE applications DROP CONSTRAINT IF EXISTS application_status_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE applications ADD CONSTRAINT application_status_check 
  CHECK (status IN ('applied', 'screened', 'shortlisted', 'interview', 'selected', 'rejected'));

-- 4. MIGRATE EXISTING STATUS VALUES
UPDATE applications SET status = 'screened' WHERE status = 'under_review';
UPDATE applications SET status = 'applied' WHERE status = 'pending';
UPDATE applications SET status = 'selected' WHERE status = 'approved';

-- 5. CREATE RECRUITER NOTES TABLE
CREATE TABLE IF NOT EXISTS recruiter_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recruiter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for recruiter_notes
CREATE INDEX IF NOT EXISTS idx_recruiter_notes_candidate ON recruiter_notes(candidate_id);
CREATE INDEX IF NOT EXISTS idx_recruiter_notes_application ON recruiter_notes(application_id);

-- RLS for recruiter_notes
ALTER TABLE recruiter_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Recruiters can manage notes" ON recruiter_notes;
CREATE POLICY "Recruiters can manage notes" ON recruiter_notes 
  FOR ALL USING (true) WITH CHECK (true);

-- 6. ADD EXPERIENCE_SUMMARY COLUMN to student_profiles if missing
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS experience_summary TEXT;

-- 7. VERIFY: List current table structures
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'skills' ORDER BY ordinal_position;

SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'applications' ORDER BY ordinal_position;

SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'recruiter_notes' ORDER BY ordinal_position;
