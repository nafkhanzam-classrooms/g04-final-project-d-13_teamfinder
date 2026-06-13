import os
import sqlite3
import hashlib
import time
import threading

DB_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.environ.get("CHAT_DB_PATH", os.path.join(DB_DIR, "chat_app.db"))

# Thread safety lock for SQLite on OneDrive synced Windows directories
db_lock = threading.Lock()

def get_db_connection():
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=OFF;")
    conn.row_factory = sqlite3.Row
    return conn

def db_init():
    """Initialize the SQLite tables."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Create Users table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            mmr INTEGER DEFAULT 1000,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        # Create Rooms table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS rooms (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            created_by TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        # Create Messages table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender TEXT NOT NULL,
            room_name TEXT, -- NULL for Private Messages
            recipient TEXT, -- NULL for Room Messages
            content TEXT,
            msg_type TEXT DEFAULT 'text', -- 'text' or 'file'
            file_path TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        
        # Create Reactions table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS reactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            emoji TEXT NOT NULL,
            UNIQUE(message_id, username, emoji),
            FOREIGN KEY(message_id) REFERENCES messages(id) ON DELETE CASCADE
        )
        """)

      
        # PROJECTS
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT,
            required_skill TEXT,
            owner_username TEXT,
            room_name TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)

        # Light migration: add room_name column for older DBs
        cursor.execute("PRAGMA table_info(projects)")
        cols = [r[1] for r in cursor.fetchall()]
        if "room_name" not in cols:
            cursor.execute("ALTER TABLE projects ADD COLUMN room_name TEXT")

        # Project membership table
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS project_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            username TEXT NOT NULL,
            role TEXT DEFAULT 'member',
            joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(project_id, username)
        )
        """)

        # Join requests (pending/accepted/rejected)
        cursor.execute("""
        CREATE TABLE IF NOT EXISTS project_join_requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            requester_username TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            resolved_at TIMESTAMP,
            UNIQUE(project_id, requester_username)
        )
        """)
        
        # Seed default rooms if none exist
        cursor.execute("SELECT COUNT(*) FROM rooms")
        if cursor.fetchone()[0] == 0:
            cursor.execute("INSERT INTO rooms (name, created_by) VALUES (?, ?)", ("General", "system"))
            cursor.execute("INSERT INTO rooms (name, created_by) VALUES (?, ?)", ("Gaming", "system"))
            cursor.execute("INSERT INTO rooms (name, created_by) VALUES (?, ?)", ("College Chat", "system"))
            
        conn.commit()
        conn.close()
        print("[DB] Database initialized successfully.")

def hash_password(password: str) -> str:
    """Helper to hash passwords securely using SHA-256."""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def register_user(username, password, mmr=1000):
    """Register a new user, returning True if successful."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        pwd_hash = hash_password(password)
        try:
            cursor.execute("INSERT INTO users (username, password_hash, mmr) VALUES (?, ?, ?)", 
                           (username, pwd_hash, mmr))
            conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False
        finally:
            conn.close()

def check_login(username, password):
    """Check credentials, return (success, mmr) tuple."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        pwd_hash = hash_password(password)
        cursor.execute("SELECT password_hash, mmr FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()
        conn.close()
        if row and row['password_hash'] == pwd_hash:
            return True, row['mmr']
        return False, 0

def update_user_mmr(username, new_mmr):
    """Update user MMR rating."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE users SET mmr = ? WHERE username = ?", (new_mmr, username))
        conn.commit()
        conn.close()

def create_room(room_name, created_by):
    """Create a chat room, return True on success."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("INSERT INTO rooms (name, created_by) VALUES (?, ?)", (room_name, created_by))
            conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False
        finally:
            conn.close()

def get_rooms():
    """List all available rooms."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT name, created_by FROM rooms ORDER BY name ASC")
        rooms = [{"name": r["name"], "created_by": r["created_by"]} for r in cursor.fetchall()]
        conn.close()
        return rooms

def save_message(sender, room_name, recipient, content, msg_type='text', file_path=None):
    """Save message to database, return message ID and timestamp."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
        cursor.execute("""
            INSERT INTO messages (sender, room_name, recipient, content, msg_type, file_path, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (sender, room_name, recipient, content, msg_type, file_path, timestamp))
        msg_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return msg_id, timestamp

