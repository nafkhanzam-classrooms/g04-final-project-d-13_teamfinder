console.log('[TeamFinder] Client starting - FINAL COMPLETE VERSION');

// ========== CLIENT-SIDE PROTOCOL PARSER ==========
const ProtocolParser = {
    serialize(type, data) { return JSON.stringify({ type, ...data }); },
    deserialize(raw) {
        try { return JSON.parse(raw); } catch (e) { return null; }
    }
};

// ========== GLOBAL STATE ==========
let socket = null;
let currentUser = null;
let currentUserMmr = 1000;
let currentUserSkillText = 'Data Analysis';
let activeChat = null;
let leftRooms = new Set();
let allRooms = [];
let isMatchmaking = false;
let matchmakerTimer = null;
let matchmakerSeconds = 0;
let activeReactionMessageId = null;
let pendingUploadFile = null;
let currentUploadFile = null;
let uploadCancelled = false;
const CHUNK_SIZE = 32 * 1024;

// Map MMR ke Teks Keahlian
const skillMap = {
    500: 'Data Management',
    1000: 'Data Analysis',
    1500: 'Pemrograman Jaringan',
    2000: 'Pemrograman Web',
    2500: 'Pengembangan Software'
};

// ========== DOM ELEMENTS ==========
const authSection = document.getElementById('auth-section');
const appSection = document.getElementById('app-section');
const authForm = document.getElementById('auth-form');
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authToggleLink = document.getElementById('auth-toggle-link');
const authToggleMsg = document.getElementById('auth-toggle-msg');
const authAlert = document.getElementById('auth-alert');
const userAvatar = document.getElementById('user-avatar');
const userDisplayName = document.getElementById('user-display-name');
const userDisplayMmr = document.getElementById('user-display-mmr');
const matchmakerUserMmr = document.getElementById('matchmaker-user-mmr');
const roomListContainer = document.getElementById('room-list-container');
const onlineUsersContainer = document.getElementById('online-users-container');
const chatMessagesContainer = document.getElementById('chat-messages-container');
const activeChatTitle = document.getElementById('active-chat-title');
const activeChatStatus = document.getElementById('active-chat-status');
const chatMessageInput = document.getElementById('chat-message-input');
const sendMessageBtn = document.getElementById('send-message-btn');
const leaveRoomBtn = document.getElementById('leave-room-btn');
const matchmakingActionBtn = document.getElementById('matchmaking-action-btn');
const matchmakingStatusCard = document.getElementById('matchmaking-status-card');
const queueTimerText = document.querySelector('.queue-timer');
const queueStatusText = document.getElementById('queue-status-text');
const matchFoundOverlay = document.getElementById('match-found-overlay');
const matchedOpponentInfo = document.getElementById('matched-opponent-info');
const createRoomModal = document.getElementById('create-room-modal');
const openCreateRoomBtn = document.getElementById('open-create-room-modal');
const closeCreateRoomBtn = document.getElementById('close-create-room-modal');
const createRoomSubmitBtn = document.getElementById('create-room-submit-btn');
const newRoomNameInput = document.getElementById('new-room-name-input');
const emojiPickerOverlay = document.getElementById('emoji-picker-overlay');
const logoutBtn = document.getElementById('logout-btn');
const projectListContainer = document.getElementById("project-list-container");
const createProjectModal = document.getElementById("create-project-modal");
const openCreateProjectBtn =
    document.getElementById(
        "open-create-project-modal"
    );

const closeCreateProjectBtn =
    document.getElementById(
        "close-create-project-modal"
    );

const createProjectSubmitBtn =
    document.getElementById(
        "create-project-submit-btn"
    );

const projectTitleInput =
    document.getElementById(
        "project-title-input"
    );

const projectDescriptionInput =
    document.getElementById(
        "project-description-input"
    );

const projectSkillInput =
    document.getElementById(
        "project-skill-input"
    );
// File input untuk upload
const fileInput = document.createElement('input');
fileInput.type = 'file';
fileInput.style.display = 'none';
document.body.appendChild(fileInput);

// Progress container
let uploadProgressContainer = document.getElementById('upload-progress-container');
if (!uploadProgressContainer) {
    uploadProgressContainer = document.createElement('div');
    uploadProgressContainer.id = 'upload-progress-container';
    uploadProgressContainer.className = 'upload-progress-container';
    uploadProgressContainer.style.display = 'none';
    uploadProgressContainer.innerHTML = `
        <div class="progress-header"><span>Uploading...</span><span id="upload-progress-text">0%</span></div>
        <div class="progress-bar-track"><div id="upload-progress-fill" class="progress-bar-fill" style="width:0%"></div></div>
    `;
    const chatInputArea = document.querySelector('.chat-input-area');
    if (chatInputArea) chatInputArea.appendChild(uploadProgressContainer);
}
const uploadProgressFill = document.getElementById('upload-progress-fill');
const uploadProgressText = document.getElementById('upload-progress-text');

// Buat modal upload preview custom
let uploadModal = document.getElementById('upload-preview-modal');
if (!uploadModal) {
    uploadModal = document.createElement('div');
    uploadModal.id = 'upload-preview-modal';
    uploadModal.className = 'modal-overlay';
    uploadModal.style.display = 'none';
    uploadModal.innerHTML = `
        <div class="modal-box glass-panel" style="max-width: 500px;">
            <h3 class="modal-title">📎 Confirm Upload</h3>
            <div id="upload-preview-content" style="margin: 16px 0;">
                <p><strong>File:</strong> <span id="preview-filename"></span></p>
                <p><strong>Size:</strong> <span id="preview-filesize"></span></p>
                <p><strong>Destination:</strong> <span id="preview-destination"></span></p>
                <div id="preview-image" style="max-width: 100%; margin-top: 10px;"></div>
            </div>
            <div class="modal-actions">
                <button id="cancel-upload-btn" class="btn btn-secondary">Cancel</button>
                <button id="confirm-upload-btn" class="btn">Send File</button>
            </div>
        </div>
    `;
    document.body.appendChild(uploadModal);
}

