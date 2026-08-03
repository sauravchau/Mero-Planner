USE mero_planner;

ALTER TABLE users
  ADD COLUMN role ENUM('user','vendor','admin') NOT NULL DEFAULT 'user';

ALTER TABLE vendors
  ADD COLUMN user_id INT NULL UNIQUE,
  ADD COLUMN status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved',
  ADD COLUMN rejection_reason TEXT NULL;

ALTER TABLE vendors
  ADD CONSTRAINT fk_vendors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_vendors_status ON vendors (status);

CREATE TABLE IF NOT EXISTS bookings (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  vendor_id   INT NOT NULL,
  event_id    INT NULL,
  event_date  DATE NOT NULL,
  message     TEXT NULL,
  status      ENUM('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_bookings_user   FOREIGN KEY (user_id)   REFERENCES users(id)   ON DELETE CASCADE,
  CONSTRAINT fk_bookings_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  CONSTRAINT fk_bookings_event  FOREIGN KEY (event_id)  REFERENCES events(id)  ON DELETE SET NULL,
  INDEX idx_bookings_user   (user_id),
  INDEX idx_bookings_vendor (vendor_id),
  INDEX idx_bookings_status (status)
);

CREATE TABLE IF NOT EXISTS vendor_ratings (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  booking_id  INT NOT NULL UNIQUE,
  user_id     INT NOT NULL,
  vendor_id   INT NOT NULL,
  rating      DECIMAL(2,1) NOT NULL,
  comment     TEXT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rating_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
  CONSTRAINT fk_rating_user    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
  CONSTRAINT fk_rating_vendor  FOREIGN KEY (vendor_id)  REFERENCES vendors(id)  ON DELETE CASCADE,
  INDEX idx_rating_vendor (vendor_id)
);