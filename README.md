[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/4SHtB1vz)


| No | Name | NRP           |
| -- | ---  | ---           |
| 1 | Kiko | 5025241000 |
| 2 | Shifa Alya Dewi  | 5025241176 |
| 3 | Dyah Utami Kesuma Dewi  | 5025241186 |

---

# TeamFinder - Real-Time Collaboration Platform

**TeamFinder** adalah platform kolaborasi real-time untuk mahasiswa mencari tim untuk PKM, Gemastik, Hackathon, Tugas PPL, Skripsi, dan Research. Dilengkapi dengan fitur chat room, private messaging, file transfer, emoji reactions, dan matchmaking berdasarkan keahlian.

---

## **Fitur Utama**

### Fitur Wajib
- **Authentication** - Login & Register sederhana
- **Multi Chat Room** - Create, join, leave room
- **Broadcast Message** - Kirim pesan ke seluruh anggota room
- **Private Message** - Chat pribadi antar user
- **Online User List** - Lihat siapa yang sedang online
- **Room List** - Daftar semua room yang tersedia
- **Chat History** - Pesan tersimpan di database
- **Timestamp Message** - Waktu pengiriman pesan
- **Server Logging** - Log aktivitas server

### Bonus
- **File Transfer** - Upload/download file (gambar, PDF, dll) dengan chunking 32KB
- **Emoji/Reaction** - React ke pesan dengan emoji
- **Database Persistence** - Pesan tersimpan di SQLite
- **Skill-Based Matchmaking** - Cari tim berdasarkan keahlian yang sama

---

## **Teknologi yang Digunakan**

| Komponen | Teknologi |
|----------|-----------|
| **Backend** | Python dengan WebSocket (socket & threading) |
| **Frontend** | HTML, CSS, JavaScript |
| **Database** | SQLite |
| **Protocol** | WebSocket dengan JSON serialization |
| **File Transfer** | Base64 chunking (32KB per chunk) |

---

## **Struktur Proyek**

```
TeamFinder/
├── server.py           # Server utama (WebSocket, threading)
├── database.py         # Database handler (SQLite)
├── matchmaker.py       # Matchmaking logic (skill-based)
├── client.js           # Client application UI & logic
├── index.html          # Halaman utama
├── style.css           # Styling (glassmorphism)
├── uploads/            # Folder untuk file yang diupload
├── cert/               # Sertifikat TLS (opsional)
├── benchmark.py        # Load testing tool
├── generate_certs.py   # Generator sertifikat TLS
└── chat_app.db         # Database SQLite (auto-generated)
```

---

## **Cara Menjalankan**

### Prasyarat
- Python 3.7+
- Browser modern (Chrome, Firefox, Edge)

### Langkah-langkah

1. **Clone repository**
```
git clone https://github.com/username/TeamFinder.git
cd TeamFinder
```

2. **Jalankan server**
```
python server.py
```

3. **Buka browser**
```
http://localhost:8000
```

4. **Register & Login**
   - Klik "Register here" untuk buat akun baru
   - Isi username dan password
   - Login dengan akun yang sudah dibuat

---

## **Cara Penggunaan**

### 1. **Chat Room**
- Klik room di sidebar kiri untuk join
- Ketik pesan dan tekan Enter atau klik Send
- Emoji reaction: Hover ke pesan → klik 😊 → pilih emoji

### 2. **Private Message**
- Klik username di "ONLINE USERS"
- Kirim pesan private
- Notifikasi akan muncul (title blink + toast)

### 3. **Upload File**
- Klik tombol 📎
- Pilih file (gambar, PDF, dll) - Max 10MB
- Preview akan muncul, klik "Send File" untuk upload
- Drag & drop file juga didukung

### 4. **Pilih Keahlian**
- Klik tombol "Pilih Keahlian" di sidebar
- Pilih keahlian: Data Management, Data Analysis, Pemrograman Jaringan, Pemrograman Web, Pengembangan Software

### 5. **Matchmaking**
- Klik "Find Match" di panel kanan
- Sistem akan mencari user dengan keahlian yang SAMA
- Setelah match ditemukan, otomatis masuk ke room baru

### 6. **Create Room**
- Klik tombol "+" di samping "Rooms"
- Masukkan nama room baru
- Room akan muncul otomatis untuk semua user

### 7. **Leave Room & Reset**
- Klik "Leave Room" untuk keluar dari room
- Room akan hilang dari daftar (tersimpan di localStorage)
- Klik tombol ↺ untuk mereset dan menampilkan semua room

---

## **Testing**

Jalankan di terminal:
```
python server.py
```
Kemudian buka di browser:
```
http://localhost:8000
```

---

## **Screenshot**

### Login Page


### Main Chat


### Private Message


### File Upload


### Matchmaking


---

## **API Protocol (WebSocket JSON)**

### Client → Server

| Type | Data | Keterangan |
|------|------|-------------|
| `register` | `{username, password}` | Registrasi akun |
| `login` | `{username, password}` | Login |
| `join_room` | `{room_name}` | Join room |
| `leave_room` | `{}` | Leave room saat ini |
| `create_room` | `{room_name}` | Buat room baru |
| `send_msg` | `{room_name, content}` | Kirim pesan ke room |
| `send_pm` | `{recipient, content}` | Kirim private message |
| `add_reaction` | `{message_id, emoji}` | Tambah reaction |
| `start_matchmaking` | `{skill}` | Mulai cari match |
| `cancel_matchmaking` | `{}` | Batal cari match |
| `upload_file_chunk` | `{filename, chunk_index, total_chunks, data}` | Upload chunk file |

### Server → Client

| Type | Data | Keterangan |
|------|------|-------------|
| `auth_response` | `{success, username, mmr}` | Response login/register |
| `room_list` | `{rooms}` | Daftar semua room |
| `online_users` | `{users}` | Daftar user online |
| `chat_history` | `{room_name, history}` | History chat room |
| `pm_history` | `{target_user, history}` | History private chat |
| `message` | `{id, sender, content, timestamp, reactions}` | Pesan baru |
| `reaction_update` | `{message_id, reactions}` | Update reaction |
| `matchmaking_status` | `{status, queue_size}` | Status matchmaking |
| `file_upload_status` | `{filename, progress}` | Progress upload |

---

## **Troubleshooting**

### Port 8000 sudah digunakan
```bash
# Cek proses yang menggunakan port 8000
netstat -ano | findstr :8000

# Kill proses (Windows)
taskkill /PID [PID] /F
```

### WebSocket connection failed
- Pastikan server berjalan (`python server.py`)
- Cek firewall tidak memblokir port 8000

### File upload gagal
- Pastikan folder `uploads/` ada dan writable
- Cek ukuran file tidak melebihi 10MB

---
