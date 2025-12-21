-- Create searches table
CREATE TABLE IF NOT EXISTS searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  industry TEXT NOT NULL,
  location TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS searches_user_id_idx ON searches(user_id);

-- Enable RLS
ALTER TABLE searches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for searches
CREATE POLICY "Users can view own searches"
  ON searches FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own searches"
  ON searches FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own searches"
  ON searches FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own searches"
  ON searches FOR DELETE
  USING (auth.uid() = user_id);



