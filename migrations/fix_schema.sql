-- ============================================================
-- TRANSPARENTLY — DATABASE FIX MIGRATION
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ── 1. STUDENT_PROFILES TABLE ───────────────────────────────
-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS student_profiles (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid UNIQUE NOT NULL,
  resume_url          text,
  resume_text         text,
  resume_score        integer DEFAULT 0,
  contact_score       integer DEFAULT 0,
  experience_score    integer DEFAULT 0,
  keyword_score       integer DEFAULT 0,
  skill_coverage_score integer DEFAULT 0,
  strengths           text[] DEFAULT '{}',
  weak_areas          text[] DEFAULT '{}',
  improvement_tips    text[] DEFAULT '{}',
  critical_issue      text,
  updated_at          timestamptz DEFAULT now()
);

-- Add missing columns if table already exists (safe to run multiple times)
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS resume_text         text;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS contact_score       integer DEFAULT 0;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS experience_score    integer DEFAULT 0;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS keyword_score       integer DEFAULT 0;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS skill_coverage_score integer DEFAULT 0;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS strengths           text[] DEFAULT '{}';
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS weak_areas          text[] DEFAULT '{}';
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS improvement_tips    text[] DEFAULT '{}';
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS critical_issue      text;
ALTER TABLE student_profiles ADD COLUMN IF NOT EXISTS updated_at          timestamptz DEFAULT now();

-- ── 2. SKILLS TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS skills (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL,
  skill_name  text NOT NULL
);

-- ── 3. DISABLE RLS ──────────────────────────────────────────
-- CRITICAL: App uses a custom users table, NOT Supabase Auth.
-- auth.uid() is always null → RLS blocks all writes.
-- Disabling RLS allows the anon key to read/write freely.
ALTER TABLE student_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE skills           DISABLE ROW LEVEL SECURITY;
ALTER TABLE users            DISABLE ROW LEVEL SECURITY;

-- ── 4. STORAGE BUCKET (resumes) ─────────────────────────────
-- If the "resumes" bucket doesn't exist yet, create it as public.
-- If it already exists, just make sure it's public.
INSERT INTO storage.buckets (id, name, public)
VALUES ('resumes', 'resumes', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow all storage operations on the resumes bucket
DROP POLICY IF EXISTS "Allow public read"   ON storage.objects;
DROP POLICY IF EXISTS "Allow upload resumes" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete resumes" ON storage.objects;

CREATE POLICY "Allow public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resumes');

CREATE POLICY "Allow upload resumes"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'resumes');

CREATE POLICY "Allow delete resumes"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'resumes');

CREATE POLICY "Allow update resumes"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'resumes');

-- ── 5. VERIFY ───────────────────────────────────────────────
-- Run this SELECT after the migration to confirm columns exist:
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'student_profiles'
ORDER BY ordinal_position;
