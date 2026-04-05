-- ============================================================
-- TRANSPARENTLY — FIX APPLICATION STATUS CONSTRAINT
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Identify and drop the old check constraint (it's named either 'application_status_check' or 'applications_status_check')
ALTER TABLE applications DROP CONSTRAINT IF EXISTS application_status_check;
ALTER TABLE applications DROP CONSTRAINT IF EXISTS applications_status_check;

-- 2. Add the updated check constraint with all necessary statuses
-- We allow 'under_review', 'rejected', 'selected', and 'approved'
ALTER TABLE applications ADD CONSTRAINT application_status_check 
  CHECK (status IN ('under_review', 'rejected', 'selected', 'approved'));

-- 3. (Optional) Migrate any existing 'pending' statuses to 'under_review' 
-- just in case some were manually inserted or came from old versions
UPDATE applications SET status = 'under_review' WHERE status = 'pending';

-- 4. Verify the change by listing current applications
SELECT id, status FROM applications LIMIT 10;
