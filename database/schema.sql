CREATE TABLE Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    bio TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Skills (
    skill_id INT AUTO_INCREMENT PRIMARY KEY,
    skill_name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE UserSkills (
    user_id INT NOT NULL,
    skill_id INT NOT NULL,

    proficiency_level ENUM(
        'BEGINNER',
        'INTERMEDIATE',
        'ADVANCED'
    ) NOT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (user_id, skill_id),
    FOREIGN KEY (user_id)
        REFERENCES Users(user_id)
        ON DELETE CASCADE,
    FOREIGN KEY (skill_id)
        REFERENCES Skills(skill_id)
        ON DELETE CASCADE
);

CREATE TABLE Projects (
    project_id INT AUTO_INCREMENT PRIMARY KEY,
    owner_user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    project_type ENUM(
        'PKM',
        'LOMBA',
        'PENELITIAN',
        'TUGAS',
        'STUDY_GROUP'
    ) NOT NULL,

    status ENUM(
        'OPEN',
        'CLOSED'
    ) DEFAULT 'OPEN',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_user_id)
        REFERENCES Users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE ProjectSkillNeeds (
    project_id INT NOT NULL,
    skill_id INT NOT NULL,

    required_level ENUM(
        'BEGINNER',
        'INTERMEDIATE',
        'ADVANCED'
    ) NOT NULL,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(project_id, skill_id),
    FOREIGN KEY(project_id)
        REFERENCES Projects(project_id)
        ON DELETE CASCADE,
    FOREIGN KEY(skill_id)
        REFERENCES Skills(skill_id)
        ON DELETE CASCADE
);

CREATE TABLE ProjectApplications (
    application_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT NOT NULL,
    applicant_user_id INT NOT NULL,
    message TEXT,
    status ENUM(
        'PENDING',
        'ACCEPTED',
        'REJECTED'
    ) DEFAULT 'PENDING',

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    decided_at DATETIME NULL,
    FOREIGN KEY(project_id)
        REFERENCES Projects(project_id)
        ON DELETE CASCADE,
    FOREIGN KEY(applicant_user_id)
        REFERENCES Users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE ProjectMembers (
    project_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM(
        'OWNER',
        'MEMBER'
    ) DEFAULT 'MEMBER',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(project_id, user_id),
    FOREIGN KEY(project_id)
        REFERENCES Projects(project_id)
        ON DELETE CASCADE,
    FOREIGN KEY(user_id)
        REFERENCES Users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE Rooms (
    room_id INT AUTO_INCREMENT PRIMARY KEY,
    project_id INT UNIQUE NOT NULL,
    room_name VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(project_id)
        REFERENCES Projects(project_id)
        ON DELETE CASCADE
);

CREATE TABLE RoomMembers (
    room_id INT NOT NULL,
    user_id INT NOT NULL,
    role ENUM(
        'OWNER',
        'MEMBER'
    ) DEFAULT 'MEMBER',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(room_id, user_id),
    FOREIGN KEY(room_id)
        REFERENCES Rooms(room_id)
        ON DELETE CASCADE,
    FOREIGN KEY(user_id)
        REFERENCES Users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE Messages (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    sender_user_id INT NOT NULL,
    body TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(room_id)
        REFERENCES Rooms(room_id)
        ON DELETE CASCADE,
    FOREIGN KEY(sender_user_id)
        REFERENCES Users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE PrivateMessages (
    private_message_id INT AUTO_INCREMENT PRIMARY KEY,
    sender_user_id INT NOT NULL,
    receiver_user_id INT NOT NULL,
    body TEXT NOT NULL,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(sender_user_id)
        REFERENCES Users(user_id)
        ON DELETE CASCADE,
    FOREIGN KEY(receiver_user_id)
        REFERENCES Users(user_id)
        ON DELETE CASCADE
);

CREATE TABLE ActivityLogs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    actor_user_id INT,
    event_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(50),
    target_id INT,
    detail TEXT,
    event_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(actor_user_id)
        REFERENCES Users(user_id)
        ON DELETE SET NULL
);
