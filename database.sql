-- ============================================================
--  SANG HÀO BEAUTY — MySQL Database Schema
--  Run this entire file in MySQL Workbench to set up the DB
-- ============================================================

CREATE DATABASE IF NOT EXISTS sang_hao_beauty
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sang_hao_beauty;

-- ─── TABLE: services ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  code         VARCHAR(10)  NOT NULL UNIQUE,
  name_vi      VARCHAR(100) NOT NULL,
  name_en      VARCHAR(100) NOT NULL,
  description_vi TEXT,
  description_en TEXT,
  icon         VARCHAR(10)  DEFAULT '✨',
  price        INT          NOT NULL COMMENT 'Price in VND',
  duration_mins INT         NOT NULL COMMENT 'Duration in minutes',
  is_active    TINYINT(1)   DEFAULT 1,
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- ─── TABLE: staff ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  username     VARCHAR(50)  NOT NULL UNIQUE,
  password     VARCHAR(255) NOT NULL COMMENT 'bcrypt hashed',
  full_name    VARCHAR(100),
  role         ENUM('admin','staff') DEFAULT 'staff',
  is_active    TINYINT(1)   DEFAULT 1,
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- ─── TABLE: bookings ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  ref_code        VARCHAR(20)  NOT NULL UNIQUE COMMENT 'e.g. SH-ABC123',
  first_name      VARCHAR(50)  NOT NULL,
  last_name       VARCHAR(50)  NOT NULL,
  email           VARCHAR(100) NOT NULL,
  phone           VARCHAR(20),
  service_id      INT          NOT NULL,
  booking_date    DATE         NOT NULL,
  booking_time    TIME         NOT NULL,
  end_time        TIME         NOT NULL COMMENT 'booking_time + duration',
  notes           TEXT,
  status          ENUM('pending','confirmed','cancelled') DEFAULT 'pending',
  created_at      DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE RESTRICT
);

-- ─── INDEXES ──────────────────────────────────────────────
CREATE INDEX idx_bookings_date   ON bookings (booking_date);
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_email  ON bookings (email);

-- ─── SEED: Services ───────────────────────────────────────
INSERT INTO services (code, name_vi, name_en, description_vi, description_en, icon, price, duration_mins) VALUES
('S01', 'Phun Mày',
 'Eyebrow Embroidery',
 'Phun thêu chân mày tự nhiên, sắc nét',
 'Natural and precise eyebrow embroidery',
 '✨', 1500000, 90),

('S02', 'Phun Môi',
 'Lip Embroidery',
 'Phun môi căng mọng, màu sắc tươi tắn',
 'Plump lip embroidery with vibrant color',
 '💋', 1500000, 90),

('S03', 'Phun Mí',
 'Eyeliner Embroidery',
 'Phun mí mắt sắc sảo, đường nét rõ ràng',
 'Defined and precise eyeliner embroidery',
 '👁️', 1500000, 90),

('S04', 'Combo Phun Mày + Phun Môi',
 'Combo: Eyebrow + Lip',
 'Kết hợp phun mày và phun môi, tiết kiệm chi phí',
 'Eyebrow and lip embroidery combo, great value',
 '✨', 2500000, 180),

('S05', 'Combo Phun Mày + Phun Mí',
 'Combo: Eyebrow + Eyeliner',
 'Kết hợp phun mày và phun mí, đôi mắt hoàn hảo',
 'Eyebrow and eyeliner combo for perfect eyes',
 '👁️', 2500000, 180),

('S06', 'Combo Phun Môi + Phun Mí',
 'Combo: Lip + Eyeliner',
 'Kết hợp phun môi và phun mí, nhan sắc rạng rỡ',
 'Lip and eyeliner combo for a radiant look',
 '💋', 2500000, 180),

('S07', 'Combo Phun Mày + Phun Môi + Phun Mí',
 'Full Combo: Eyebrow + Lip + Eyeliner',
 'Trọn bộ 3 dịch vụ phun thêu — vẻ đẹp hoàn hảo',
 'Complete set of all 3 embroidery services',
 '👑', 4000000, 240),

('S08', 'Tư Vấn Dạy Học',
 'Teaching Consultation',
 'Tư vấn và hướng dẫn kỹ thuật phun thêu',
 'Consultation and embroidery technique training',
 '🎓', 700000, 60);

-- ─── SEED: Staff accounts ─────────────────────────────────
-- Passwords are bcrypt hashes:
--   admin  → reserve2025
--   staff  → staff123
INSERT INTO staff (username, password, full_name, role) VALUES
('admin',
 '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
 'Admin', 'admin'),
('staff',
 '$2b$10$5GcMMS5wvBHSaFqDHzYSUudrHLVdFn5Hj4NKp1SyuWEzBwIp.nULu',
 'Staff Member', 'staff');

-- NOTE: After running, update passwords by running the app
-- and using bcrypt to hash your own passwords, or use the
-- /api/auth/change-password endpoint once logged in.

SELECT 'Database setup complete!' AS message;
SELECT code, name_vi, price, duration_mins FROM services;
