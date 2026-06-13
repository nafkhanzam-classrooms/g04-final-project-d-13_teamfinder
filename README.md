[![Review Assignment Due Date](https://classroom.github.com/assets/deadline-readme-button-22041afd0340ce965d47ae6ef1cefeee28c7c493a6346c4f15d667ab976d596c.svg)](https://classroom.github.com/a/4SHtB1vz)

| No | Name | NRP |
| -- | ---  | --- |
| 1 | Kiko | 5025241000 |
| 2 | Shifa Alya Dewi | 5025241176 |
| 3 | Dyah Utami Kesuma Dewi | 5025241186 |

---

# TeamFinder - Real-Time Collaboration Platform

**TeamFinder** adalah platform kolaborasi real-time yang membantu mahasiswa menemukan tim dan anggota proyek untuk PKM, Gemastik, Hackathon, Penelitian, maupun tugas akademik lainnya.

Selain menyediakan fitur komunikasi real-time seperti chat room, private messaging, file sharing, dan emoji reactions, TeamFinder juga menyediakan fitur Project Management sederhana yang memungkinkan pengguna membuat proyek, melihat daftar proyek yang tersedia, dan menemukan rekan tim yang memiliki minat atau keahlian yang sesuai.

---

## **Fitur Utama**

### Fitur Wajib

| Fitur | Keterangan |
|-------|-------------|
| **Authentication** | Login & Register sederhana dengan username/password |
| **Multi Chat Room** | Create, join, leave room dengan auto update |
| **Broadcast Message** | Kirim pesan ke seluruh anggota room |
| **Private Message** | Chat pribadi antar user dengan notifikasi |
| **Online User List** | Lihat siapa yang sedang online (real-time) |
| **Room List** | Daftar semua room yang tersedia |
| **Chat History** | Pesan tersimpan di database SQLite |
| **Timestamp Message** | Waktu pengiriman pesan (HH:MM:SS) |
| **Server Logging** | Log aktivitas server dengan warna |
| **Project Creation** | Membuat project baru lengkap dengan deskripsi dan kebutuhan skill |
| **Project Listing** | Menampilkan seluruh project yang tersedia secara real-time |
| **Project Detail View** | Menampilkan detail project ketika dipilih |

### Fitur Tambahan

| Fitur | Keterangan |
|-------|-------------|
| **File Transfer** | Upload/download file (gambar, PDF, dll) dengan chunking 32KB |
| **Emoji/Reaction** | React ke pesan dengan emoji (👍❤️😂😮😢🔥) |
| **Database Persistence** | Pesan dan user tersimpan di SQLite |
| **Skill-Based Matchmaking** | Cari tim berdasarkan keahlian yang sama |
| **TeamFinder Project Board** | Dashboard project sederhana untuk mencari anggota tim |

---

## **Teknologi yang Digunakan**

| Komponen | Teknologi |
|----------|-----------|
| **Backend** | Python dengan WebSocket (socket & threading) |
| **Frontend** | HTML, CSS, JavaScript (Glassmorphism) |
| **Database** | SQLite dengan WAL mode |
| **Protocol** | WebSocket dengan JSON serialization |
| **File Transfer** | Base64 chunking (32KB per chunk) |
| **Matchmaking** | Skill-based queue dengan threading |

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
```bash
git clone https://github.com/username/TeamFinder.git
cd TeamFinder
```

2. **Jalankan server**
```bash
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

### 1. Chat Room
- Klik room di sidebar kiri untuk join
- Ketik pesan dan tekan Enter atau klik Send
- Emoji reaction: Hover ke pesan → klik 😊 → pilih emoji

### 2. Private Message
- Klik username di "ONLINE USERS"
- Kirim pesan private
- Notifikasi akan muncul (title blink + toast + badge)

### 3. Upload File
- Klik tombol 📎
- Pilih file (gambar, PDF, dll) - Max 10MB
- Preview akan muncul, klik "Send File" untuk upload
- Drag & drop file juga didukung

### 4. Pilih Keahlian
- Klik tombol "Pilih Keahlian" di sidebar
- Pilih keahlian yang sesuai

| Keahlian | Level |
|----------|-------|
| Data Management | Beginner |
| Data Analysis | Intermediate |
| Pemrograman Jaringan | Advanced |
| Pemrograman Web | Expert |
| Pengembangan Software | Master |

### 5. Matchmaking
- Klik "Find Match" di panel kanan
- Sistem akan mencari user dengan **keahlian yang SAMA**
- Setelah match ditemukan, otomatis masuk ke room baru

### 6. Create Room
- Klik tombol "+" di samping "Rooms"
- Masukkan nama room baru
- Room akan muncul otomatis untuk semua user (tanpa refresh)

### 7. Create Project

- Klik tombol "+" pada bagian Projects
- Masukkan:
  - Judul Project
  - Deskripsi Project
  - Skill yang Dibutuhkan
- Klik tombol Create
- Project akan langsung muncul pada daftar Projects

### 8. View Project

- Klik salah satu project pada sidebar
- Detail project akan ditampilkan pada panel utama
- Pengguna dapat melihat:
  - Nama project
  - Deskripsi
  - Skill yang dibutuhkan
  - Pemilik project

### 9. Leave Room & Reset
- Klik "Leave Room" untuk keluar dari room
- Room akan hilang dari daftar (tersimpan di localStorage)
- Klik tombol ↺ untuk mereset dan menampilkan semua room

---

## **Testing & Benchmark**

### Running Server
```
python server.py
```

### Running Client
Buka browser ke:
```
http://localhost:8000
```

### Load Testing (Benchmark)
```
python benchmark.py --clients 10 --messages 5
```

**Hasil Benchmark:**

| Metrik | Hasil |
|--------|-------|
| Concurrent Clients | 10 |
| Messages per Client | 5 |
| Total Messages | 50 |
| Total Duration | 4.13 detik |
| Success Rate | 100% |
| Avg Latency | 269.79 ms |
| Throughput | 12.10 msg/sec |

---

## **Screenshot**

### Login Page
<img width="1315" height="651" alt="image" src="https://github.com/user-attachments/assets/84789310-64b1-4084-af2e-7417e3458025" />

### Register Page
<img width="1317" height="652" alt="image" src="https://github.com/user-attachments/assets/53aebf04-fb94-4c22-9323-d129408498c7" />

### Main Chat
<img width="1316" height="654" alt="image" src="https://github.com/user-attachments/assets/b24afade-1dc8-490b-a6e7-86989890f4ec" />

### Private Message
<img width="1316" height="652" alt="image" src="https://github.com/user-attachments/assets/fd82cf28-1129-429d-85e8-6f4078778209" />

### File Upload Modal
<img width="1316" height="654" alt="image" src="https://github.com/user-attachments/assets/eff26674-11ad-4f88-9631-e258241bcf59" />
<img width="1317" height="654" alt="image" src="https://github.com/user-attachments/assets/27984418-1421-4af2-8c98-d81abeff4f1f" />

### Matchmaking
<img width="1316" height="654" alt="image" src="https://github.com/user-attachments/assets/780d7028-fe4b-4258-96af-c54d063699ac" />

### Create Project Modal
<img width="1317" height="652" alt="image" src="https://github.com/user-attachments/assets/bbf520ef-77bd-468c-be9e-09398d965449" />

### Project List & Detail
<img width="1315" height="653" alt="image" src="https://github.com/user-attachments/assets/4817d77a-2ebe-4a3d-824c-a949eed609f4" />


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
| `create_project` | `{title, description, required_skill}` | Membuat project baru |
| `get_projects` | `{}` | Mengambil daftar project |

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
| `project_list` | `{projects}` | Daftar seluruh project |
| `project_created` | `{}` | Konfirmasi project berhasil dibuat |

---

## **Troubleshooting**

### Port 8000 sudah digunakan
```
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

### Cannot read property 'addEventListener' of null
- Pastikan menggunakan versi client.js terbaru
- Hard refresh browser (Ctrl+Shift+R)

---

## **Kredit**

Dibuat untuk tugas akhir mata kuliah **Pemrograman Jaringan**.

```
TeamFinder - Real-Time Collaboration Platform
Find your team, collaborate better.
```

---