def get_room_history(room_name, limit=50):
    """Fetch messages and reactions for a room."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, sender, content, msg_type, file_path, timestamp
            FROM messages 
            WHERE room_name = ? 
            ORDER BY id DESC LIMIT ?
        """, (room_name, limit))
        rows = cursor.fetchall()
        
        messages = []
        for r in reversed(rows):
            msg_id = r["id"]
            # Fetch reactions for this message
            cursor.execute("SELECT username, emoji FROM reactions WHERE message_id = ?", (msg_id,))
            reactions = [{"username": rx["username"], "emoji": rx["emoji"]} for rx in cursor.fetchall()]
            messages.append({
                "id": msg_id,
                "sender": r["sender"],
                "content": r["content"],
                "msg_type": r["msg_type"],
                "file_path": r["file_path"],
                "timestamp": r["timestamp"],
                "reactions": reactions
            })
        conn.close()
        return messages

def get_pm_history(user1, user2, limit=50):
    """Fetch private messages between user1 and user2."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, sender, content, msg_type, file_path, timestamp
            FROM messages 
            WHERE room_name IS NULL AND (
                (sender = ? AND recipient = ?) OR 
                (sender = ? AND recipient = ?)
            )
            ORDER BY id DESC LIMIT ?
        """, (user1, user2, user2, user1, limit))
        rows = cursor.fetchall()
        
        messages = []
        for r in reversed(rows):
            msg_id = r["id"]
            cursor.execute("SELECT username, emoji FROM reactions WHERE message_id = ?", (msg_id,))
            reactions = [{"username": rx["username"], "emoji": rx["emoji"]} for rx in cursor.fetchall()]
            messages.append({
                "id": msg_id,
                "sender": r["sender"],
                "content": r["content"],
                "msg_type": r["msg_type"],
                "file_path": r["file_path"],
                "timestamp": r["timestamp"],
                "reactions": reactions
            })
        conn.close()
        return messages

def toggle_reaction(message_id, username, emoji):
    """Add or remove an emoji reaction. Returns dict of all active reactions on message."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check if this exact reaction exists
        cursor.execute("SELECT id FROM reactions WHERE message_id = ? AND username = ? AND emoji = ?", 
                       (message_id, username, emoji))
        row = cursor.fetchone()
        
        if row:
            # Remove it
            cursor.execute("DELETE FROM reactions WHERE id = ?", (row["id"],))
        else:
            # Add it
            try:
                cursor.execute("INSERT INTO reactions (message_id, username, emoji) VALUES (?, ?, ?)", 
                               (message_id, username, emoji))
            except sqlite3.IntegrityError:
                pass  # Handled duplicate gracefully
                
        conn.commit()
        
        # Get updated list
        cursor.execute("SELECT username, emoji FROM reactions WHERE message_id = ?", (message_id,))
        reactions = [{"username": r["username"], "emoji": r["emoji"]} for r in cursor.fetchall()]
        conn.close()
        return reactions

def get_users_mmr():
    """Fetch MMR for all users securely inside db_lock."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT username, mmr FROM users")
        db_users = {r["username"]: r["mmr"] for r in cursor.fetchall()}
        conn.close()
        return db_users

