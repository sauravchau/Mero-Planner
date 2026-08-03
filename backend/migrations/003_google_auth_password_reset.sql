USE mero_planner;

ALTER TABLE users
  MODIFY COLUMN password VARCHAR(255) NULL;

ALTER TABLE users
  ADD COLUMN google_id VARCHAR(255) NULL UNIQUE AFTER password;

ALTER TABLE users
  ADD COLUMN reset_token VARCHAR(255) NULL,
  ADD COLUMN reset_token_expires DATETIME NULL;

CREATE INDEX idx_users_reset_token ON users (reset_token);
