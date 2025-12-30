-- Add featured_expires_at column to ads table
ALTER TABLE ads 
ADD COLUMN IF NOT EXISTS featured_expires_at TIMESTAMPTZ;

-- Create an index for performance when querying active featured ads
CREATE INDEX IF NOT EXISTS idx_ads_featured_expires_at ON ads(featured_expires_at);

-- Comments
COMMENT ON COLUMN ads.featured_expires_at IS 'Date when the featured status expires';
