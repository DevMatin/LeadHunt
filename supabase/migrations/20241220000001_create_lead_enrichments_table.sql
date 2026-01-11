-- Create match_quality ENUM type
CREATE TYPE match_quality AS ENUM ('exact', 'mismatch', 'unknown');

-- Create lead_enrichments table
CREATE TABLE IF NOT EXISTS lead_enrichments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  input_company_name TEXT NOT NULL,
  match_quality match_quality NOT NULL,
  apollo_person_id TEXT,
  person_name TEXT,
  person_title TEXT,
  organization_name TEXT,
  organization_domain TEXT,
  raw JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique index for duplicate checks
CREATE UNIQUE INDEX IF NOT EXISTS lead_enrichments_email_company_unique_idx 
  ON lead_enrichments(email, input_company_name);

-- Create index for email lookups
CREATE INDEX IF NOT EXISTS lead_enrichments_email_idx 
  ON lead_enrichments(email);