// Tombol attach file
let attachFileBtn = document.getElementById('attach-file-btn');
if (!attachFileBtn) {
    const inputRow = document.querySelector('.input-container-row');
    if (inputRow) {
        attachFileBtn = document.createElement('button');
        attachFileBtn.id = 'attach-file-btn';
        attachFileBtn.className = 'input-action-btn';
        attachFileBtn.innerHTML = '📎';
        attachFileBtn.title = 'Attach File';
        inputRow.insertBefore(attachFileBtn, chatMessageInput);
    }
}

// ========== UTILITY ==========
function showAlert(message, type = 'error') {
    if (authAlert) {
        authAlert.innerText = message;
        authAlert.className = `alert-box alert-${type}`;
        authAlert.style.display = 'block';
        setTimeout(() => { if (authAlert) authAlert.style.display = 'none'; }, 5000);
    }
}

function hideAlert() { if (authAlert) authAlert.style.display = 'none'; }

function scrollChatToBottom() {
    if (chatMessagesContainer) chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function loadLeftRooms() {
    const saved = localStorage.getItem(`teamfinder_leftRooms_${currentUser}`);
    if (saved) {
        leftRooms = new Set(JSON.parse(saved));
        console.log('[Storage] Loaded left rooms:', [...leftRooms]);
    }
}

function saveLeftRooms() {
    if (currentUser) {
        localStorage.setItem(`teamfinder_leftRooms_${currentUser}`, JSON.stringify([...leftRooms]));
    }
}

// ========== FUNGSI UNTUK MENGHAPUS INDICATOR NOTIFIKASI ==========
function removeNotificationIndicator(username) {
    console.log('[NOTIF] Removing indicator for:', username);
    const allItems = document.querySelectorAll('#online-users-container .list-item');
    allItems.forEach(item => {
        if (item.textContent.includes(username)) {
            const indicator = item.querySelector('.new-msg-indicator');
            if (indicator) {
                console.log('[NOTIF] Indicator removed for:', username);
                indicator.remove();
            }
        }
    });
}

// ========== FITUR EDIT KEAHLIAN ==========
function showSkillModal() {
    let skillModal = document.getElementById('skill-modal');
    if (!skillModal) {
        skillModal = document.createElement('div');
        skillModal.id = 'skill-modal';
        skillModal.className = 'modal-overlay';
        skillModal.style.display = 'none';
        skillModal.innerHTML = `
            <div class="modal-box glass-panel" style="max-width: 400px;">
                <h3 class="modal-title">Pilih Keahlian</h3>
                <div id="skill-content" style="margin: 16px 0;">
                    <p style="margin-bottom: 8px;">Pilih keahlian Anda:</p>
                    <select id="skill-select" class="input-field" style="width: 100%;">
                        <option value="500">Data Management</option>
                        <option value="1000" selected>Data Analysis</option>
                        <option value="1500">Pemrograman Jaringan</option>
                        <option value="2000">Pemrograman Web</option>
                        <option value="2500">Pengembangan Software</option>
                    </select>
                </div>
                <div class="modal-actions">
                    <button id="close-skill-modal" class="btn btn-secondary">Cancel</button>
                    <button id="save-skill-btn" class="btn">Simpan Keahlian</button>
                </div>
            </div>
        `;
        document.body.appendChild(skillModal);
        
        document.getElementById('close-skill-modal').onclick = () => {
            skillModal.style.display = 'none';
        };
        
        document.getElementById('save-skill-btn').onclick = () => {
            const select = document.getElementById('skill-select');
            let newMmr = parseInt(select.value);
            
            if (!isNaN(newMmr) && newMmr >= 100 && newMmr <= 3000) {
                updateUserMmr(newMmr);
                skillModal.style.display = 'none';
            } else {
                showAlert('Pilih keahlian yang valid', 'error');
            }
        };
    }
    
    const select = document.getElementById('skill-select');
    if (select) {
        for (let i = 0; i < select.options.length; i++) {
            if (parseInt(select.options[i].value) === currentUserMmr) {
                select.selectedIndex = i;
                break;
            }
        }
    }
    
    skillModal.style.display = 'flex';
}

function updateUserMmr(newMmr) {
    console.log('[SKILL] Updating MMR:', currentUserMmr, '->', newMmr);
    
    sendToServer('update_mmr', { mmr: newMmr });
    
    currentUserMmr = newMmr;
    currentUserSkillText = skillMap[newMmr] || 'Data Analysis';
    
    // Tampilkan teks keahlian, bukan angka
    if (userDisplayMmr) userDisplayMmr.innerText = `Keahlian: ${currentUserSkillText}`;
    if (matchmakerUserMmr) matchmakerUserMmr.innerText = currentUserSkillText;
    
    appendSystemMessage(`Keahlian diperbarui: ${currentUserSkillText}`);
}

function addEditSkillButton() {
    if (document.querySelector('.edit-skill-btn')) return;
    
    // Tampilkan teks keahlian di sidebar
    currentUserSkillText = skillMap[currentUserMmr] || 'Data Analysis';
    if (userDisplayMmr) userDisplayMmr.innerText = `Keahlian: ${currentUserSkillText}`;
    if (matchmakerUserMmr) matchmakerUserMmr.innerText = currentUserSkillText;
    
    const editBtn = document.createElement('button');
    editBtn.innerHTML = 'Pilih Keahlian';
    editBtn.className = 'edit-skill-btn';
    editBtn.style.cssText = 'margin-top: 6px; background: none; border: 1px solid var(--accent-cyan); border-radius: 20px; padding: 4px 10px; font-size: 0.7rem; cursor: pointer; color: var(--accent-cyan); width: 100%;';
    editBtn.onclick = showSkillModal;
    
    const profileInfo = document.querySelector('.profile-info');
    if (profileInfo) {
        profileInfo.appendChild(editBtn);
    }
}

// ========== AUTH MODE ==========
let isRegisterMode = false;

if (authToggleLink) {
    authToggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        isRegisterMode = !isRegisterMode;
        hideAlert();
        
        if (isRegisterMode) {
            if (authTitle) authTitle.innerText = 'Create Account';
            if (authSubtitle) authSubtitle.innerText = 'Register for TeamFinder';
            const span = authSubmitBtn?.querySelector('span');
            if (span) span.innerText = 'Register';
            if (authToggleMsg) authToggleMsg.innerText = 'Already have an account?';
            if (authToggleLink) authToggleLink.innerText = 'Login here';
        } else {
            if (authTitle) authTitle.innerText = 'TeamFinder';
            if (authSubtitle) authSubtitle.innerText = 'Real-Time Collaboration Platform';
            const span = authSubmitBtn?.querySelector('span');
            if (span) span.innerText = 'Login';
            if (authToggleMsg) authToggleMsg.innerText = "Don't have an account?";
            if (authToggleLink) authToggleLink.innerText = 'Register here';
        }
    });
}