def get_user_mmr(username):
    """Fetch MMR for a specific user securely inside db_lock."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT mmr FROM users WHERE username = ?", (username,))
        row = cursor.fetchone()
        conn.close()
        return row["mmr"] if row else 1000

def get_message_recipient_info(message_id):
    """Retrieve room_name, recipient, and sender for a given message ID."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT room_name, recipient, sender FROM messages WHERE id = ?", (message_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return {
                "room_name": row["room_name"],
                "recipient": row["recipient"],
                "sender": row["sender"]
            }
        return None
    
# Run DB initialization when run directly
if __name__ == "__main__":
    db_init()

def create_project(
    title,
    description,
    required_skill,
    owner_username
):
    with db_lock:

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            INSERT INTO projects
            (
                title,
                description,
                required_skill,
                owner_username,
                room_name
            )
            VALUES (?, ?, ?, ?, ?)
        """, (
            title,
            description,
            required_skill,
            owner_username,
            None
        ))

        project_id = cursor.lastrowid

        conn.commit()
        conn.close()

        return project_id


def set_project_room_name(project_id: int, room_name: str | None):
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE projects SET room_name = ? WHERE id = ?", (room_name, project_id))
        conn.commit()
        conn.close()


def rename_room(old_name: str, new_name: str):
    """Rename a room and migrate existing messages. Returns True on success."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            # Ensure destination does not exist
            cursor.execute("SELECT 1 FROM rooms WHERE name = ?", (new_name,))
            if cursor.fetchone():
                conn.close()
                return False

            cursor.execute("UPDATE rooms SET name = ? WHERE name = ?", (new_name, old_name))
            if cursor.rowcount == 0:
                conn.close()
                return False

            cursor.execute("UPDATE messages SET room_name = ? WHERE room_name = ?", (new_name, old_name))
            conn.commit()
            conn.close()
            return True
        except sqlite3.IntegrityError:
            conn.close()
            return False


def get_projects():

    with db_lock:

        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute("""
            SELECT *
            FROM projects
            ORDER BY id DESC
        """)

        projects = [
            dict(row)
            for row in cursor.fetchall()
        ]

        conn.close()

        return projects


def get_project(project_id: int):
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM projects WHERE id = ?", (project_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None


def get_project_by_room(room_name: str):
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM projects WHERE room_name = ?", (room_name,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None


def ensure_project_owner_is_member(project_id: int, owner_username: str):
    """Guarantee owner is in members table (idempotent)."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT OR IGNORE INTO project_members (project_id, username, role) VALUES (?, ?, 'owner')",
            (project_id, owner_username),
        )
        conn.commit()
        conn.close()


def is_project_member(project_id: int, username: str) -> bool:
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT 1 FROM project_members WHERE project_id = ? AND username = ? LIMIT 1",
            (project_id, username),
        )
        row = cursor.fetchone()
        conn.close()
        return row is not None


def create_join_request(project_id: int, requester_username: str):
    """Create a pending join request. Returns (ok, message)."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()

        # If already a member, do not create request
        cursor.execute(
            "SELECT 1 FROM project_members WHERE project_id = ? AND username = ? LIMIT 1",
            (project_id, requester_username),
        )
        if cursor.fetchone():
            conn.close()
            return False, "Already a project member."

        # If an existing request exists, do not duplicate
        cursor.execute(
            "SELECT status FROM project_join_requests WHERE project_id = ? AND requester_username = ?",
            (project_id, requester_username),
        )
        row = cursor.fetchone()
        if row:
            conn.close()
            return False, f"Request already exists ({row['status']})."

        cursor.execute(
            "INSERT INTO project_join_requests (project_id, requester_username, status) VALUES (?, ?, 'pending')",
            (project_id, requester_username),
        )
        conn.commit()
        conn.close()
        return True, "Join request sent."


def list_pending_join_requests(owner_username: str):
    """Return pending requests for projects owned by owner_username."""
    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT r.id as request_id, r.project_id, r.requester_username, r.created_at,
                   p.title as project_title
            FROM project_join_requests r
            JOIN projects p ON p.id = r.project_id
            WHERE p.owner_username = ? AND r.status = 'pending'
            ORDER BY r.id DESC
            """,
            (owner_username,),
        )
        reqs = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return reqs


def resolve_join_request(request_id: int, owner_username: str, decision: str):
    """Accept/reject a request if owner owns the project. Returns (ok, payload/message)."""
    if decision not in ("accepted", "rejected"):
        return False, "Invalid decision."

    with db_lock:
        conn = get_db_connection()
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT r.id, r.project_id, r.requester_username, r.status,
                   p.owner_username, p.title
            FROM project_join_requests r
            JOIN projects p ON p.id = r.project_id
            WHERE r.id = ?
            """,
            (request_id,),
        )
        row = cursor.fetchone()
        if not row:
            conn.close()
            return False, "Request not found."
        if row["owner_username"] != owner_username:
            conn.close()
            return False, "Not allowed."
        if row["status"] != "pending":
            conn.close()
            return False, f"Request already {row['status']}."

        cursor.execute(
            "UPDATE project_join_requests SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE id = ?",
            (decision, request_id),
        )

        if decision == "accepted":
            cursor.execute(
                "INSERT OR IGNORE INTO project_members (project_id, username, role) VALUES (?, ?, 'member')",
                (row["project_id"], row["requester_username"]),
            )

        conn.commit()
        payload = {
            "request_id": row["id"],
            "project_id": row["project_id"],
            "project_title": row["title"],
            "requester_username": row["requester_username"],
            "decision": decision,
        }
        conn.close()
        return True, payload
