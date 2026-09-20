// ============================================
// ===== Doctor Dashboard =====
// ============================================

const getChannels = () => JSON.parse(localStorage.getItem('deltaChannels') || '[]');
const saveChannels = (channels) => localStorage.setItem('deltaChannels', JSON.stringify(channels));
const getPosts = () => JSON.parse(localStorage.getItem('deltaPosts') || '[]');
const savePosts = (posts) => localStorage.setItem('deltaPosts', JSON.stringify(posts));

let currentLevelId = null;
let currentChannelId = null;
let attachedFile = null;

document.addEventListener('DOMContentLoaded', () => {
  const user = checkAuth('doctor');
  if (!user) return;
  document.getElementById('userName').textContent = `د. ${user.name}`;

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
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="icon">📖</div><h3>${lvl.name}</h3><p>اضغط للدخول</p>`;
    card.onclick = () => openLevel(lvl.id, lvl.name);
    grid.appendChild(card);
  });
});

function openLevel(levelId, levelName) {
  currentLevelId = levelId;
  document.getElementById('channelArea').style.display = 'none';
  document.getElementById('subjectsArea').style.display = 'block';
  document.getElementById('subjectsTitle').textContent = `📚 مواد ${levelName}`;
  renderSubjects();
}

function renderSubjects() {
  const user = getCurrentUser();
  const channels = getChannels().filter(c => c.level === currentLevelId && c.doctorId === user.id);
  const grid = document.getElementById('subjectsGrid');

  if (channels.length === 0) {
    grid.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>لم تضف مواد لهذه الفرقة بعد</p></div>';
    return;
  }

  grid.innerHTML = channels.map(ch => {
    const postsCount = getPosts().filter(p => p.channelId === ch.id).length;
    return `
      <div class="card">
        <span class="badge">${postsCount} محتوى</span>
        <div class="icon">📚</div>
        <h3>${ch.name}</h3>
        <p>اضغط لإدارة المادة</p>
        <div class="item-actions" style="margin-top: 12px; border-top: 1px solid var(--border); padding-top: 10px;">
          <button class="btn-sm" onclick="event.stopPropagation(); editSubject(${ch.id})">✏️ تعديل</button>
          <button class="btn-sm danger" onclick="event.stopPropagation(); deleteSubject(${ch.id})">🗑️ حذف</button>
        </div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.card').forEach((card, idx) => {
    card.onclick = (e) => { if (!e.target.closest('button')) openChannel(channels[idx].id); };
  });
}

function addSubject() {
  const name = document.getElementById('newSubjectName').value.trim();
  const user = getCurrentUser();
  if (!name) { alert('❌ اكتب اسم المادة'); return; }

  const channels = getChannels();
  if (channels.find(c => c.name === name && c.doctorId === user.id && c.level === currentLevelId)) {
    alert('❌ لديك مادة بنفس الاسم'); return;
  }

  channels.push({
    id: Date.now(), name, level: currentLevelId,
    doctorId: user.id, doctorName: user.name,
    createdAt: new Date().toISOString()
  });

  saveChannels(channels);
  document.getElementById('newSubjectName').value = '';
  renderSubjects();
  alert('✅ تمت إضافة المادة');
}

function editSubject(channelId) {
  const channels = getChannels();
  const channel = channels.find(c => c.id === channelId);
  if (!channel) return;
  const newName = prompt('✏️ اسم المادة الجديد:', channel.name);
  if (!newName || !newName.trim()) return;
  channel.name = newName.trim();
  saveChannels(channels);
  renderSubjects();
}

async function deleteSubject(channelId) {
  if (!confirm('⚠️ سيتم حذف المادة وجميع محتواها')) return;
  let channels = getChannels();
  channels = channels.filter(c => c.id !== channelId);
  saveChannels(channels);

  const posts = getPosts();
  const channelPosts = posts.filter(p => p.channelId === channelId);
  for (const post of channelPosts) {
    if (post.file && post.file.driveId) {
      try { await deleteFileFromDrive(post.file.driveId); } catch (e) { console.error(e); }
    }
  }

  savePosts(posts.filter(p => p.channelId !== channelId));
  renderSubjects();
  if (currentChannelId === channelId) document.getElementById('channelArea').style.display = 'none';
}

function openChannel(channelId) {
  currentChannelId = channelId;
  const channel = getChannels().find(c => c.id === channelId);
  if (!channel) return;

  document.getElementById('channelArea').style.display = 'block';
  document.getElementById('channelTitle').textContent = `📝 إدارة مادة: ${channel.name}`;
  document.getElementById('postContent').value = '';
  attachedFile = null;
  document.getElementById('attachStatus').textContent = '';

  renderChannelContent();
  document.getElementById('channelArea').scrollIntoView({ behavior: 'smooth' });
}

