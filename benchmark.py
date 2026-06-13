import socket
import threading
import json
import time
import sys
import random
import base64
import hashlib

# Configuration
SERVER_HOST = "localhost"
SERVER_PORT = 8000
NUM_CLIENTS = 10
NUM_MESSAGES_PER_CLIENT = 5
CLIENT_SPAWN_DELAY = 0.05

latencies = []
total_sent = 0
total_recv = 0
active_threads_count = 0
stats_lock = threading.Lock()

def send_ws_frame_client(sock, opcode, payload):
    """Send WebSocket frame from client (with masking)."""
    if isinstance(payload, str):
        payload = payload.encode('utf-8')
    
    header = bytearray()
    header.append(0x80 | opcode)
    
    payload_len = len(payload)
    if payload_len < 126:
        header.append(0x80 | payload_len)
    elif payload_len < 65536:
        header.append(0x80 | 126)
        header.extend(payload_len.to_bytes(2, byteorder='big'))
    else:
        header.append(0x80 | 127)
        header.extend(payload_len.to_bytes(8, byteorder='big'))
    
    mask = bytes(random.getrandbits(8) for _ in range(4))
    header.extend(mask)
    
    masked_payload = bytearray(payload_len)
    for i in range(payload_len):
        masked_payload[i] = payload[i] ^ mask[i % 4]
    
    sock.sendall(header + masked_payload)

def recv_ws_frame_client(sock):
    """Receive WebSocket frame from server."""
    try:
        header = sock.recv(2)
        if len(header) < 2:
            return None, None
        
        byte0, byte1 = header[0], header[1]
        opcode = byte0 & 0x0F
        masked = (byte1 & 0x80) != 0
        payload_len = byte1 & 0x7F
        
        if payload_len == 126:
            ext_len = sock.recv(2)
            if len(ext_len) < 2:
                return None, None
            payload_len = int.from_bytes(ext_len, byteorder='big')
        elif payload_len == 127:
            ext_len = sock.recv(8)
            if len(ext_len) < 8:
                return None, None
            payload_len = int.from_bytes(ext_len, byteorder='big')
        
        mask_key = b""
        if masked:
            mask_key = sock.recv(4)
            if len(mask_key) < 4:
                return None, None
        
        payload = b""
        while len(payload) < payload_len:
            chunk = sock.recv(payload_len - len(payload))
            if not chunk:
                return None, None
            payload += chunk
        
        if masked:
            unmasked = bytearray(payload_len)
            for i in range(payload_len):
                unmasked[i] = payload[i] ^ mask_key[i % 4]
            payload = bytes(unmasked)
        
        return opcode, payload
    except Exception:
        return None, None

def pre_register_users(num_clients):
    """Register users sequentially before test."""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect((SERVER_HOST, SERVER_PORT))
        
        key = base64.b64encode(bytes(random.getrandbits(8) for _ in range(16))).decode()
        handshake = (
            f"GET /ws HTTP/1.1\r\n"
            f"Host: {SERVER_HOST}:{SERVER_PORT}\r\n"
            f"Upgrade: websocket\r\n"
            f"Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            f"Sec-WebSocket-Version: 13\r\n\r\n"
        )
        sock.sendall(handshake.encode())
        resp = sock.recv(4096)
        
        for i in range(num_clients):
            username = f"bench_user_{i}"
            password = "password123"
            reg_payload = json.dumps({"type": "register", "username": username, "password": password})
            send_ws_frame_client(sock, 1, reg_payload)
            recv_ws_frame_client(sock)
        
        sock.close()
        print("[*] Test accounts initialized.")
    except Exception as e:
        print(f"[!] Warning: {e}")

