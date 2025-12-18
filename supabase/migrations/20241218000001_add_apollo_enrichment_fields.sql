-- Add Apollo enrichment fields to companies table
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS apollo_enrichment_status TEXT DEFAULT 'pending' 
    CHECK (apollo_enrichment_status IN ('pending', 'enriched', 'failed', 'skipped')),
  ADD COLUMN IF NOT EXISTS apollo_error_reason TEXT,
  ADD COLUMN IF NOT EXISTS apollo_organization_id TEXT,
  ADD COLUMN IF NOT EXISTS apollo_enriched_at TIMESTAMP WITH TIME ZONE;

-- Create index for enrichment status queries
CREATE INDEX IF NOT EXISTS companies_apollo_enrichment_status_idx 
  ON companies(apollo_enrichment_status);

