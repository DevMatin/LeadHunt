ALTER TABLE crawl_jobs
ADD COLUMN IF NOT EXISTS skip_reason_code TEXT;

CREATE INDEX IF NOT EXISTS crawl_jobs_skip_reason_code_idx ON crawl_jobs(skip_reason_code);

COMMENT ON COLUMN crawl_jobs.skip_reason_code IS 'Reason code for skipped jobs (e.g., HTTP_403, CAPTCHA, ROBOTS_TXT, NO_WEBSITE, SHUTDOWN_50_PERCENT)';

