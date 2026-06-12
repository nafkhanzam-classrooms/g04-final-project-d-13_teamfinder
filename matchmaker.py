import time
import threading

# Matchmaking queue configuration
CHECK_INTERVAL = 2.0     # Check queue every 2 seconds

# Thread-safe queue storage
queue_lock = threading.Lock()
matchmaking_queue = []  # List of dicts: {"username", "skill", "joined_at", "client_conn"}

def join_queue(username, skill, client_conn):
    """Add a user to the matchmaking queue if not already inside."""
    with queue_lock:
        # Check if already in queue
        for user in matchmaking_queue:
            if user["username"] == username:
                return False, len(matchmaking_queue)
        
        matchmaking_queue.append({
            "username": username,
            "skill": skill,  # simpan skill (string), bukan mmr
            "joined_at": time.time(),
            "client_conn": client_conn
        })
        return True, len(matchmaking_queue)

def leave_queue(username):
    """Remove a user from the matchmaking queue."""
    with queue_lock:
        for user in matchmaking_queue:
            if user["username"] == username:
                matchmaking_queue.remove(user)
                return True
        return False

def is_in_queue(username):
    """Check if a user is currently matchmaking."""
    with queue_lock:
        for user in matchmaking_queue:
            if user["username"] == username:
                return True
        return False

def get_queue_size():
    with queue_lock:
        return len(matchmaking_queue)

def run_matchmaker(on_match_found_callback, stop_event):
    """
    Background matchmaking thread runner.
    Mencari user dengan KEAHLIAN YANG SAMA.
    """
    print("[Matchmaker] Skill-based matchmaking thread started (matching SAME SKILL).")
    while not stop_event.is_set():
        time.sleep(CHECK_INTERVAL)
        
        with queue_lock:
            if len(matchmaking_queue) < 2:
                continue
                
            matched_pairs = []
            
            # Kelompokkan user berdasarkan skill (string)
            skill_groups = {}
            for user in matchmaking_queue:
                skill = user.get("skill", "")
                if skill not in skill_groups:
                    skill_groups[skill] = []
                skill_groups[skill].append(user)
            
            # Untuk setiap skill group, cari pasangan
            for skill, users in skill_groups.items():
                while len(users) >= 2:
                    user_a = users.pop(0)
                    user_b = users.pop(0)
                    matched_pairs.append((user_a, user_b))
            
            # Hapus user yang sudah di-match dari queue utama
            for user_a, user_b in matched_pairs:
                if user_a in matchmaking_queue:
                    matchmaking_queue.remove(user_a)
                if user_b in matchmaking_queue:
                    matchmaking_queue.remove(user_b)
            
            # Fire callbacks di luar lock
            for user_a, user_b in matched_pairs:
                room_name = f"Match_{user_a['username']}_vs_{user_b['username']}"
                skill_name = user_a.get("skill", "Unknown")
                print(f"[Matchmaker] Match found! {user_a['username']} ({skill_name}) vs {user_b['username']} ({skill_name}) -> Room: {room_name}")
                
                threading.Thread(
                    target=on_match_found_callback, 
                    args=(user_a, user_b, room_name), 
                    daemon=True
                ).start()
