-- Create dataforseo_locations table
CREATE TABLE IF NOT EXISTS dataforseo_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_name TEXT NOT NULL,
  country_iso_code TEXT NOT NULL,
  business_count INTEGER NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(location_name, country_iso_code)
);

-- Create index for location lookups
CREATE INDEX IF NOT EXISTS dataforseo_locations_location_name_idx 
  ON dataforseo_locations(location_name);

-- Create index for country lookups
CREATE INDEX IF NOT EXISTS dataforseo_locations_country_iso_code_idx 
  ON dataforseo_locations(country_iso_code);

-- Create index for business count sorting
CREATE INDEX IF NOT EXISTS dataforseo_locations_business_count_idx 
  ON dataforseo_locations(business_count DESC);

-- Enable RLS
ALTER TABLE dataforseo_locations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view locations" ON dataforseo_locations;
DROP POLICY IF EXISTS "Authenticated users can sync locations" ON dataforseo_locations;
DROP POLICY IF EXISTS "Authenticated users can update locations" ON dataforseo_locations;

-- RLS Policy: Allow all authenticated users to read locations
CREATE POLICY "Authenticated users can view locations"
  ON dataforseo_locations FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Policy: Allow authenticated users to insert/update locations
CREATE POLICY "Authenticated users can sync locations"
  ON dataforseo_locations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update locations"
  ON dataforseo_locations FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
