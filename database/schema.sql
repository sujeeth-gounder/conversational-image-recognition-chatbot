-- =============================================================================
--  VisionChat — MySQL Database Schema
--  Conversational Image Recognition Chatbot
-- =============================================================================
--  Tables: users, images, chat_history, admin_logs
-- =============================================================================

CREATE DATABASE IF NOT EXISTS visionchat
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE visionchat;

-- -----------------------------------------------------------------------------
--  Users
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            CHAR(36)     PRIMARY KEY,            -- UUID
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,              -- bcrypt/argon2 hash
  role          ENUM('user','admin') NOT NULL DEFAULT 'user',
  bio           TEXT,
  avatar_color  VARCHAR(9)   DEFAULT '#6366f1',
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
--  Images  (uploaded files + cached AI analysis as JSON)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS images (
  id            CHAR(36)     PRIMARY KEY,
  user_id       CHAR(36)     NOT NULL,
  name          VARCHAR(255) NOT NULL,
  file_path     VARCHAR(500) NOT NULL,              -- path / object-store key
  caption       TEXT,
  analysis_json JSON,                               -- detections, colors, classes, ocr
  width         INT,
  height        INT,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_images_user FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_images_user (user_id)
);

-- -----------------------------------------------------------------------------
--  Chat History  (conversation messages tied to an image)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_history (
  id         CHAR(36)  PRIMARY KEY,
  user_id    CHAR(36)  NOT NULL,
  image_id   CHAR(36),
  role       ENUM('user','bot') NOT NULL,
  text       TEXT      NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_chat_user  FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_chat_image FOREIGN KEY (image_id)
    REFERENCES images(id) ON DELETE CASCADE,
  INDEX idx_chat_user (user_id),
  INDEX idx_chat_image (image_id)
);

-- -----------------------------------------------------------------------------
--  Admin Logs  (audit trail / moderation actions)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_logs (
  id         CHAR(36)  PRIMARY KEY,
  admin_id   CHAR(36)  NOT NULL,
  action     VARCHAR(120) NOT NULL,                 -- e.g. 'delete_user'
  target_id  CHAR(36),
  detail     TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_admin_user FOREIGN KEY (admin_id)
    REFERENCES users(id) ON DELETE CASCADE
);
