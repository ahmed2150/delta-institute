// ============================================
// ===== Chat System =====
// ============================================

const getChats = () => JSON.parse(localStorage.getItem('deltaChats') || '{}');
const saveChats = (chats) => localStorage.setItem('deltaChats', JSON.stringify(chats));

let currentUser = null;
let currentChatUserId = null;

function getChatKey(userId1, userId2) {
  return [userId1, userId2].sort().join('_');
}

document.addEventListener('DOMContentLoaded', () => {
  currentUser = checkAuth();
  if (!currentUser) return;

  document.getElementById('userName').textContent = `👋 ${currentUser.name}`;

  renderChatList();

  const chatWith = localStorage.getItem('chatWith');
  if (chatWith) {
    const { userId, name } = JSON.parse(chatWith);
    localStorage.removeItem('chatWith');
    openChat(userId, name);
  }

  setInterval(() => {
    if (currentChatUserId) loadMessages(currentChatUserId);
    renderChatList();
  }, 2000);
});

function renderChatList() {
  const chats = getChats();
  const container = document.getElementById('chatList');
  const userChats = [];

  Object.keys(chats).forEach(key => {
    if (key.includes(currentUser.id.toString())) {
      const messages = chats[key];
      if (messages.length === 0) return;

      const otherUserId = key.split('_').find(id => id !== currentUser.id.toString());
      const otherUser = getUsers().find(u => u.id.toString() === otherUserId);
      if (!otherUser) return;

      const lastMsg = messages[messages.length - 1];
      const unreadCount = messages.filter(m => m.to === currentUser.id && !m.read).length;

      userChats.push({ otherUser, lastMsg, unreadCount });
    }
  });

  userChats.sort((a, b) => (b.lastMsg?.timestamp || 0) - (a.lastMsg?.timestamp || 0));

  if (userChats.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding: 20px; font-size: 13px;"><p>لا توجد محادثات بعد</p></div>';
    return;
  }

  container.innerHTML = userChats.map(({ otherUser, lastMsg, unreadCount }) => `
    <div class="chat-list-item ${currentChatUserId === otherUser.id ? 'active' : ''}" onclick="openChat(${otherUser.id}, '${otherUser.name}')">
      <div class="chat-avatar ${otherUser.role}">${otherUser.name.charAt(0)}</div>
      <div class="chat-item-info">
        <div class="name">
          ${otherUser.name}
          <span class="role-badge ${otherUser.role}">
            ${otherUser.role === 'doctor' ? 'دكتور' : otherUser.role === 'staff' ? 'موظف' : 'طالب'}
          </span>
        </div>
        <div class="last-msg">${lastMsg ? (lastMsg.text || '📎 ملف').substring(0, 30) : ''}</div>
      </div>
      ${unreadCount > 0 ? `<span class="unread-badge">${unreadCount}</span>` : ''}
    </div>
  `).join('');
}

function openChat(otherUserId, otherName) {
  currentChatUserId = otherUserId;
  const otherUser = getUsers().find(u => u.id === otherUserId);
  if (!otherUser) return;

  const chatMain = document.getElementById('chatMain');
  chatMain.innerHTML = `
    <div class="chat-main-header">
      <div class="chat-avatar ${otherUser.role}">${otherName.charAt(0)}</div>
      <div>
        <div class="chat-title">${otherName}</div>
        <div class="chat-subtitle">
          ${otherUser.role === 'doctor' ? '👨‍🏫 دكتور' : otherUser.role === 'staff' ? '👨‍💼 موظف' : '🎓 طالب'}
        </div>
      </div>
    </div>
    <div class="chat-messages" id="chatMessages"></div>
    <div class="chat-input-area">
      <input type="text" id="messageInput" placeholder="اكتب رسالتك..." onkeypress="if(event.key==='Enter') sendMessage()">
      <button onclick="sendMessage()">إرسال</button>
    </div>
  `;

  loadMessages(otherUserId);
  renderChatList();
  setTimeout(() => document.getElementById('messageInput')?.focus(), 100);
}

function loadMessages(otherUserId) {
  const chats = getChats();
  const key = getChatKey(currentUser.id, otherUserId);
  const messages = chats[key] || [];
  const container = document.getElementById('chatMessages');
  if (!container) return;

  let changed = false;
  messages.forEach(m => {
    if (m.to === currentUser.id && !m.read) {
      m.read = true;
      changed = true;
    }
  });
  if (changed) {
    chats[key] = messages;
    saveChats(chats);
  }

  if (messages.length === 0) {
    container.innerHTML = '<div style="text-align:center; opacity:0.5; padding: 20px;">لا توجد رسائل بعد</div>';
    return;
  }

  container.innerHTML = messages.map(m => {
    const isSent = m.from === currentUser.id;
    const time = new Date(m.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    return `
      <div class="message ${isSent ? 'sent' : 'received'}">
        ${escapeHtml(m.text)}
        <span class="time">${time}</span>
      </div>
    `;
  }).join('');

  container.scrollTop = container.scrollHeight;
}

function sendMessage() {
  const input = document.getElementById('messageInput');
  const text = input.value.trim();
  if (!text || !currentChatUserId) return;

  const chats = getChats();
  const key = getChatKey(currentUser.id, currentChatUserId);

  if (!chats[key]) chats[key] = [];

  chats[key].push({
    from: currentUser.id,
    to: currentChatUserId,
    text,
    timestamp: Date.now(),
    read: false
  });

  saveChats(chats);
  input.value = '';
  loadMessages(currentChatUserId);
  renderChatList();
}

function openNewChatModal() {
  document.getElementById('newChatModal').classList.add('active');
  renderUsersList();
}

function closeNewChatModal() {
  document.getElementById('newChatModal').classList.remove('active');
  document.getElementById('userSearch').value = '';
}

function renderUsersList(filter = '') {
  const users = getUsers().filter(u => u.id !== currentUser.id);
  const container = document.getElementById('usersList');
  const filtered = users.filter(u => u.name.toLowerCase().includes(filter.toLowerCase()));

  if (filtered.length === 0) {
    container.innerHTML = '<p style="text-align:center; opacity:0.5; padding: 15px;">لا يوجد مستخدمون</p>';
    return;
  }

  container.innerHTML = filtered.map(u => `
    <div class="user-item" onclick="startNewChat(${u.id}, '${u.name}')">
      <div class="chat-avatar ${u.role}">${u.name.charAt(0)}</div>
      <div class="chat-item-info">
        <div class="name">
          ${u.name}
          <span class="role-badge ${u.role}">
            ${u.role === 'doctor' ? 'دكتور' : u.role === 'staff' ? 'موظف' : 'طالب'}
          </span>
        </div>
      </div>
    </div>
  `).join('');
}

function filterUsers() {
  renderUsersList(document.getElementById('userSearch').value);
}

function startNewChat(userId, userName) {
  closeNewChatModal();
  openChat(userId, userName);
}

function filterChats() {
  const q = document.getElementById('chatSearch').value.toLowerCase();
  document.querySelectorAll('.chat-list-item').forEach(item => {
    const name = item.querySelector('.name').textContent.toLowerCase();
    item.style.display = name.includes(q) ? 'flex' : 'none';
  });
}

function goBack() {
  if (currentUser.role === 'doctor') window.location.href = 'doctor.html';
  else if (currentUser.role === 'staff') window.location.href = 'staff.html';
  else window.location.href = 'student.html';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}