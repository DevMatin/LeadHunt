-- Add owner/manager fields to companies table
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS owner_first_name TEXT,
  ADD COLUMN IF NOT EXISTS owner_last_name TEXT,
  ADD COLUMN IF NOT EXISTS owner_email TEXT,
  ADD COLUMN IF NOT EXISTS owner_title TEXT,
  ADD COLUMN IF NOT EXISTS owner_enriched_at TIMESTAMP WITH TIME ZONE;

-- Create index for owner email queries
CREATE INDEX IF NOT EXISTS companies_owner_email_idx 
  ON companies(owner_email) WHERE owner_email IS NOT NULL;



