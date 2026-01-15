-- ============================================================
-- Phase 3: Tournament Creation Refactor & News System
-- ============================================================

-- ============================================================
-- 1. Tournament Table Updates
-- ============================================================

-- Add new columns for enhanced tournament customization
ALTER TABLE tournaments 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS cashprize_total DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS cashprize_distribution JSONB, -- Example: {"1": 500, "2": 300, "3": 200}
ADD COLUMN IF NOT EXISTS sponsors JSONB, -- Example: [{"name": "Sponsor 1", "logo_url": "sponsor1.jpg"}]
ADD COLUMN IF NOT EXISTS stream_urls JSONB; -- Example: {"twitch": "url", "youtube": "url"}

-- Remove character limit on rules field
ALTER TABLE tournaments
ALTER COLUMN rules TYPE TEXT;

-- Add comments for documentation
COMMENT ON COLUMN tournaments.description IS 'Detailed tournament description with rich text support';
COMMENT ON COLUMN tournaments.cashprize_total IS 'Total cash prize amount in currency';
COMMENT ON COLUMN tournaments.cashprize_distribution IS 'JSON object mapping rank positions to prize amounts: {"1": 500, "2": 300}';
COMMENT ON COLUMN tournaments.sponsors IS 'Array of sponsor objects: [{"name": "Sponsor", "logo_url": "url"}]';
COMMENT ON COLUMN tournaments.stream_urls IS 'JSON object of streaming platforms: {"twitch": "url", "youtube": "url"}';

-- ============================================================
-- 2. News Articles Table
-- ============================================================

-- Create table for news articles
CREATE TABLE IF NOT EXISTS news_articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_news_articles_published ON news_articles(published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_articles_author ON news_articles(author_id);
CREATE INDEX IF NOT EXISTS idx_news_articles_created_at ON news_articles(created_at DESC);

-- Add comments
COMMENT ON TABLE news_articles IS 'News articles and updates displayed on the homepage';
COMMENT ON COLUMN news_articles.title IS 'Article title';
COMMENT ON COLUMN news_articles.content IS 'Full article content (supports rich text/markdown)';
COMMENT ON COLUMN news_articles.image_url IS 'Featured image URL for the article';
COMMENT ON COLUMN news_articles.author_id IS 'User who created the article';
COMMENT ON COLUMN news_articles.published IS 'Whether the article is published and visible to users';
COMMENT ON COLUMN news_articles.published_at IS 'Timestamp when the article was published';

-- ============================================================
-- 3. Row Level Security (RLS) Policies for News
-- ============================================================

-- Enable RLS on news_articles
ALTER TABLE news_articles ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read published articles
CREATE POLICY "Public can view published news articles"
ON news_articles
FOR SELECT
USING (published = true);

-- Allow authenticated users to view all articles (including drafts if they're admins)
CREATE POLICY "Authenticated users can view all news articles"
ON news_articles
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow organizers to create articles
CREATE POLICY "Organizers can create news articles"
ON news_articles
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'organizer'
    )
);

-- Allow organizers to update their own articles
CREATE POLICY "Organizers can update their own news articles"
ON news_articles
FOR UPDATE
USING (
    author_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'organizer'
    )
);

-- Allow organizers to delete their own articles
CREATE POLICY "Organizers can delete their own news articles"
ON news_articles
FOR DELETE
USING (
    author_id = auth.uid()
    OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'organizer'
    )
);

-- ============================================================
-- 4. Function to update updated_at timestamp
-- ============================================================

-- Create or replace function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for news_articles
DROP TRIGGER IF EXISTS update_news_articles_updated_at ON news_articles;
CREATE TRIGGER update_news_articles_updated_at
    BEFORE UPDATE ON news_articles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
