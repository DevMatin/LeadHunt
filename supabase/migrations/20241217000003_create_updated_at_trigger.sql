-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for searches table
CREATE TRIGGER update_searches_updated_at
  BEFORE UPDATE ON searches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for companies table
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


