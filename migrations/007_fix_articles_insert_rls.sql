-- Migration 007: Fix Articles Table RLS Policies for INSERT Operations
-- Issue: V2 generation fails to create articles due to RLS policy violations
-- Error: 'new row violates row-level security policy for table "articles"'

-- Drop existing RLS policies if they exist
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON articles;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON articles;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON articles;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON articles;

-- Create comprehensive RLS policies for articles table
-- Allow authenticated users to read all articles
CREATE POLICY "Enable read access for authenticated users"
ON articles FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert articles
CREATE POLICY "Enable insert access for authenticated users"
ON articles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to update articles
CREATE POLICY "Enable update access for authenticated users"
ON articles FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Allow authenticated users to delete articles
CREATE POLICY "Enable delete access for authenticated users"
ON articles FOR DELETE
TO authenticated
USING (auth.uid() IS NOT NULL);

-- Ensure RLS is enabled on the articles table
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;

-- Also fix any potential issues with generation_jobs table
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON generation_jobs;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON generation_jobs;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON generation_jobs;

CREATE POLICY "Enable read access for authenticated users"
ON generation_jobs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for authenticated users"
ON generation_jobs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Enable update access for authenticated users"
ON generation_jobs FOR UPDATE
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;

-- Verify policies were created
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('articles', 'generation_jobs')
ORDER BY tablename, policyname; 