if (authForm) {
    authForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = usernameInput ? usernameInput.value.trim() : '';
        const password = passwordInput ? passwordInput.value : '';
        
        if (!username || !password) { 
            showAlert('Please fill all fields'); 
            return; 
        }
        hideAlert();
        
        if (authSubmitBtn) {
            authSubmitBtn.disabled = true;
            const span = authSubmitBtn.querySelector('span');
            if (span) span.innerText = isRegisterMode ? 'Registering...' : 'Logging in...';
        }
        
        initWebSocket(() => {
            sendToServer(isRegisterMode ? 'register' : 'login', { username, password });
        });
    });
}

// ========== WEBSOCKET ==========
function initWebSocket(onOpenCallback) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
    socket.onopen = () => { console.log('[WS] Connected'); if (onOpenCallback) onOpenCallback(); };
    socket.onmessage = (e) => { const msg = ProtocolParser.deserialize(e.data); if (msg) handleServerMessage(msg); };
    socket.onerror = () => showAlert('Connection error');
    socket.onclose = () => handleDisconnect();
}

function sendToServer(type, data) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(ProtocolParser.serialize(type, data));
    }
}

function resetAuthButton() {
    if (authSubmitBtn) {
        authSubmitBtn.disabled = false;
        const span = authSubmitBtn.querySelector('span');
        if (span) span.innerText = isRegisterMode ? 'Register' : 'Login';
    }
}

function handleDisconnect() {
    socket = null;
    currentUser = null;
    activeChat = null;
    isMatchmaking = false;
    if (matchmakerTimer) clearInterval(matchmakerTimer);
    if (appSection) appSection.style.display = 'none';
    if (authSection) authSection.style.display = 'flex';
    resetAuthButton();
}

// ========== UPLOAD FILE ==========
function addCancelButtonToUpload() {
    const container = document.getElementById('upload-progress-container');
    if (container && !container.querySelector('.cancel-upload-btn')) {
        const cancelBtn = document.createElement('button');
        cancelBtn.innerHTML = '✕ Cancel';
        cancelBtn.className = 'cancel-upload-btn';
        cancelBtn.style.cssText = 'background: none; border: 1px solid var(--error); color: var(--error); border-radius: 20px; padding: 2px 10px; margin-left: 10px; cursor: pointer; font-size: 0.7rem;';
        cancelBtn.onclick = () => {
            uploadCancelled = true;
            if (uploadProgressContainer) uploadProgressContainer.style.display = 'none';
            showAlert('Upload cancelled', 'warning');
        };
        const header = container.querySelector('.progress-header');
        if (header) header.appendChild(cancelBtn);
    }
}

async function uploadFile(file) {
    if (!activeChat) { showAlert('Join a room first'); return; }
    
    if (file.size > 10 * 1024 * 1024) {
        showAlert('File too large! Max 10MB');
        return;
    }
    
    uploadCancelled = false;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    console.log(`[UPLOAD] Starting: ${file.name}, ${totalChunks} chunks`);
    
    if (uploadProgressContainer) {
        uploadProgressContainer.style.display = 'block';
        addCancelButtonToUpload();
        if (uploadProgressFill) uploadProgressFill.style.width = '0%';
        if (uploadProgressText) uploadProgressText.innerText = '0%';
    }
    
    for (let i = 0; i < totalChunks; i++) {
        if (uploadCancelled) {
            console.log('[UPLOAD] Cancelled by user');
            if (uploadProgressContainer) uploadProgressContainer.style.display = 'none';
            return;
        }
        
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        
        const chunkData = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.readAsDataURL(chunk);
        });
        
        let chunkSent = false;
        let retries = 0;
        while (!chunkSent && retries < 3) {
            try {
                sendToServer('upload_file_chunk', { 
                    filename: file.name, 
                    chunk_index: i, 
                    total_chunks: totalChunks, 
                    data: chunkData, 
                    room_name: activeChat.type === 'room' ? activeChat.target : null, 
                    recipient: activeChat.type === 'pm' ? activeChat.target : null 
                });
                chunkSent = true;
            } catch (e) {
                retries++;
                console.log(`[UPLOAD] Retry chunk ${i}, attempt ${retries}`);
                await new Promise(r => setTimeout(r, 500));
            }
        }
        
        const progress = Math.floor(((i + 1) / totalChunks) * 100);
        if (uploadProgressFill) uploadProgressFill.style.width = `${progress}%`;
        if (uploadProgressText) uploadProgressText.innerText = `${progress}%`;
        
        await new Promise(r => setTimeout(r, 20));
    }
    
    if (!uploadCancelled) {
        appendSystemMessage(`📎 Uploaded: ${file.name}`);
    }
    
    if (uploadProgressContainer) uploadProgressContainer.style.display = 'none';
}

