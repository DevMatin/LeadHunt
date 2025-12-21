-- Add email quality fields to companies table
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS email_quality TEXT,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN,
  ADD COLUMN IF NOT EXISTS email_personal BOOLEAN;

-- Create index for email quality queries
CREATE INDEX IF NOT EXISTS companies_email_quality_idx 
  ON companies(email_quality) WHERE email_quality IS NOT NULL;

CREATE INDEX IF NOT EXISTS companies_email_verified_idx 
  ON companies(email_verified) WHERE email_verified IS NOT NULL;


