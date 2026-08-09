USE mero_planner;

ALTER TABLE users
  ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN verification_token VARCHAR(255) NULL,
  ADD COLUMN verification_token_expires DATETIME NULL;

CREATE INDEX idx_users_verification_token ON users (verification_token);

UPDATE users SET is_verified = 1 WHERE google_id IS NOT NULL;
