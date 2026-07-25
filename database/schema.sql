-- Users table
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    hospital_id VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role ENUM('admin', 'nurse', 'parent') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    invite_token VARCHAR(255),
    invite_token_expires_at TIMESTAMP,
    invite_used BOOLEAN DEFAULT FALSE,
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rooms table
-- capacity: data-driven occupancy limit. Admin sets it per room (most = 1, a few = 2).
-- room_number is the ONLY identifier now — floor and wing both dropped (doctor meeting, June 2026).
CREATE TABLE rooms (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    room_number VARCHAR(20) UNIQUE NOT NULL,
    capacity INT NOT NULL DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- NOTE: incubators table removed entirely (doctor meeting, June 2026).
-- Nurses swap incubators too often for babies.incubator_id to stay accurate,
-- so babies are now assigned directly to rooms.

-- Babies table
-- room_id (FK -> rooms.id) replaces the old incubator_id.
CREATE TABLE babies (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    record_number VARCHAR(20) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender ENUM('male', 'female', 'other') NOT NULL,
    room_id CHAR(36) NOT NULL,
    admission_date DATE NOT NULL,
    discharge_date DATE,
    status ENUM('active', 'discharged') DEFAULT 'active',
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- Parent-Baby junction table
CREATE TABLE parent_baby (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    parent_id CHAR(36) NOT NULL,
    baby_id CHAR(36) NOT NULL,
    relationship ENUM('primary', 'secondary') NOT NULL,
    linked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES users(id),
    FOREIGN KEY (baby_id) REFERENCES babies(id)
);

-- Recordings table
-- description: parent-submitted summary of the recording content
-- ai_transcript, ai_flags, ai_summary: nullable placeholders for Phase 5 AI content check
CREATE TABLE recordings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    baby_id CHAR(36) NOT NULL,
    parent_id CHAR(36) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    s3_key VARCHAR(500) NOT NULL,
    duration_seconds INTEGER NOT NULL,
    status ENUM('pending_review', 'scheduled', 'played', 'rejected', 'cancelled') DEFAULT 'pending_review',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by CHAR(36),
    ai_transcript TEXT,
    ai_flags TEXT,
    ai_summary TEXT,
    FOREIGN KEY (baby_id) REFERENCES babies(id),
    FOREIGN KEY (parent_id) REFERENCES users(id)
);

-- Recording status history table
-- Logs every status transition with who made it and when.
-- 'returned' removed from ENUM — nurse actions are schedule, play now, or reject only.
-- 'cancelled' = baby discharged, recording no longer actionable.
CREATE TABLE recording_status_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    recording_id CHAR(36) NOT NULL,
    from_status ENUM('pending_review', 'scheduled', 'played', 'rejected', 'cancelled'),
    to_status ENUM('pending_review', 'scheduled', 'played', 'rejected', 'cancelled') NOT NULL,
    changed_by CHAR(36) NOT NULL,
    note TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recording_id) REFERENCES recordings(id),
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- Schedules table
-- One row per scheduling event. A recording can be scheduled multiple times.
-- node-cron only processes rows with status = 'pending'.
CREATE TABLE schedules (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    recording_id CHAR(36) NOT NULL,
    scheduled_by CHAR(36) NOT NULL,
    scheduled_time TIMESTAMP NOT NULL,
    trigger_type ENUM('scheduled', 'manual') NOT NULL,
    status ENUM('pending', 'triggered', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recording_id) REFERENCES recordings(id),
    FOREIGN KEY (scheduled_by) REFERENCES users(id)
);

-- Playback log table
-- Written after Pi confirms playback. Schedules = intentions. Playback log = reality.
-- room_id replaces incubator_id (Phase 3 MQTT topics will be room-keyed).
CREATE TABLE playback_log (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    recording_id CHAR(36) NOT NULL,
    room_id CHAR(36) NOT NULL,
    triggered_by CHAR(36),
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_played_seconds INTEGER NOT NULL,
    trigger_source ENUM('scheduled', 'manual') NOT NULL,
    FOREIGN KEY (recording_id) REFERENCES recordings(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- Trigger: enforce maximum 2 parents per baby
-- Enforced at both application level and database level
DELIMITER //

CREATE TRIGGER enforce_max_two_parents
BEFORE INSERT ON parent_baby
FOR EACH ROW
BEGIN
  IF (SELECT COUNT(*) FROM parent_baby
      WHERE baby_id = NEW.baby_id) >= 2 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'A baby cannot have more than two parents';
  END IF;
END//

DELIMITER ;