def run_benchmark_client(client_id):
    """Run single benchmark client."""
    global total_sent, total_recv, active_threads_count
    
    username = f"bench_user_{client_id}"
    password = "password123"
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.connect((SERVER_HOST, SERVER_PORT))
        sock.settimeout(20.0)
        
        key = base64.b64encode(bytes(random.getrandbits(8) for _ in range(16))).decode()
        handshake = (
            f"GET /ws HTTP/1.1\r\n"
            f"Host: {SERVER_HOST}:{SERVER_PORT}\r\n"
            f"Upgrade: websocket\r\n"
            f"Connection: Upgrade\r\n"
            f"Sec-WebSocket-Key: {key}\r\n"
            f"Sec-WebSocket-Version: 13\r\n\r\n"
        )
        sock.sendall(handshake.encode())
        
        resp = sock.recv(4096)
        if b"101 Switching Protocols" not in resp:
            sock.close()
            return
        
        login_payload = json.dumps({"type": "login", "username": username, "password": password})
        send_ws_frame_client(sock, 1, login_payload)
        op, payload = recv_ws_frame_client(sock)
        
        join_payload = json.dumps({"type": "join_room", "room_name": "General"})
        send_ws_frame_client(sock, 1, join_payload)
        time.sleep(0.5)
        
        with stats_lock:
            active_threads_count += 1
        
        for i in range(NUM_MESSAGES_PER_CLIENT):
            time.sleep(random.uniform(0.1, 0.5))
            
            msg_content = f"Benchmark message {i} from client {client_id}"
            msg_payload = json.dumps({"type": "send_msg", "room_name": "General", "content": msg_content})
            
            t_start = time.perf_counter()
            send_ws_frame_client(sock, 1, msg_payload)
            
            with stats_lock:
                total_sent += 1
            
            timeout = 15.0
            t_timeout_limit = time.time() + timeout
            
            while time.time() < t_timeout_limit:
                op, payload_bytes = recv_ws_frame_client(sock)
                if op is None:
                    break
                
                with stats_lock:
                    total_recv += 1
                
                if op == 1:
                    data = json.loads(payload_bytes.decode('utf-8'))
                    if data.get("type") == "message" and data.get("content") == msg_content:
                        t_end = time.perf_counter()
                        latency_ms = (t_end - t_start) * 1000.0
                        with stats_lock:
                            latencies.append(latency_ms)
                        break
        
        sock.close()
    except Exception:
        pass
    finally:
        with stats_lock:
            active_threads_count = max(0, active_threads_count - 1)

def main():
    global NUM_CLIENTS, NUM_MESSAGES_PER_CLIENT
    
    if "--clients" in sys.argv:
        try:
            idx = sys.argv.index("--clients")
            NUM_CLIENTS = int(sys.argv[idx + 1])
        except Exception:
            pass
    if "--messages" in sys.argv:
        try:
            idx = sys.argv.index("--messages")
            NUM_MESSAGES_PER_CLIENT = int(sys.argv[idx + 1])
        except Exception:
            pass

    print("=" * 50)
    print("     TEAMFINDER BENCHMARK TESTER")
    print("=" * 50)
    print(f"Server: {SERVER_HOST}:{SERVER_PORT}")
    print(f"Concurrent Clients: {NUM_CLIENTS}")
    print(f"Messages Per Client: {NUM_MESSAGES_PER_CLIENT}")
    print(f"Total Messages: {NUM_CLIENTS * NUM_MESSAGES_PER_CLIENT}")
    
    print("[*] Preparing test accounts...")
    pre_register_users(NUM_CLIENTS)
    
    print("[*] Running benchmark...")
    t_start = time.time()
    
    threads = []
    for i in range(NUM_CLIENTS):
        t = threading.Thread(target=run_benchmark_client, args=(i,))
        t.daemon = True
        threads.append(t)
        t.start()
        time.sleep(CLIENT_SPAWN_DELAY)
    
    for t in threads:
        t.join()
    
    t_end = time.time()
    duration = t_end - t_start
    
    print("\n" + "=" * 50)
    print("          BENCHMARK RESULTS")
    print("=" * 50)
    print(f"Total Duration: {duration:.2f} seconds")
    print(f"Messages Sent: {total_sent}")
    print(f"Messages Received: {total_recv}")
    
    if latencies:
        avg_latency = sum(latencies) / len(latencies)
        min_latency = min(latencies)
        max_latency = max(latencies)
        
        variance = sum((x - avg_latency) ** 2 for x in latencies) / len(latencies)
        std_dev = variance ** 0.5
        
        throughput = len(latencies) / duration
        
        print(f"Success Rate: {len(latencies)}/{total_sent} ({len(latencies)/total_sent*100:.1f}%)")
        print(f"Throughput: {throughput:.2f} msg/sec")
        print(f"Min Latency: {min_latency:.2f} ms")
        print(f"Avg Latency: {avg_latency:.2f} ms")
        print(f"Max Latency: {max_latency:.2f} ms")
        print(f"Std Deviation: {std_dev:.2f} ms")
    else:
        print("Error: No messages confirmed.")
    print("=" * 50)

if __name__ == "__main__":
    main()