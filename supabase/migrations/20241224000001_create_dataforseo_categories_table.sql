-- Create dataforseo_categories table
CREATE TABLE IF NOT EXISTS dataforseo_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name TEXT NOT NULL UNIQUE,
  business_count INTEGER NOT NULL,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for category lookups
CREATE INDEX IF NOT EXISTS dataforseo_categories_category_name_idx 
  ON dataforseo_categories(category_name);

-- Create index for business count sorting
CREATE INDEX IF NOT EXISTS dataforseo_categories_business_count_idx 
  ON dataforseo_categories(business_count DESC);

-- Enable RLS
ALTER TABLE dataforseo_categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can view categories" ON dataforseo_categories;
DROP POLICY IF EXISTS "Authenticated users can sync categories" ON dataforseo_categories;
DROP POLICY IF EXISTS "Authenticated users can update categories" ON dataforseo_categories;

-- RLS Policy: Allow all authenticated users to read categories
CREATE POLICY "Authenticated users can view categories"
  ON dataforseo_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- RLS Policy: Allow authenticated users to insert/update categories
CREATE POLICY "Authenticated users can sync categories"
  ON dataforseo_categories FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update categories"
  ON dataforseo_categories FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);
