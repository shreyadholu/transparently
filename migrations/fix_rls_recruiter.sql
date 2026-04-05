-- Disable RLS on recruiter tables to allow anon access (since app uses custom users table)
ALTER TABLE applications DISABLE ROW LEVEL SECURITY;
ALTER TABLE application_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE jobs DISABLE ROW LEVEL SECURITY;

-- Ensure public access to application_feedback for student to read feedback
DROP POLICY IF EXISTS "Allow public read" ON application_feedback;
CREATE POLICY "Allow public read" ON application_feedback FOR SELECT USING (true);

-- Ensure public access to applications for student to see their own
DROP POLICY IF EXISTS "Allow public read" ON applications;
CREATE POLICY "Allow public read" ON applications FOR SELECT USING (true);
