USE mero_planner;

CREATE TABLE IF NOT EXISTS event_collaborators (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  event_id     INT NOT NULL,
  user_id      INT NOT NULL,
  invited_by   INT NOT NULL,
  role         ENUM('editor','viewer') NOT NULL DEFAULT 'viewer',
  status       ENUM('pending','accepted','declined') NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  CONSTRAINT fk_ec_event      FOREIGN KEY (event_id)   REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_ec_user       FOREIGN KEY (user_id)    REFERENCES users(id)  ON DELETE CASCADE,
  CONSTRAINT fk_ec_invited_by FOREIGN KEY (invited_by) REFERENCES users(id)  ON DELETE CASCADE,
  UNIQUE KEY uq_event_user (event_id, user_id),
  INDEX idx_ec_user_status (user_id, status),
  INDEX idx_ec_event (event_id)
);