// ========== ATTACH FILE EVENT DENGAN MODAL CUSTOM ==========
if (attachFileBtn) {
    attachFileBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        pendingUploadFile = file;
        
        const previewFilename = document.getElementById('preview-filename');
        const previewFilesize = document.getElementById('preview-filesize');
        const previewDestination = document.getElementById('preview-destination');
        const previewImage = document.getElementById('preview-image');
        
        if (previewFilename) previewFilename.innerText = file.name;
        if (previewFilesize) previewFilesize.innerText = `${(file.size/1024).toFixed(1)} KB`;
        if (previewDestination) {
            previewDestination.innerText = activeChat ? 
                (activeChat.type === 'room' ? `#${activeChat.target}` : `@${activeChat.target}`) : 'Select a chat first';
        }
        
        if (previewImage) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    previewImage.innerHTML = `<img src="${e.target.result}" style="max-width: 100%; max-height: 150px; border-radius: 8px;">`;
                };
                reader.readAsDataURL(file);
            } else {
                previewImage.innerHTML = `<div style="text-align: center; padding: 20px;">${file.type || 'Document'}</div>`;
            }
        }
        
        const modal = document.getElementById('upload-preview-modal');
        if (modal) modal.style.display = 'flex';
        
        fileInput.value = '';
    });
    
    const cancelUploadBtn = document.getElementById('cancel-upload-btn');
    if (cancelUploadBtn) {
        cancelUploadBtn.onclick = () => {
            pendingUploadFile = null;
            const modal = document.getElementById('upload-preview-modal');
            if (modal) modal.style.display = 'none';
            showAlert('Upload cancelled', 'warning');
        };
    }
    
    const confirmUploadBtn = document.getElementById('confirm-upload-btn');
    if (confirmUploadBtn) {
        confirmUploadBtn.onclick = async () => {
            if (pendingUploadFile) {
                await uploadFile(pendingUploadFile);
                pendingUploadFile = null;
            }
            const modal = document.getElementById('upload-preview-modal');
            if (modal) modal.style.display = 'none';
        };
    }
    
    const chatPane = document.querySelector('.chat-pane');
    if (chatPane) {
        chatPane.addEventListener('dragover', (e) => { e.preventDefault(); chatPane.classList.add('drag-over'); });
        chatPane.addEventListener('dragleave', () => { chatPane.classList.remove('drag-over'); });
        chatPane.addEventListener('drop', async (e) => { 
            e.preventDefault(); 
            chatPane.classList.remove('drag-over'); 
            const file = e.dataTransfer.files[0];
            if (file) {
                pendingUploadFile = file;
                const modal = document.getElementById('upload-preview-modal');
                if (modal) modal.style.display = 'flex';
            }
        });
    }
}

// ========== SERVER MESSAGE HANDLER ==========
function handleServerMessage(msg) {
    switch (msg.type) {
        case 'auth_response':
            resetAuthButton();
            if (msg.success) {
                if (isRegisterMode) {
                    showAlert(msg.message, 'success');
                    isRegisterMode = false;
                    if (authTitle) authTitle.innerText = 'TeamFinder';
                    const span = authSubmitBtn?.querySelector('span');
                    if (span) span.innerText = 'Login';
                    if (authToggleMsg) authToggleMsg.innerText = "Don't have an account?";
                    if (authToggleLink) authToggleLink.innerText = 'Register here';
                    if (passwordInput) passwordInput.value = '';
                } else {
                    currentUser = msg.username;
                    currentUserMmr = msg.mmr;
                    currentUserSkillText = skillMap[currentUserMmr] || 'Data Analysis';
                    loadLeftRooms();
                    
                    if (userDisplayName) userDisplayName.innerText = currentUser;
                    if (userAvatar) userAvatar.innerText = currentUser.charAt(0).toUpperCase();
                    if (userDisplayMmr) userDisplayMmr.innerText = `Keahlian: ${currentUserSkillText}`;
                    if (matchmakerUserMmr) matchmakerUserMmr.innerText = currentUserSkillText;
                    if (authSection) authSection.style.display = 'none';
                    if (appSection) appSection.style.display = 'grid';
                    
                    setTimeout(() => addResetLeftRoomsButton(), 100);
                    setTimeout(() => addEditSkillButton(), 100);
                    setTimeout(() => joinRoom('General'), 500);
                    socket.send(
                        JSON.stringify({
                            type: "get_projects"
                        })
                    );
                }
            } else showAlert(msg.message, 'error');
            break;
            
        case 'force_logout': 
            showAlert(msg.message, 'warning'); 
            handleDisconnect(); 
            break;
            
        case 'room_list':
            allRooms = msg.rooms;
            renderRooms();
            if (activeChat && activeChat.type === 'room') {
                const roomStillExists = allRooms.some(r => r.name === activeChat.target);
                if (!roomStillExists && !leftRooms.has(activeChat.target)) {
                    appendSystemMessage(`Room "${activeChat.target}" no longer exists`);
                    activeChat = null;
                    if (activeChatTitle) activeChatTitle.innerText = 'Select a room or user';
                    if (chatMessageInput) chatMessageInput.disabled = true;
                    if (sendMessageBtn) sendMessageBtn.disabled = true;
                    if (leaveRoomBtn) leaveRoomBtn.style.display = 'none';
                }
            }
            break;
            
        case 'online_users':
            renderOnlineUsers(msg.users);
            if (activeChat && activeChat.type === 'pm' && activeChatStatus) {
                const userStillOnline = msg.users.some(u => u.username === activeChat.target);
                if (!userStillOnline) {
                    activeChatStatus.innerText = 'User offline';
                    activeChatStatus.style.color = 'var(--warning)';
                } else {
                    activeChatStatus.innerText = 'Private Message - Online';
                    activeChatStatus.style.color = 'var(--text-muted)';
                }
            }
            break;
            
        case 'chat_history':
            if (activeChat?.type === 'room' && activeChat.target === msg.room_name) renderChatHistory(msg.history);
            break;
            
        case 'pm_history':
            if (activeChat?.type === 'pm' && activeChat.target === msg.target_user) renderChatHistory(msg.history);
            break;
            
        case 'mmr_updated':
            if (msg.username === currentUser) {
                currentUserMmr = msg.new_mmr;
                currentUserSkillText = skillMap[currentUserMmr] || 'Data Analysis';
                if (userDisplayMmr) userDisplayMmr.innerText = `Keahlian: ${currentUserSkillText}`;
                if (matchmakerUserMmr) matchmakerUserMmr.innerText = currentUserSkillText;
                appendSystemMessage(`Keahlian diperbarui: ${currentUserSkillText}`);
            }
            break;
            
        case 'message':
            const isRelevantRoom = activeChat?.type === 'room' && msg.room_name === activeChat.target;
            const isRelevantPM = activeChat?.type === 'pm' && (msg.sender === activeChat.target || msg.recipient === activeChat.target);
            
            if (!isRelevantPM && msg.recipient === currentUser && msg.sender !== currentUser) {
                console.log('[NOTIF] New PM from:', msg.sender);
                
                let originalTitle = document.title;
                document.title = `💬 NEW from ${msg.sender}! 💬`;
                setTimeout(() => { document.title = originalTitle; }, 5000);
                
                const toast = document.createElement('div');
                toast.className = 'message-system';
                toast.style.cssText = 'background: linear-gradient(135deg, rgba(0,229,255,0.3), rgba(179,136,255,0.3)); border: 2px solid #00e5ff; border-radius: 24px; padding: 12px 20px; margin: 8px 0; cursor: pointer;';
                toast.innerHTML = `<strong>${escapeHtml(msg.sender)}</strong> sent you a message!<br><span style="font-size:0.7rem;">Click to reply →</span>`;
                toast.onclick = () => {
                    removeNotificationIndicator(msg.sender);
                    startPrivateChat(msg.sender);
                };
                if (chatMessagesContainer) {
                    chatMessagesContainer.appendChild(toast);
                    setTimeout(() => toast.remove(), 8000);
                }
                
                const allItems = document.querySelectorAll('#online-users-container .list-item');
                allItems.forEach(item => {
                    if (item.textContent.includes(msg.sender)) {
                        let indicator = item.querySelector('.new-msg-indicator');
                        if (!indicator) {
                            indicator = document.createElement('span');
                            indicator.className = 'new-msg-indicator';
                            indicator.innerHTML = ' 💬';
                            indicator.style.color = '#00e5ff';
                            indicator.style.animation = 'blink 1s infinite';
                            item.appendChild(indicator);
                        }
                    }
                });
            }
            
            if (isRelevantRoom || isRelevantPM) { 
                appendMessage(msg); 
                scrollChatToBottom(); 
            }
            break;
            
        case 'reaction_update': 
            updateMessageReactions(msg.message_id, msg.reactions); 
            break;
            
        case 'user_joined':
            if (activeChat?.type === 'room' && activeChat.target === msg.room_name) 
                appendSystemMessage(`${msg.username} joined the room`);
            break;
            
        case 'user_left':
            if (activeChat?.type === 'room' && activeChat.target === msg.room_name) 
                appendSystemMessage(`${msg.username} left the room`);
            break;
            
        case 'matchmaking_status': 
            handleMatchmakingStatus(msg); 
            break;
            
        case 'file_upload_status':
            if (uploadProgressContainer && msg.progress >= 100) {
                uploadProgressContainer.style.display = 'none';
                if (uploadProgressFill) uploadProgressFill.style.width = '0%';
            }
            break;

        case "project_list":

            renderProjects(
                msg.projects
            );

            break;

        case 'join_request_status':
            showAlert(msg.message || (msg.success ? 'Request sent' : 'Request failed'), msg.success ? 'success' : 'error');
            break;

        case 'join_request_received':
            // Owner got a request while online
            if (currentUser && msg.project_title) {
                appendSystemMessage(`New join request from ${msg.requester_username} for "${msg.project_title}"`);
            }
            break;

        case 'join_requests':
            renderJoinRequests(msg.requests);
            break;

        case 'join_request_resolved':
            if (msg.decision === 'accepted' && msg.room_name) {
                // Requester: auto-join the project chat
                appendSystemMessage(`✅ Join accepted for "${msg.project_title}". Joining chat...`);
                setTimeout(() => joinRoom(msg.room_name), 200);
            } else if (msg.decision === 'rejected') {
                appendSystemMessage(`❌ Join rejected for "${msg.project_title}".`);
            }

            // If owner is currently viewing the requests panel, refresh it
            // (safe even if panel not visible)
            sendToServer('list_join_requests', {});
            break;

        case 'room_renamed':
            // If I'm currently in the old room, hop to the new one.
            if (activeChat?.type === 'room' && activeChat.target === msg.old_room_name) {
                appendSystemMessage(`Room renamed to "${msg.new_room_name}". Re-joining...`);
                setTimeout(() => joinRoom(msg.new_room_name), 100);
            } else {
                appendSystemMessage(`Room renamed: "${msg.old_room_name}" → "${msg.new_room_name}"`);
            }
            break;
            
        case 'error': 
            showAlert(`Error: ${msg.message}`); 
            break;
    }
}

