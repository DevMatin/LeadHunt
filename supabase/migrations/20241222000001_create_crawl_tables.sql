-- Create crawl_jobs table
CREATE TABLE IF NOT EXISTS crawl_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'done', 'failed', 'skipped')),
  attempts INTEGER DEFAULT 0,
  last_error TEXT,
  locked_at TIMESTAMP WITH TIME ZONE,
  lock_expires_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for crawl_jobs
CREATE INDEX IF NOT EXISTS crawl_jobs_company_id_idx ON crawl_jobs(company_id);
CREATE INDEX IF NOT EXISTS crawl_jobs_owner_user_id_idx ON crawl_jobs(owner_user_id);
CREATE INDEX IF NOT EXISTS crawl_jobs_status_idx ON crawl_jobs(status);
CREATE INDEX IF NOT EXISTS crawl_jobs_status_created_at_idx ON crawl_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS crawl_jobs_company_id_finished_at_idx ON crawl_jobs(company_id, finished_at DESC);

-- Create company_emails table
CREATE TABLE IF NOT EXISTS company_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  source_url TEXT NOT NULL,
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, email, source_url)
);

-- Create indexes for company_emails
CREATE INDEX IF NOT EXISTS company_emails_company_id_idx ON company_emails(company_id);
CREATE INDEX IF NOT EXISTS company_emails_owner_user_id_idx ON company_emails(owner_user_id);
CREATE INDEX IF NOT EXISTS company_emails_email_idx ON company_emails(email);

-- Enable RLS
ALTER TABLE crawl_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_emails ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crawl_jobs
CREATE POLICY "Users can view own crawl_jobs"
  ON crawl_jobs FOR SELECT
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can insert own crawl_jobs"
  ON crawl_jobs FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update own crawl_jobs"
  ON crawl_jobs FOR UPDATE
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete own crawl_jobs"
  ON crawl_jobs FOR DELETE
  USING (auth.uid() = owner_user_id);

-- RLS Policies for company_emails
CREATE POLICY "Users can view own company_emails"
  ON company_emails FOR SELECT
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can insert own company_emails"
  ON company_emails FOR INSERT
  WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update own company_emails"
  ON company_emails FOR UPDATE
  USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete own company_emails"
  ON company_emails FOR DELETE
  USING (auth.uid() = owner_user_id);

