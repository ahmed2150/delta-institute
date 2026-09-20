// ============================================
// ===== Student Dashboard =====
// ============================================

const getChannels = () => JSON.parse(localStorage.getItem('deltaChannels') || '[]');
const getPosts = () => JSON.parse(localStorage.getItem('deltaPosts') || '[]');
const savePosts = (posts) => localStorage.setItem('deltaPosts', JSON.stringify(posts));

let currentChannelId = null;

document.addEventListener('DOMContentLoaded', () => {
  const user = checkAuth('student');
  if (!user) return;

  document.getElementById('userName').textContent = `👋 ${user.name}`;

  const levels = [
    { id: '1', name: 'الفرقة الأولى' },
    { id: '2', name: 'الفرقة الثانية' },
    { id: '3-sys', name: 'الفرقة الثالثة (نظم)' },
    { id: '3-acc', name: 'الفرقة الثالثة (محاسبة)' },
    { id: '4-sys', name: 'الفرقة الرابعة (نظم)' },
    { id: '4-acc', name: 'الفرقة الرابعة (محاسبة)' },
  ];

  const grid = document.getElementById('levelsGrid');
  grid.innerHTML = '';

  levels.forEach(lvl => {
    const isMyLevel = user.level === lvl.id;
    const card = document.createElement('div');
    card.className = 'card' + (isMyLevel ? ' active' : '');
    card.innerHTML = `
      <div class="icon">📖</div>
      <h3>${lvl.name}</h3>
      <p>${isMyLevel ? '✅ فرقتك الحالية' : 'اضغط للدخول'}</p>
    `;
    card.onclick = () => openLevel(lvl.id, lvl.name);
    grid.appendChild(card);
  });

  const myLevel = levels.find(l => l.id === user.level);
  if (myLevel) openLevel(myLevel.id, myLevel.name);
});

function openLevel(levelId, levelName) {
  document.getElementById('materialsArea').style.display = 'none';
  const channels = getChannels().filter(c => c.level === levelId);
  document.getElementById('subjectsArea').style.display = 'block';
  document.getElementById('subjectsTitle').textContent = `📚 مواد ${levelName}`;

  const grid = document.getElementById('subjectsGrid');
  if (channels.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>لا توجد مواد لهذه الفرقة حالياً</p></div>';
    return;
  }

  grid.innerHTML = channels.map(ch => {
    const postsCount = getPosts().filter(p => p.channelId === ch.id).length;
    return `
      <div class="card" onclick="openChannel(${ch.id})">
        <span class="badge">${postsCount} محتوى</span>
        <div class="icon">📚</div>
        <h3>${ch.name}</h3>
        <p>د. ${ch.doctorName}</p>
      </div>
    `;
  }).join('');
}

function openChannel(channelId) {
  currentChannelId = channelId;
  const channel = getChannels().find(c => c.id === channelId);
  if (!channel) return;

  document.getElementById('materialsArea').style.display = 'block';
  document.getElementById('materialsTitle').textContent = `📝 محتوى مادة: ${channel.name}`;
  renderMaterials(channelId);
  document.getElementById('materialsArea').scrollIntoView({ behavior: 'smooth' });
}

function renderMaterials(channelId) {
  const posts = getPosts().filter(p => p.channelId === channelId);
  const container = document.getElementById('materialsList');
  const user = getCurrentUser();

  if (posts.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>لا يوجد محتوى بعد</p></div>';
    return;
  }

  container.innerHTML = posts.map(post => {
    const isLiked = post.likes?.includes(user.id);
    const likeCount = post.likes?.length || 0;

    return `
      <div class="item-card">
        <div class="item-header">
          <div class="item-avatar">${post.doctorName.charAt(0)}</div>
          <div class="item-info">
            <div class="name">د. ${post.doctorName}</div>
            <div class="meta">${post.dateText}</div>
          </div>
        </div>

        ${post.content ? `<div class="item-body">${escapeHtml(post.content)}</div>` : ''}

        ${post.file ? `
          <div class="item-file">
            <span class="file-icon">${getFileIcon(post.file.type)}</span>
            <div class="file-details">
              <div class="file-name">${post.file.name}</div>
              <div class="file-size">${post.file.size}</div>
            </div>
            <button class="btn-sm success" onclick="downloadFileFromDrive('${post.file.driveId}', '${post.file.name}')">📥 تحميل</button>
            <button class="btn-sm" onclick="window.open('${getPreviewUrl(post.file.driveId)}', '_blank')">👁️ عرض</button>
          </div>
        ` : ''}

        <div class="item-actions">
          <button class="btn-sm" onclick="toggleLike(${post.id})">
            ${isLiked ? '❤️' : '🤍'} ${likeCount} إعجاب
          </button>
          <button class="btn-sm" onclick="chatWith('${post.doctorId}', '${post.doctorName}')">💬 تواصل مع الدكتور</button>
        </div>
      </div>
    `;
  }).join('');
}

function toggleLike(postId) {
  const user = getCurrentUser();
  const posts = getPosts();
  const post = posts.find(p => p.id === postId);
  if (!post) return;
  if (!post.likes) post.likes = [];
  const idx = post.likes.indexOf(user.id);
  if (idx > -1) post.likes.splice(idx, 1);
  else post.likes.push(user.id);
  savePosts(posts);
  renderMaterials(currentChannelId);
}

function chatWith(userId, name) {
  localStorage.setItem('chatWith', JSON.stringify({ userId, name }));
  window.location.href = 'chat.html';
}

function getFileIcon(type) {
  if (!type) return '📄';
  if (type.includes('pdf')) return '📕';
  if (type.includes('image')) return '🖼️';
  if (type.includes('sheet') || type.includes('excel')) return '📊';
  if (type.includes('word') || type.includes('document')) return '📘';
  if (type.includes('presentation') || type.includes('powerpoint')) return '📙';
  return '📄';
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}