// ========== RENDER UI ==========
function renderRooms() {
    if (!roomListContainer) return;
    roomListContainer.innerHTML = '';
    const visibleRooms = allRooms.filter(room => !leftRooms.has(room.name));
    visibleRooms.forEach(room => {
        const item = document.createElement('div');
        item.className = 'list-item';
        if (activeChat?.type === 'room' && activeChat.target === room.name) item.classList.add('active');
        item.innerHTML = `<span># ${escapeHtml(room.name)}</span>`;
        item.onclick = () => joinRoom(room.name);
        roomListContainer.appendChild(item);
    });
}

function renderProjects(projects) {

    projectListContainer.innerHTML = "";

    projects.forEach(project => {

        const item =
            document.createElement("div");

        item.className = "list-item";

        item.innerText =
            project.title;

        item.addEventListener(
            "click",
            () => {

                const isOwner = currentUser && project.owner_username === currentUser;
                const actionsHtml = isOwner
                    ? `
                        <div style="display:flex; gap:10px; flex-wrap:wrap; margin-top:15px;">
                            <button id="view-join-requests-btn" class="btn">View Join Requests</button>
                            <button id="rename-project-room-btn" class="btn btn-secondary">Rename Chat Room</button>
                        </div>
                      `
                    : `<button id="join-project-btn" class="btn" style="margin-top:15px;">Request to Join</button>`;

                activeChatTitle.innerText =
                    project.title;

                activeChatStatus.innerText =
                    `Need: ${project.required_skill}`;

                chatMessagesContainer.innerHTML = `
                    <div style="padding:20px">

                        <h2>
                            ${project.title}
                        </h2>

                        <p>
                            ${project.description}
                        </p>

                        <hr>

                        <p>
                            <b>Required Skill:</b>
                            ${project.required_skill}
                        </p>

                        <p>
                            <b>Owner:</b>
                            ${project.owner_username}
                        </p>

                        ${actionsHtml}

                        <div id="join-requests-panel" style="margin-top:16px;"></div>

                    </div>
                `;

                // Wire actions
                if (isOwner) {
                    const btn = document.getElementById('view-join-requests-btn');
                    if (btn) {
                        btn.onclick = () => {
                            sendToServer('list_join_requests', {});
                            const panel = document.getElementById('join-requests-panel');
                            if (panel) panel.innerHTML = '<div class="message-system">Loading requests...</div>';
                        };
                    }

                    const renameBtn = document.getElementById('rename-project-room-btn');
                    if (renameBtn) {
                        renameBtn.onclick = () => {
                            const newName = prompt('New chat room name (max 30 chars):');
                            if (!newName) return;
                            sendToServer('rename_project_room', { project_id: project.id, new_room_name: newName });
                        };
                    }
                } else {
                    const btn = document.getElementById('join-project-btn');
                    if (btn) {
                        btn.onclick = () => {
                            sendToServer('request_join_project', { project_id: project.id });
                            btn.disabled = true;
                            btn.innerText = 'Request sent...';
                        };
                    }
                }
            }
        );

        projectListContainer.appendChild(
            item
        );
    });
}

