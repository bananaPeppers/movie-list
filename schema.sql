-- ===========================================================
-- Movie Log — MariaDB schema (for when you wire up the backend).
-- Run:  mysql -u root -p < schema.sql
-- ===========================================================

CREATE DATABASE IF NOT EXISTS movielog
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE movielog;

CREATE TABLE IF NOT EXISTS movies (
  id           VARCHAR(40)   NOT NULL PRIMARY KEY,
  name         VARCHAR(255)  NOT NULL,
  release_year SMALLINT      NULL,      -- e.g. 2010
  imdb_rating  DECIMAL(3,1)  NULL,      -- 0.0 – 10.0
  genre        VARCHAR(50)   NULL,
  opinion      TINYINT       NULL,      -- 0–100 "what I thought"; >= 75 shows the Recommended tag
  poster_url   VARCHAR(1024) NULL,
  added_by     VARCHAR(50)   NOT NULL,  -- username
  added_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_genre (genre),
  INDEX idx_added_at (added_at)
);

-- Optional: move auth into the DB later instead of hardcoding.
-- Store a HASH (e.g. bcrypt), never a plaintext password.
CREATE TABLE IF NOT EXISTS users (
  username      VARCHAR(50)  NOT NULL PRIMARY KEY,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- One row per actor per movie, so you can search / browse by cast.
CREATE TABLE IF NOT EXISTS movie_cast (
  movie_id  VARCHAR(40)  NOT NULL,
  actor     VARCHAR(120) NOT NULL,
  PRIMARY KEY (movie_id, actor),
  INDEX idx_actor (actor),
  FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
);

-- Sample rows ------------------------------------------------
INSERT INTO movies (id, name, release_year, imdb_rating, genre, opinion, poster_url, added_by) VALUES
  ('seed_inception',   'Inception',        2010, 8.8, 'Sci-Fi',   92, NULL, 'samip'),
  ('seed_dark_knight', 'The Dark Knight',  2008, 9.0, 'Action',   96, NULL, 'jason'),
  ('seed_parasite',    'Parasite',         2019, 8.5, 'Thriller', 88, NULL, 'samip')
ON DUPLICATE KEY UPDATE name = VALUES(name);
