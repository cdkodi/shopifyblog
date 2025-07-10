-- ============================================================================
-- Generation Jobs Persistence - Database Schema
-- Migration: 006_generation_jobs_persistence.sql  
-- Created: 2025-01-27
-- Description: Add database persistence for V2 generation job tracking to 
--              support serverless environments where in-memory storage is lost
-- ============================================================================

-- Create generation_jobs table for persistent job tracking
CREATE TABLE generation_jobs (
    id TEXT PRIMARY KEY, -- job_1234567890_abcd123 format
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    article_id UUID REFERENCES articles(id) ON DELETE SET NULL,
    request_data JSONB NOT NULL, -- Full TopicGenerationRequest
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    
    -- Progress tracking
    phase TEXT NOT NULL DEFAULT 'queued' CHECK (phase IN ('queued', 'analyzing', 'structuring', 'writing', 'optimizing', 'finalizing', 'completed', 'error')),
    percentage INTEGER NOT NULL DEFAULT 0 CHECK (percentage >= 0 AND percentage <= 100),
    current_step TEXT NOT NULL DEFAULT 'Job queued for processing',
    estimated_time_remaining INTEGER, -- seconds
    
    -- Metadata
    provider_used TEXT, -- 'anthropic', 'openai', 'google'
    cost DECIMAL(10,6), -- Generation cost in USD
    word_count INTEGER,
    seo_score INTEGER,
    
    -- Generation result
    result_data JSONB, -- V2GenerationResult when completed
    error_message TEXT,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    -- Retry logic
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_error TEXT
);

-- Create indexes for efficient querying
CREATE INDEX idx_generation_jobs_status ON generation_jobs(status);
CREATE INDEX idx_generation_jobs_phase ON generation_jobs(phase);
CREATE INDEX idx_generation_jobs_created_at ON generation_jobs(created_at);
CREATE INDEX idx_generation_jobs_topic_id ON generation_jobs(topic_id);
CREATE INDEX idx_generation_jobs_article_id ON generation_jobs(article_id);

-- Create function to automatically update last_updated timestamp
CREATE OR REPLACE FUNCTION update_generation_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER trigger_generation_jobs_updated_at
    BEFORE UPDATE ON generation_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_generation_jobs_updated_at();

-- Create view for active jobs with enhanced metadata
CREATE VIEW active_generation_jobs AS
SELECT 
    gj.*,
    t.topic_title,
    t.keywords as topic_keywords,
    a.title as article_title,
    a.status as article_status,
    EXTRACT(EPOCH FROM (NOW() - gj.created_at)) as age_seconds,
    CASE 
        WHEN gj.started_at IS NOT NULL THEN EXTRACT(EPOCH FROM (NOW() - gj.started_at))
        ELSE NULL 
    END as processing_duration_seconds
FROM generation_jobs gj
LEFT JOIN topics t ON gj.topic_id = t.id
LEFT JOIN articles a ON gj.article_id = a.id
WHERE gj.status IN ('pending', 'processing')
ORDER BY gj.created_at ASC;

-- Create view for job statistics
CREATE VIEW generation_job_stats AS
SELECT 
    COUNT(*) as total_jobs,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_jobs,
    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_jobs,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
    COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_jobs,
    AVG(CASE WHEN completed_at IS NOT NULL AND started_at IS NOT NULL 
        THEN EXTRACT(EPOCH FROM (completed_at - started_at)) 
        ELSE NULL END) as avg_processing_time_seconds,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 hour' THEN 1 END) as jobs_last_hour,
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '1 day' THEN 1 END) as jobs_last_day
FROM generation_jobs;

-- Function to clean up old completed/failed jobs (older than 24 hours)
CREATE OR REPLACE FUNCTION cleanup_old_generation_jobs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM generation_jobs 
    WHERE status IN ('completed', 'failed', 'cancelled')
    AND completed_at < NOW() - INTERVAL '24 hours';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get job progress with error handling
CREATE OR REPLACE FUNCTION get_job_progress(job_id TEXT)
RETURNS JSONB AS $$
DECLARE
    job_data JSONB;
BEGIN
    SELECT to_jsonb(gj.*) INTO job_data
    FROM generation_jobs gj
    WHERE gj.id = job_id;
    
    IF job_data IS NULL THEN
        RETURN jsonb_build_object(
            'error', 'Job not found',
            'jobId', job_id,
            'timestamp', NOW()
        );
    END IF;
    
    RETURN job_data;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON generation_jobs TO authenticated;
GRANT SELECT ON active_generation_jobs TO authenticated;
GRANT SELECT ON generation_job_stats TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_generation_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION get_job_progress(TEXT) TO authenticated;

-- Set security policies
ALTER TABLE generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER VIEW active_generation_jobs SET (security_invoker = true);
ALTER VIEW generation_job_stats SET (security_invoker = true);

-- Create RLS policy for authenticated users
CREATE POLICY "Users can manage their generation jobs" ON generation_jobs
    FOR ALL USING (true)
    WITH CHECK (true);

-- Log completion
INSERT INTO schema_migrations (version, description, applied_at) 
VALUES ('006', 'Generation jobs persistence for V2 workflow', NOW())
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'generation_jobs';
-- SELECT * FROM generation_job_stats;
-- SELECT cleanup_old_generation_jobs(); -- Test cleanup function
-- SELECT get_job_progress('test_job_id'); -- Test progress function 