function renderJoinRequests(requests) {
    const panel = document.getElementById('join-requests-panel');
    if (!panel) return;
    if (!requests || requests.length === 0) {
        panel.innerHTML = '<div class="message-system">No pending requests.</div>';
        return;
    }

    panel.innerHTML = `
        <div class="message-system" style="margin-bottom:10px;">Pending requests</div>
        <div id="join-requests-list"></div>
    `;
    const list = document.getElementById('join-requests-list');
    if (!list) return;

    requests.forEach(r => {
        const row = document.createElement('div');
        row.className = 'list-item';
        row.style.cssText = 'display:flex; align-items:center; justify-content:space-between; gap:10px;';
        row.innerHTML = `
            <div>
                <div style="font-weight:600;">${escapeHtml(r.requester_username)}</div>
                <div style="opacity:0.8; font-size:0.85rem;">${escapeHtml(r.project_title || '')}</div>
            </div>
            <div style="display:flex; gap:8px;">
                <button class="btn btn-secondary" data-action="reject">Reject</button>
                <button class="btn" data-action="accept">Accept</button>
            </div>
        `;

        const acceptBtn = row.querySelector('button[data-action="accept"]');
        const rejectBtn = row.querySelector('button[data-action="reject"]');
        if (acceptBtn) {
            acceptBtn.onclick = () => {
                sendToServer('resolve_join_request', { request_id: r.request_id, decision: 'accepted' });
                acceptBtn.disabled = true;
                if (rejectBtn) rejectBtn.disabled = true;
            };
        }
        if (rejectBtn) {
            rejectBtn.onclick = () => {
                sendToServer('resolve_join_request', { request_id: r.request_id, decision: 'rejected' });
                rejectBtn.disabled = true;
                if (acceptBtn) acceptBtn.disabled = true;
            };
        }

        list.appendChild(row);
    });
}

function renderOnlineUsers(users) {
    if (!onlineUsersContainer) return;
    onlineUsersContainer.innerHTML = '';
    users.filter(u => u.username !== currentUser).forEach(user => {
        const item = document.createElement('div');
        item.className = 'list-item';
        if (activeChat?.type === 'pm' && activeChat.target === user.username) item.classList.add('active');
        item.innerHTML = `<span class="online-dot"></span><span>${escapeHtml(user.username)}</span>`;
        item.onclick = () => {
            removeNotificationIndicator(user.username);
            startPrivateChat(user.username);
        };
        onlineUsersContainer.appendChild(item);
    });
}

// ========== CHAT FUNCTIONS ==========
function joinRoom(roomName) {
    leftRooms.delete(roomName);
    saveLeftRooms();
    
    activeChat = { type: 'room', target: roomName };
    if (activeChatTitle) activeChatTitle.innerText = `# ${roomName}`;
    if (activeChatStatus) activeChatStatus.innerText = 'Public Room';
    if (leaveRoomBtn) leaveRoomBtn.style.display = 'flex';
    renderRooms();
    if (chatMessageInput) {
        chatMessageInput.disabled = false;
        chatMessageInput.placeholder = `Message #${roomName}`;
    }
    if (sendMessageBtn) sendMessageBtn.disabled = false;
    sendToServer('join_room', { room_name: roomName });
}

function startPrivateChat(username) {
    removeNotificationIndicator(username);
    
    activeChat = { type: 'pm', target: username };
    if (activeChatTitle) activeChatTitle.innerText = `@ ${username}`;
    if (activeChatStatus) activeChatStatus.innerText = 'Private Message';
    if (leaveRoomBtn) leaveRoomBtn.style.display = 'none';
    renderRooms();
    if (chatMessageInput) {
        chatMessageInput.disabled = false;
        chatMessageInput.placeholder = `Message @${username}`;
    }
    if (sendMessageBtn) sendMessageBtn.disabled = false;
    sendToServer('request_pm_history', { target_user: username });
}

function leaveRoom() {
    if (activeChat?.type === 'room') {
        const roomName = activeChat.target;
        sendToServer('leave_room', {});
        leftRooms.add(roomName);
        saveLeftRooms();
        renderRooms();
        
        appendSystemMessage(`You left "${roomName}". Use ↺ button to see all rooms again.`);
        
        activeChat = null;
        if (activeChatTitle) activeChatTitle.innerText = 'Select a room or user';
        if (activeChatStatus) activeChatStatus.innerText = 'Join a conversation';
        if (chatMessagesContainer) chatMessagesContainer.innerHTML = '<div class="message-system">Select a channel from the sidebar</div>';
        if (chatMessageInput) {
            chatMessageInput.disabled = true;
            chatMessageInput.value = '';
        }
        if (sendMessageBtn) sendMessageBtn.disabled = true;
        if (leaveRoomBtn) leaveRoomBtn.style.display = 'none';
    }
}

if (leaveRoomBtn) leaveRoomBtn.addEventListener('click', leaveRoom);

function sendMessage() {
    const content = chatMessageInput ? chatMessageInput.value.trim() : '';
    if (!content || !activeChat) return;
    if (activeChat.type === 'room') sendToServer('send_msg', { room_name: activeChat.target, content });
    else sendToServer('send_pm', { recipient: activeChat.target, content });
    if (chatMessageInput) chatMessageInput.value = '';
}

