-- Function to claim next crawl job atomically
CREATE OR REPLACE FUNCTION claim_next_crawl_job(limit_count INTEGER DEFAULT 1)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  owner_user_id UUID,
  status TEXT,
  attempts INTEGER,
  last_error TEXT,
  locked_at TIMESTAMP WITH TIME ZONE,
  lock_expires_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  UPDATE crawl_jobs
  SET
    status = 'running',
    locked_at = NOW(),
    lock_expires_at = NOW() + INTERVAL '15 minutes',
    attempts = crawl_jobs.attempts + 1,
    started_at = COALESCE(crawl_jobs.started_at, NOW())
  FROM (
    SELECT cj.id
    FROM crawl_jobs cj
    WHERE cj.status = 'pending'
      AND (cj.lock_expires_at IS NULL OR cj.lock_expires_at < NOW())
    ORDER BY cj.created_at ASC
    LIMIT limit_count
    FOR UPDATE SKIP LOCKED
  ) AS to_claim
  WHERE crawl_jobs.id = to_claim.id
  RETURNING
    crawl_jobs.id,
    crawl_jobs.company_id,
    crawl_jobs.owner_user_id,
    crawl_jobs.status,
    crawl_jobs.attempts,
    crawl_jobs.last_error,
    crawl_jobs.locked_at,
    crawl_jobs.lock_expires_at,
    crawl_jobs.started_at,
    crawl_jobs.finished_at,
    crawl_jobs.created_at;
END;
$$ LANGUAGE plpgsql;