// ===== Attach File (Raf' 3la Drive) =====
function attachFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.xlsx,.docx,.pptx,.ppsx,image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // ⚠️ حد أقصى 50 MB (بسبب Apps Script limits)
    if (file.size > 50 * 1024 * 1024) {
      alert('⚠️ الحد الأقصى 50 ميجا للملف الواحد.\nالملف الحالي: ' + (file.size / 1024 / 1024).toFixed(2) + ' ميجا');
      return;
    }

    const statusEl = document.getElementById('attachStatus');
    const progressEl = document.getElementById('uploadProgress');
    const barFill = document.getElementById('progressBar');
    const percentEl = document.getElementById('progressPercent');

    statusEl.textContent = '⏳ جاري الرفع...';
    progressEl.style.display = 'block';
    barFill.style.width = '0%';
    percentEl.textContent = '0%';

    try {
      // رفع الملف على Google Drive
      const result = await uploadFileToDrive(file, (percent) => {
        barFill.style.width = percent + '%';
        percentEl.textContent = percent + '%';
      });

      // ⚠️ Apps Script ممكن ميارجعش ID صريح بسبب CORS
      // لكن العملية تمت. نستخدم اسم الملف كمرجع
      // (لو ضبطت Apps Script على Basic Auth، هيارجع الـ ID)

      const driveId = result.fileId || result.id || '';
      
      attachedFile = {
        name: file.name,
        size: (file.size / 1024).toFixed(2) + ' KB',
        type: file.type,
        driveId: driveId
      };

      statusEl.textContent = `✅ ${file.name} (${attachedFile.size})`;
      progressEl.style.display = 'none';

      if (!driveId) {
        console.warn('⚠️ الملف اترفع لكن الـ ID مش رجع. تأكد من إعدادات CORS في Apps Script.');
      }
    } catch (err) {
      console.error(err);
      statusEl.textContent = '';
      progressEl.style.display = 'none';
      alert('❌ فشل الرفع: ' + err.message);
    }
  };
  input.click();
}

function publish() {
  const content = document.getElementById('postContent').value.trim();
  if (!content && !attachedFile) { alert('❌ اكتب محتوى أو أرفق ملف'); return; }

  const user = getCurrentUser();
  const posts = getPosts();

  posts.unshift({
    id: Date.now(),
    channelId: currentChannelId,
    doctorId: user.id,
    doctorName: user.name,
    content, file: attachedFile, likes: [],
    dateText: new Date().toLocaleString('ar-EG')
  });

  savePosts(posts);
  document.getElementById('postContent').value = '';
  attachedFile = null;
  document.getElementById('attachStatus').textContent = '';
  renderChannelContent();
  alert('✅ تم النشر');
}

function renderChannelContent() {
  const posts = getPosts().filter(p => p.channelId === currentChannelId);
  const container = document.getElementById('channelContent');

  if (posts.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📝</div><p>لم تنشر أي محتوى بعد</p></div>';
    return;
  }

  container.innerHTML = posts.map(post => `
    <div class="item-card">
      <div class="item-header">
        <div class="item-avatar">${post.doctorName.charAt(0)}</div>
        <div class="item-info">
          <div class="name">د. ${post.doctorName}</div>
          <div class="meta">${post.dateText} • ${post.likes?.length || 0} إعجاب</div>
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
          ${post.file.driveId ? `<button class="btn-sm success" onclick="window.open('${getDirectDownloadUrl(post.file.driveId)}', '_blank')">📥 تحميل</button>` : ''}
        </div>
      ` : ''}
      <div class="item-actions">
        <button class="btn-sm" onclick="editPost(${post.id})">✏️ تعديل</button>
        <button class="btn-sm danger" onclick="deletePost(${post.id})">🗑️ حذف</button>
      </div>
    </div>
  `).join('');
}

function editPost(postId) {
  const posts = getPosts();
  const post = posts.find(p => p.id === postId);
  if (!post) return;
  const newContent = prompt('✏️ عدّل المحتوى:', post.content);
  if (newContent === null) return;
  post.content = newContent.trim();
  post.dateText = new Date().toLocaleString('ar-EG') + ' (معدّل)';
  savePosts(posts);
  renderChannelContent();
}

async function deletePost(postId) {
  if (!confirm('⚠️ حذف هذا المحتوى؟')) return;
  const posts = getPosts();
  const post = posts.find(p => p.id === postId);

  if (post && post.file && post.file.driveId) {
    try { await deleteFileFromDrive(post.file.driveId); } catch (e) { console.error(e); }
  }

  savePosts(posts.filter(p => p.id !== postId));
  renderChannelContent();
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