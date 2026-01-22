-- Migration: Add gaming_account_change_requests table
-- Allows users to request gaming account changes when registered to active tournaments

CREATE TABLE IF NOT EXISTS gaming_account_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  old_username TEXT NOT NULL,
  old_tag TEXT,
  new_username TEXT NOT NULL,
  new_tag TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_id UUID REFERENCES auth.users(id),
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prevent duplicate pending requests for same user/platform (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_request 
  ON gaming_account_change_requests (user_id, platform) 
  WHERE (status = 'pending');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_gaming_account_change_requests_user_id ON gaming_account_change_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gaming_account_change_requests_status ON gaming_account_change_requests(status);

-- Enable RLS
ALTER TABLE gaming_account_change_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own requests" ON gaming_account_change_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create requests for themselves
CREATE POLICY "Users can create own requests" ON gaming_account_change_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all requests (using is_admin function if exists, otherwise fallback)
CREATE POLICY "Admins can view all requests" ON gaming_account_change_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'organizer')
    )
  );

-- Admins can update requests
CREATE POLICY "Admins can update requests" ON gaming_account_change_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'organizer')
    )
  );

-- Function to update updated_at on change
CREATE OR REPLACE FUNCTION update_gaming_account_change_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_gaming_account_change_requests_updated_at ON gaming_account_change_requests;
CREATE TRIGGER update_gaming_account_change_requests_updated_at
  BEFORE UPDATE ON gaming_account_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_gaming_account_change_requests_updated_at();

-- Comment for documentation
COMMENT ON TABLE gaming_account_change_requests IS 'Stores requests from users to change their gaming accounts when registered to active tournaments';
