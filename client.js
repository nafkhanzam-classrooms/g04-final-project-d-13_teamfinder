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
    
    // Konfirmasi upload
    const confirmUpload = confirm(`Upload "${file.name}" (${(file.size/1024).toFixed(1)} KB) to ${activeChat.type === 'room' ? '#'+activeChat.target : '@'+activeChat.target}?`);
    if (!confirmUpload) return;
    
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

// ========== ATTACH FILE EVENT ==========
if (attachFileBtn) {
    attachFileBtn.addEventListener('click', () => {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            await uploadFile(file);
        }
        fileInput.value = '';
    });
    
    // Drag & Drop
    const chatPane = document.querySelector('.chat-pane');
    if (chatPane) {
        chatPane.addEventListener('dragover', (e) => { e.preventDefault(); chatPane.classList.add('drag-over'); });
        chatPane.addEventListener('dragleave', () => { chatPane.classList.remove('drag-over'); });
        chatPane.addEventListener('drop', async (e) => { 
            e.preventDefault(); 
            chatPane.classList.remove('drag-over'); 
            const file = e.dataTransfer.files[0];
            if (file) {
                const confirmUpload = confirm(`Upload "${file.name}" (${(file.size/1024).toFixed(1)} KB) to ${activeChat ? (activeChat.type === 'room' ? '#'+activeChat.target : '@'+activeChat.target) : 'chat'}?`);
                if (confirmUpload) {
                    await uploadFile(file);
                }
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
                    loadLeftRooms();
                    
                    if (userDisplayName) userDisplayName.innerText = currentUser;
                    if (userAvatar) userAvatar.innerText = currentUser.charAt(0).toUpperCase();
                    if (userDisplayMmr) userDisplayMmr.innerText = `MMR: ${currentUserMmr}`;
                    if (matchmakerUserMmr) matchmakerUserMmr.innerText = currentUserMmr;
                    if (authSection) authSection.style.display = 'none';
                    if (appSection) appSection.style.display = 'grid';
                    
                    setTimeout(() => addResetLeftRoomsButton(), 100);
                    setTimeout(() => joinRoom('General'), 500);
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
                    activeChatStatus.innerText = '⚠️ User offline';
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
            
        case 'message':
            const isRelevantRoom = activeChat?.type === 'room' && msg.room_name === activeChat.target;
            const isRelevantPM = activeChat?.type === 'pm' && (msg.sender === activeChat.target || msg.recipient === activeChat.target);
            
            // NOTIFIKASI PRIVATE MESSAGE
            if (!isRelevantPM && msg.recipient === currentUser && msg.sender !== currentUser) {
                console.log('[NOTIF] New PM from:', msg.sender);
                
                // 1. Title blink
                let originalTitle = document.title;
                document.title = `💬 NEW from ${msg.sender}! 💬`;
                setTimeout(() => { document.title = originalTitle; }, 5000);
                
                // 2. Toast notification
                const toast = document.createElement('div');
                toast.className = 'message-system';
                toast.style.cssText = 'background: linear-gradient(135deg, rgba(0,229,255,0.3), rgba(179,136,255,0.3)); border: 2px solid #00e5ff; border-radius: 24px; padding: 12px 20px; margin: 8px 0; cursor: pointer;';
                toast.innerHTML = `💌 <strong>${escapeHtml(msg.sender)}</strong> sent you a message!<br><span style="font-size:0.7rem;">Click to reply →</span>`;
                toast.onclick = () => {
                    removeNotificationIndicator(msg.sender);
                    startPrivateChat(msg.sender);
                };
                if (chatMessagesContainer) {
                    chatMessagesContainer.appendChild(toast);
                    setTimeout(() => toast.remove(), 8000);
                }
                
                // 3. Badge di sidebar (tambah indicator)
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
                appendSystemMessage(`✨ ${msg.username} joined the room`);
            break;
            
        case 'user_left':
            if (activeChat?.type === 'room' && activeChat.target === msg.room_name) 
                appendSystemMessage(`👋 ${msg.username} left the room`);
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

function renderOnlineUsers(users) {
    if (!onlineUsersContainer) return;
    onlineUsersContainer.innerHTML = '';
    users.filter(u => u.username !== currentUser).forEach(user => {
        const item = document.createElement('div');
        item.className = 'list-item';
        if (activeChat?.type === 'pm' && activeChat.target === user.username) item.classList.add('active');
        item.innerHTML = `<span class="online-dot"></span><span>${escapeHtml(user.username)} (${user.mmr})</span>`;
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
    // HAPUS INDICATOR NOTIFIKASI SAAT MEMBUKA CHAT
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
        
        appendSystemMessage(`🚪 You left "${roomName}". Use ↺ button to see all rooms again.`);
        
        activeChat = null;
        if (activeChatTitle) activeChatTitle.innerText = 'Select a room or user';
        if (activeChatStatus) activeChatStatus.innerText = 'Join a conversation';
        if (chatMessagesContainer) chatMessagesContainer.innerHTML = '<div class="message-system">✨ Select a channel from the sidebar ✨</div>';
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
    if (history.length === 0) chatMessagesContainer.innerHTML = '<div class="message-system">✨ No messages yet. Start the conversation! ✨</div>';
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
            appendSystemMessage(`✨ Creating room "${roomName}"...`);
        }
    });
}

// ========== MATCHMAKING ==========
if (matchmakingActionBtn) {
    matchmakingActionBtn.addEventListener('click', () => {
        if (isMatchmaking) sendToServer('cancel_matchmaking', {});
        else sendToServer('start_matchmaking', {});
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
        if (matchedOpponentInfo) matchedOpponentInfo.innerText = `VS ${msg.opponent} (MMR: ${msg.opponent_mmr})`;
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
        appendSystemMessage(`✨ Reset ${count} left room(s). All rooms are back!`);
        
        if (!activeChat) {
            setTimeout(() => joinRoom('General'), 500);
        }
    };
    
    const sidebarHeader = document.querySelector('.sidebar-header');
    if (sidebarHeader) {
        sidebarHeader.appendChild(resetLeftRoomsBtn);
    }
}

console.log('[TeamFinder] Client ready - FINAL COMPLETE VERSION');
