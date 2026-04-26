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
CREATE TABLE rooms (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    room_number VARCHAR(20) UNIQUE NOT NULL,
    floor VARCHAR(20),
    wing VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Incubators table
CREATE TABLE incubators (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    incubator_code VARCHAR(20) UNIQUE NOT NULL,
    room_id CHAR(36) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- Babies table
CREATE TABLE babies (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    gender ENUM('male', 'female', 'other') NOT NULL,
    incubator_id CHAR(36) NOT NULL,
    admission_date DATE NOT NULL,
    discharge_date DATE,
    status ENUM('active', 'discharged') DEFAULT 'active',
    created_by CHAR(36),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (incubator_id) REFERENCES incubators(id)
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
CREATE TABLE recordings (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    baby_id CHAR(36) NOT NULL,
    parent_id CHAR(36) NOT NULL,
    title VARCHAR(255),
    s3_key VARCHAR(500) NOT NULL,
    duration_seconds INTEGER NOT NULL,
    status ENUM('pending_review', 'scheduled', 'played', 'returned', 'rejected') DEFAULT 'pending_review',
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP,
    reviewed_by CHAR(36),
    FOREIGN KEY (baby_id) REFERENCES babies(id),
    FOREIGN KEY (parent_id) REFERENCES users(id)
);

-- Recording status history table
CREATE TABLE recording_status_history (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    recording_id CHAR(36) NOT NULL,
    from_status ENUM('pending_review', 'scheduled', 'played', 'returned', 'rejected'),
    to_status ENUM('pending_review', 'scheduled', 'played', 'returned', 'rejected') NOT NULL,
    changed_by CHAR(36) NOT NULL,
    note TEXT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recording_id) REFERENCES recordings(id),
    FOREIGN KEY (changed_by) REFERENCES users(id)
);

-- Schedules table
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
CREATE TABLE playback_log (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    recording_id CHAR(36) NOT NULL,
    incubator_id CHAR(36) NOT NULL,
    triggered_by CHAR(36),
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_played_seconds INTEGER NOT NULL,
    trigger_source ENUM('scheduled', 'manual') NOT NULL,
    FOREIGN KEY (recording_id) REFERENCES recordings(id),
    FOREIGN KEY (incubator_id) REFERENCES incubators(id)
);

-- Messages table (per-recording thread)
CREATE TABLE messages (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    recording_id CHAR(36) NOT NULL,
    sender_id CHAR(36) NOT NULL,
    receiver_id CHAR(36) NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recording_id) REFERENCES recordings(id),
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- General messages table
CREATE TABLE general_messages (
    id CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    sender_id CHAR(36) NOT NULL,
    receiver_id CHAR(36) NOT NULL,
    body TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

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

