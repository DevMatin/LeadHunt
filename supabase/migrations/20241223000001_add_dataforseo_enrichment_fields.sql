-- Add DataForSEO enrichment fields to companies table
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS dataforseo_enrichment_status TEXT DEFAULT 'pending' 
    CHECK (dataforseo_enrichment_status IN ('pending', 'enriched', 'failed', 'skipped')),
  ADD COLUMN IF NOT EXISTS dataforseo_error_reason TEXT,
  ADD COLUMN IF NOT EXISTS dataforseo_organization_id TEXT,
  ADD COLUMN IF NOT EXISTS dataforseo_enriched_at TIMESTAMP WITH TIME ZONE;

-- Create index for enrichment status queries
CREATE INDEX IF NOT EXISTS companies_dataforseo_enrichment_status_idx 
  ON companies(dataforseo_enrichment_status);
