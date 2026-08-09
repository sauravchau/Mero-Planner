USE mero_planner;

ALTER TABLE users
  ADD COLUMN delete_token VARCHAR(255) NULL,
  ADD COLUMN delete_token_expires DATETIME NULL;

CREATE INDEX idx_users_delete_token ON users (delete_token);
