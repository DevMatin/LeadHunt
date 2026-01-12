-- Add JSONB column to store all DataForSEO response data
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS dataforseo_full_data JSONB;

-- Create index for JSONB queries
CREATE INDEX IF NOT EXISTS companies_dataforseo_full_data_idx 
  ON companies USING GIN (dataforseo_full_data);

-- Add individual fields for commonly used data
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS dataforseo_category_ids TEXT[],
  ADD COLUMN IF NOT EXISTS dataforseo_place_id TEXT,
  ADD COLUMN IF NOT EXISTS dataforseo_cid TEXT,
  ADD COLUMN IF NOT EXISTS dataforseo_feature_id TEXT,
  ADD COLUMN IF NOT EXISTS dataforseo_latitude NUMERIC,
  ADD COLUMN IF NOT EXISTS dataforseo_longitude NUMERIC,
  ADD COLUMN IF NOT EXISTS dataforseo_rating_value NUMERIC,
  ADD COLUMN IF NOT EXISTS dataforseo_rating_votes_count INTEGER,
  ADD COLUMN IF NOT EXISTS dataforseo_price_level TEXT,
  ADD COLUMN IF NOT EXISTS dataforseo_is_claimed BOOLEAN,
  ADD COLUMN IF NOT EXISTS dataforseo_logo TEXT,
  ADD COLUMN IF NOT EXISTS dataforseo_main_image TEXT,
  ADD COLUMN IF NOT EXISTS dataforseo_total_photos INTEGER,
  ADD COLUMN IF NOT EXISTS dataforseo_city TEXT,
  ADD COLUMN IF NOT EXISTS dataforseo_zip TEXT,
  ADD COLUMN IF NOT EXISTS dataforseo_country_code TEXT;

-- Create indexes for commonly queried fields
CREATE INDEX IF NOT EXISTS companies_dataforseo_place_id_idx 
  ON companies(dataforseo_place_id);
CREATE INDEX IF NOT EXISTS companies_dataforseo_cid_idx 
  ON companies(dataforseo_cid);
CREATE INDEX IF NOT EXISTS companies_dataforseo_rating_value_idx 
  ON companies(dataforseo_rating_value);
CREATE INDEX IF NOT EXISTS companies_dataforseo_city_idx 
  ON companies(dataforseo_city);
CREATE INDEX IF NOT EXISTS companies_dataforseo_country_code_idx 
  ON companies(dataforseo_country_code);