if (sendMessageBtn) sendMessageBtn.addEventListener('click', sendMessage);
if (chatMessageInput) {
    chatMessageInput.addEventListener('keypress', (e) => { 
        if (e.key === 'Enter' && !e.shiftKey) { 
            e.preventDefault(); 
            sendMessage(); 
        } 
    });
}

// ========== MESSAGE RENDERING ==========
function renderChatHistory(history) {
    if (!chatMessagesContainer) return;
    chatMessagesContainer.innerHTML = '';
    if (history.length === 0) chatMessagesContainer.innerHTML = '<div class="message-system">No messages yet. Start the conversation!</div>';
    else history.forEach(msg => appendMessage(msg));
    scrollChatToBottom();
}

function appendMessage(msg) {
    if (!chatMessagesContainer) return;
    const isSentByMe = msg.sender === currentUser;
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${isSentByMe ? 'sent' : 'received'}`;
    wrapper.dataset.messageId = msg.id;
    
    let contentHtml = '';
    if (msg.msg_type === 'file') {
        const isImage = msg.content.match(/\.(jpg|jpeg|png|gif|webp)$/i);
        if (isImage) {
            contentHtml = `<div class="image-attachment"><a href="${msg.file_path}" target="_blank"><img src="${msg.file_path}" class="chat-image" style="max-width:200px; border-radius:12px;"></a><div class="image-caption">${escapeHtml(msg.content)}</div></div>`;
        } else {
            contentHtml = `<a href="${msg.file_path}" target="_blank" class="file-attachment">📎 ${escapeHtml(msg.content)}</a>`;
        }
    } else {
        contentHtml = `<span class="message-text">${escapeHtml(msg.content)}</span>`;
    }
    
    wrapper.innerHTML = `
        <div class="message-info"><span class="sender-name">${escapeHtml(msg.sender)}</span><span>${formatTimestamp(msg.timestamp)}</span></div>
        <div class="message-box">${contentHtml}<button class="reaction-trigger-btn">😊</button></div>
        <div class="message-reactions" id="reactions-${msg.id}"></div>
    `;
    
    const reactionBtn = wrapper.querySelector('.reaction-trigger-btn');
    if (reactionBtn) {
        reactionBtn.onclick = (e) => { e.stopPropagation(); showEmojiPicker(msg.id, e.clientX, e.clientY); };
    }
    
    chatMessagesContainer.appendChild(wrapper);
    if (msg.reactions?.length) renderReactions(msg.id, msg.reactions);
    scrollChatToBottom();
}

function appendSystemMessage(content) {
    if (!chatMessagesContainer) return;
    const el = document.createElement('div');
    el.className = 'message-system';
    el.innerText = content;
    chatMessagesContainer.appendChild(el);
    scrollChatToBottom();
}

// ========== REACTIONS ==========
function showEmojiPicker(messageId, x, y) {
    if (!emojiPickerOverlay) return;
    activeReactionMessageId = messageId;
    emojiPickerOverlay.style.left = `${Math.min(x, window.innerWidth - 200)}px`;
    emojiPickerOverlay.style.top = `${Math.min(y - 50, window.innerHeight - 200)}px`;
    emojiPickerOverlay.style.display = 'grid';
    const close = (e) => { if (!emojiPickerOverlay.contains(e.target)) { emojiPickerOverlay.style.display = 'none'; document.removeEventListener('click', close); } };
    setTimeout(() => document.addEventListener('click', close), 100);
}

document.querySelectorAll('.emoji-option').forEach(el => {
    el.addEventListener('click', () => {
        const emoji = el.getAttribute('data-emoji');
        if (activeReactionMessageId && activeChat) {
            sendToServer('add_reaction', { 
                message_id: activeReactionMessageId, 
                emoji, 
                room_name: activeChat.type === 'room' ? activeChat.target : null, 
                recipient: activeChat.type === 'pm' ? activeChat.target : null 
            });
        }
        if (emojiPickerOverlay) emojiPickerOverlay.style.display = 'none';
    });
});

function renderReactions(messageId, reactions) {
    const container = document.getElementById(`reactions-${messageId}`);
    if (!container) return;
    container.innerHTML = '';
    const grouped = {};
    reactions.forEach(r => { if (!grouped[r.emoji]) grouped[r.emoji] = []; grouped[r.emoji].push(r.username); });
    Object.entries(grouped).forEach(([emoji, users]) => {
        const badge = document.createElement('div');
        badge.className = `reaction-badge ${users.includes(currentUser) ? 'active' : ''}`;
        badge.innerHTML = `${emoji} ${users.length}`;
        badge.onclick = () => sendToServer('add_reaction', { 
            message_id: messageId, 
            emoji, 
            room_name: activeChat?.type === 'room' ? activeChat.target : null, 
            recipient: activeChat?.type === 'pm' ? activeChat.target : null 
        });
        container.appendChild(badge);
    });
}

function updateMessageReactions(messageId, reactions) { renderReactions(messageId, reactions); }

// ========== ROOM CREATION ==========
if (openCreateRoomBtn) {
    openCreateRoomBtn.addEventListener('click', () => { 
        if (createRoomModal) createRoomModal.style.display = 'flex'; 
        if (newRoomNameInput) newRoomNameInput.focus(); 
    });
}
if (closeCreateRoomBtn) {
    closeCreateRoomBtn.addEventListener('click', () => { 
        if (createRoomModal) createRoomModal.style.display = 'none'; 
    });
}
if (createRoomSubmitBtn) {
    createRoomSubmitBtn.addEventListener('click', () => {
        const roomName = newRoomNameInput ? newRoomNameInput.value.trim() : '';
        if (roomName) {
            sendToServer('create_room', { room_name: roomName });
            if (createRoomModal) createRoomModal.style.display = 'none';
            appendSystemMessage(`Creating room "${roomName}"...`);
        }
    });
}

// ========== PROJECT CREATION ==========

if (openCreateProjectBtn) {
    openCreateProjectBtn.addEventListener('click', () => {

        createProjectModal.style.display = 'flex';

        projectTitleInput.value = '';
        projectDescriptionInput.value = '';
        projectSkillInput.value = '';

        projectTitleInput.focus();
    });
}

if (closeCreateProjectBtn) {
    closeCreateProjectBtn.addEventListener('click', () => {

        createProjectModal.style.display = 'none';
    });
}

if (createProjectSubmitBtn) {
    createProjectSubmitBtn.addEventListener('click', () => {

        const title =
            projectTitleInput.value.trim();

        const description =
            projectDescriptionInput.value.trim();

        const skill =
            projectSkillInput.value.trim();

        if (!title) {
            alert('Project title required');
            return;
        }

        sendToServer(
            'create_project',
            {
                title: title,
                description: description,
                required_skill: skill
            }
        );

        createProjectModal.style.display =
            'none';
    });
}
// ========== MATCHMAKING ==========
if (matchmakingActionBtn) {
    matchmakingActionBtn.addEventListener('click', () => {
        if (isMatchmaking) {
            sendToServer('cancel_matchmaking', {});
        } else {
            // Kirim skill saat ini ke server untuk matchmaking berdasarkan keahlian yang SAMA
            sendToServer('start_matchmaking', { skill: currentUserSkillText });
        }
    });
}

function handleMatchmakingStatus(msg) {
    if (msg.status === 'queued') {
        isMatchmaking = true;
        if (matchmakingActionBtn) {
            const span = matchmakingActionBtn.querySelector('span');
            if (span) span.innerText = 'Cancel Search';
            matchmakingActionBtn.classList.add('btn-secondary');
        }
        if (matchmakingStatusCard) matchmakingStatusCard.style.display = 'flex';
        if (queueStatusText) queueStatusText.innerText = `Queue size: ${msg.queue_size}`;
        if (!matchmakerTimer) {
            matchmakerSeconds = 0;
            if (queueTimerText) queueTimerText.innerText = '00:00';
            matchmakerTimer = setInterval(() => { 
                matchmakerSeconds++; 
                if (queueTimerText) queueTimerText.innerText = `${String(Math.floor(matchmakerSeconds/60)).padStart(2,'0')}:${String(matchmakerSeconds%60).padStart(2,'0')}`; 
            }, 1000);
        }
    } else if (msg.status === 'cancelled') {
        isMatchmaking = false;
        if (matchmakerTimer) clearInterval(matchmakerTimer);
        matchmakerTimer = null;
        if (matchmakingActionBtn) {
            const span = matchmakingActionBtn.querySelector('span');
            if (span) span.innerText = 'Find Match';
            matchmakingActionBtn.classList.remove('btn-secondary');
        }
        if (matchmakingStatusCard) matchmakingStatusCard.style.display = 'none';
    } else if (msg.status === 'matched') {
        if (matchmakerTimer) clearInterval(matchmakerTimer);
        matchmakerTimer = null;
        isMatchmaking = false;
        if (matchmakingActionBtn) {
            const span = matchmakingActionBtn.querySelector('span');
            if (span) span.innerText = 'Find Match';
            matchmakingActionBtn.classList.remove('btn-secondary');
        }
        if (matchmakingStatusCard) matchmakingStatusCard.style.display = 'none';
        if (matchedOpponentInfo) matchedOpponentInfo.innerText = `VS ${msg.opponent} (${msg.opponent_skill || 'Unknown'})`;
        if (matchFoundOverlay) matchFoundOverlay.style.display = 'flex';
        setTimeout(() => { 
            if (matchFoundOverlay) matchFoundOverlay.style.display = 'none'; 
            joinRoom(msg.room_name); 
        }, 3000);
    }
}

// ========== LOGOUT ==========
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => { if (socket) socket.close(); });
}

// ========== RESET LEFT ROOMS BUTTON ==========
function addResetLeftRoomsButton() {
    if (document.querySelector('.reset-left-rooms-btn')) return;
    
    const resetLeftRoomsBtn = document.createElement('button');
    resetLeftRoomsBtn.innerHTML = '↺';
    resetLeftRoomsBtn.title = 'Reset left rooms';
    resetLeftRoomsBtn.className = 'add-room-btn reset-left-rooms-btn';
    resetLeftRoomsBtn.style.fontSize = '1.1rem';
    resetLeftRoomsBtn.style.padding = '4px 8px';
    resetLeftRoomsBtn.onclick = () => {
        const count = leftRooms.size;
        leftRooms.clear();
        saveLeftRooms();
        renderRooms();
        appendSystemMessage(`Reset ${count} left room(s). All rooms are back!`);
        
        if (!activeChat) {
            setTimeout(() => joinRoom('General'), 500);
        }
    };
    
    const sidebarHeader = document.querySelector('.sidebar-header');
    if (sidebarHeader) {
        sidebarHeader.appendChild(resetLeftRoomsBtn);
    }
}

// ========== FIX CSS UNTUK KEAHLIAN ==========
const fixStyle = document.createElement('style');
fixStyle.textContent = `
    /* Biar tulisan keahlian keliatan */
    #user-display-mmr {
        font-size: 0.85rem !important;
        font-weight: bold !important;
        color: #00e5ff !important;
        background: rgba(0, 229, 255, 0.15) !important;
        padding: 4px 10px !important;
        border-radius: 20px !important;
        display: inline-block !important;
        margin-top: 5px !important;
    }
    
    /* Dropdown keahlian */
    #skill-select {
        font-size: 1rem !important;
        padding: 12px !important;
        background: #0f0f2a !important;
        color: white !important;
        border: 1px solid #00e5ff !important;
        border-radius: 12px !important;
    }
    
    #skill-select option {
        background: #1a1a3a !important;
        color: white !important;
        padding: 10px !important;
    }
    
    /* Modal title */
    .modal-title {
        color: white !important;
    }
    
    /* Teks di modal */
    #skill-content p {
        color: #aaa !important;
        font-size: 0.9rem !important;
    }
`;
document.head.appendChild(fixStyle);

// Ganti teks "Your Skill Rating" menjadi "Nilai Keahlian"
const mmrLabel = document.querySelector('.mmr-label');
if (mmrLabel) {
    mmrLabel.innerText = 'Nilai Keahlian';
}

console.log('[TeamFinder] Client ready');
