-- USERS
INSERT INTO Users (
    username,
    email,
    password_hash,
    bio
)
VALUES
('Shifa','shifaaaroar@gmail.com','hashed_password','Machine Learning Enthusiast'),
('Dyah','dyahukd@gmail.com','hashed_password','UI/UX Designer'),
('Kiko','kikobikinbatuk@gmail.com','hashed_password','Backend Developer'),
('Budi','budidini@gmail.com','hashed_password','Data Analyst'),
('Aisyah','aisyah@gmail.com','hashed_password','Frontend Developer');

-- SKILLS
INSERT INTO Skills (skill_name)
VALUES
('Python'),
('Machine Learning'),
('UI/UX'),
('Database'),
('Web Development'),
('Data Analysis'),
('Research'),
('Public Speaking');

-- USER SKILLS
INSERT INTO UserSkills (
    user_id,
    skill_id,
    proficiency_level
)
VALUES

-- Shifa
(1,1,'ADVANCED'),
(1,2,'ADVANCED'),
(1,7,'INTERMEDIATE'),

-- Diah
(2,3,'ADVANCED'),
(2,8,'INTERMEDIATE'),

-- Kiko
(3,4,'ADVANCED'),
(3,5,'ADVANCED'),
(3,1,'INTERMEDIATE'),

-- Budi
(4,6,'ADVANCED'),
(4,1,'INTERMEDIATE'),

-- Aisyah
(5,5,'ADVANCED'),
(5,3,'INTERMEDIATE');

-- PROJECTS
INSERT INTO Projects (
    owner_user_id,
    title,
    description,
    project_type
)
VALUES
(
    1,
    'PKM AI Deteksi Sampah',
    'Mencari anggota tim untuk pengembangan sistem klasifikasi sampah berbasis AI',
    'PKM'
),
(
    3,
    'Lomba Web Development Nasional',
    'Membutuhkan UI Designer dan Frontend Developer',
    'LOMBA'
),
(
    4,
    'Kelompok Belajar Data Mining',
    'Belajar data mining dan machine learning bersama setiap minggu',
    'STUDY_GROUP'
);

-- PROJECT SKILL NEEDS
INSERT INTO ProjectSkillNeeds (
    project_id,
    skill_id,
    required_level
)
VALUES

-- PKM AI
(1,1,'INTERMEDIATE'),
(1,2,'INTERMEDIATE'),
(1,7,'BEGINNER'),

-- Lomba Web
(2,3,'INTERMEDIATE'),
(2,5,'INTERMEDIATE'),

-- Study Group
(3,6,'BEGINNER');

-- PROJECT MEMBERS
INSERT INTO ProjectMembers (
    project_id,
    user_id,
    role
)
VALUES

(1,1,'OWNER'),
(1,4,'MEMBER'),

(2,3,'OWNER'),
(2,2,'MEMBER'),
(2,5,'MEMBER'),

(3,4,'OWNER'),
(3,1,'MEMBER');

-- PROJECT APPLICATIONS
INSERT INTO ProjectApplications (
    project_id,
    applicant_user_id,
    message,
    status
)
VALUES

(
    1,
    4,
    'Saya tertarik bergabung pada project PKM AI',
    'ACCEPTED'
),

(
    2,
    2,
    'Saya dapat membantu bagian UI/UX',
    'ACCEPTED'
),

(
    2,
    5,
    'Saya memiliki pengalaman frontend development',
    'ACCEPTED'
),

(
    3,
    1,
    'Saya ingin belajar Data Mining lebih dalam',
    'PENDING'
);

-- ROOMS
INSERT INTO Rooms (
    project_id,
    room_name
)
VALUES
(1,'PKM AI Room'),
(2,'Web Development Room'),
(3,'Data Mining Study Group');

-- ROOM MEMBERS
INSERT INTO RoomMembers (
    room_id,
    user_id,
    role
)
VALUES

(1,1,'OWNER'),
(1,4,'MEMBER'),

(2,3,'OWNER'),
(2,2,'MEMBER'),
(2,5,'MEMBER'),

(3,4,'OWNER'),
(3,1,'MEMBER');

-- MESSAGES
INSERT INTO Messages (
    room_id,
    sender_user_id,
    body
)
VALUES

(1,1,'Halo semuanya, selamat datang di tim PKM AI'),
(1,4,'Terima kasih, saya siap membantu bagian analisis data'),

(2,3,'Selamat datang di room lomba web development'),
(2,2,'Saya siap mengerjakan desain UI'),
(2,5,'Saya akan fokus di bagian frontend'),

(3,4,'Selamat datang di kelompok belajar Data Mining'),
(3,1,'Terima kasih, saya ingin memperdalam clustering dan classification');

-- PRIVATE MESSAGES
INSERT INTO PrivateMessages (
    sender_user_id,
    receiver_user_id,
    body
)
VALUES

(
    1,
    2,
    'Halo Diah, tertarik ikut PKM AI?'
),

(
    2,
    1,
    'Saat ini fokus UI/UX, mungkin lain waktu ya.'
),

(
    3,
    5,
    'Aisyah, mau ikut lomba web development?'
);

-- ACTIVITY LOGS
INSERT INTO ActivityLogs (
    actor_user_id,
    event_type,
    target_type,
    target_id,
    detail
)
VALUES

(
    1,
    'LOGIN',
    'USER',
    1,
    'User login ke sistem'
),

(
    1,
    'CREATE_PROJECT',
    'PROJECT',
    1,
    'Membuat project PKM AI Deteksi Sampah'
),

(
    4,
    'APPLY_PROJECT',
    'PROJECT',
    1,
    'Mengajukan diri ke project PKM AI'
),

(
    1,
    'ACCEPT_APPLICATION',
    'PROJECT',
    1,
    'Menerima Budi sebagai anggota project'
),

(
    3,
    'CREATE_PROJECT',
    'PROJECT',
    2,
    'Membuat project Lomba Web Development Nasional'
),

(
    2,
    'SEND_MESSAGE',
    'ROOM',
    2,
    'Mengirim pesan pada Web Development Room'
);
