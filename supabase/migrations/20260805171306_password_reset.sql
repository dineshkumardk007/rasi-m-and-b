-- Table to store expiring, single-use password reset tokens
CREATE TABLE password_reset_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for quick token lookup
CREATE INDEX idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_password_reset_tokens_customer ON password_reset_tokens(customer_id);

-- RLS: Only service_role can access this table directly
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
