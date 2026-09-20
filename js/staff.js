// ============================================
// ===== Staff Dashboard =====
// ============================================

const getAnnouncements = () => JSON.parse(localStorage.getItem('deltaAnnouncements') || '[]');
const saveAnnouncements = (ann) => localStorage.setItem('deltaAnnouncements', JSON.stringify(ann));
const getUnions = () => JSON.parse(localStorage.getItem('deltaUnions') || '[]');
const saveUnions = (u) => localStorage.setItem('deltaUnions', JSON.stringify(u));

let attachedAnnFile = null;
let attachedUnionFile = null;

document.addEventListener('DOMContentLoaded', () => {
  const user = checkAuth('staff');
  if (!user) return;
  document.getElementById('userName').textContent = `👋 ${user.name}`;
  renderAnnouncements();
  renderUnions();
});

function switchSection(section, btn) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  if (section === 'announcements') {
    document.getElementById('announcementsSection').style.display = 'block';
    document.getElementById('unionSection').style.display = 'none';
  } else {
    document.getElementById('announcementsSection').style.display = 'none';
    document.getElementById('unionSection').style.display = 'block';
  }
}

function attachAnnFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.docx,.xlsx,.pptx,image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { alert('⚠️ الحد الأقصى 50 ميجا'); return; }
    
    const statusEl = document.getElementById('annAttachStatus');
    statusEl.textContent = '⏳ جاري الرفع...';
    
    try {
      const result = await uploadFileToDrive(file);
      attachedAnnFile = {
        name: file.name,
        size: (file.size / 1024).toFixed(2) + ' KB',
        type: file.type,
        driveId: result.fileId || result.id || ''
      };
      statusEl.textContent = `✅ ${file.name}`;
    } catch (err) {
      statusEl.textContent = '';
      alert('❌ فشل الرفع: ' + err.message);
    }
  };
  input.click();
}

function attachUnionFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pdf,.docx,.xlsx,.pptx,image/*';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { alert('⚠️ الحد الأقصى 50 ميجا'); return; }
    
    const statusEl = document.getElementById('unionAttachStatus');
    statusEl.textContent = '⏳ جاري الرفع...';
    
    try {
      const result = await uploadFileToDrive(file);
      attachedUnionFile = {
        name: file.name,
        size: (file.size / 1024).toFixed(2) + ' KB',
        type: file.type,
        driveId: result.fileId || result.id || ''
      };
      statusEl.textContent = `✅ ${file.name}`;
    } catch (err) {
      statusEl.textContent = '';
      alert('❌ فشل الرفع: ' + err.message);
    }
  };
  input.click();
}

function publishAnnouncement() {
  const title = document.getElementById('annTitle').value.trim();
  const content = document.getElementById('annContent').value.trim();
  if (!title) { alert('❌ اكتب عنوان الإعلان'); return; }
  const user = getCurrentUser();
  const ann = getAnnouncements();
  ann.unshift({
    id: Date.now(), title, content, file: attachedAnnFile,
    publishedBy: user.name, dateText: new Date().toLocaleString('ar-EG')
  });
  saveAnnouncements(ann);
  document.getElementById('annTitle').value = '';
  document.getElementById('annContent').value = '';
  document.getElementById('annAttachStatus').textContent = '';
  attachedAnnFile = null;
  renderAnnouncements();
  alert('✅ تم نشر الإعلان');
}

function publishUnion() {
  const title = document.getElementById('unionTitle').value.trim();
  const content = document.getElementById('unionContent').value.trim();
  if (!title) { alert('❌ اكتب عنوان النشاط'); return; }
  const user = getCurrentUser();
  const unions = getUnions();
  unions.unshift({
    id: Date.now(), title, content, file: attachedUnionFile,
    publishedBy: user.name, dateText: new Date().toLocaleString('ar-EG')
  });
  saveUnions(unions);
  document.getElementById('unionTitle').value = '';
  document.getElementById('unionContent').value = '';
  document.getElementById('unionAttachStatus').textContent = '';
  attachedUnionFile = null;
  renderUnions();
  alert('✅ تم نشر النشاط');
}

function renderAnnouncements() {
  const ann = getAnnouncements();
  const container = document.getElementById('announcementsList');
  if (ann.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">📢</div><p>لا توجد إعلانات بعد</p></div>';
    return;
  }
  container.innerHTML = ann.map(a => `
    <div class="item-card">
      <div class="item-header">
        <div class="item-avatar">📢</div>
        <div class="item-info">
          <div class="name">${a.title}</div>
          <div class="meta">${a.dateText} • ${a.publishedBy}</div>
        </div>
      </div>
      ${a.content ? `<div class="item-body">${escapeHtml(a.content)}</div>` : ''}
      ${a.file ? `
        <div class="item-file">
          <span class="file-icon">${getFileIcon(a.file.type)}</span>
          <div class="file-details">
            <div class="file-name">${a.file.name}</div>
            <div class="file-size">${a.file.size}</div>
          </div>
          ${a.file.driveId ? `<button class="btn-sm success" onclick="window.open('${getDirectDownloadUrl(a.file.driveId)}', '_blank')">📥 تحميل</button>` : ''}
        </div>
      ` : ''}
      <div class="item-actions">
        <button class="btn-sm" onclick="editAnn(${a.id})">✏️ تعديل</button>
        <button class="btn-sm danger" onclick="deleteAnn(${a.id})">🗑️ حذف</button>
      </div>
    </div>
  `).join('');
}

function renderUnions() {
  const unions = getUnions();
  const container = document.getElementById('unionList');
  if (unions.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="icon">🎉</div><p>لا توجد أنشطة بعد</p></div>';
    return;
  }
  container.innerHTML = unions.map(u => `
    <div class="item-card">
      <div class="item-header">
        <div class="item-avatar">🎉</div>
        <div class="item-info">
          <div class="name">${u.title}</div>
          <div class="meta">${u.dateText} • ${u.publishedBy}</div>
        </div>
      </div>
      ${u.content ? `<div class="item-body">${escapeHtml(u.content)}</div>` : ''}
      ${u.file ? `
        <div class="item-file">
          <span class="file-icon">${getFileIcon(u.file.type)}</span>
          <div class="file-details">
            <div class="file-name">${u.file.name}</div>
            <div class="file-size">${u.file.size}</div>
          </div>
          ${u.file.driveId ? `<button class="btn-sm success" onclick="window.open('${getDirectDownloadUrl(u.file.driveId)}', '_blank')">📥 تحميل</button>` : ''}
        </div>
      ` : ''}
      <div class="item-actions">
        <button class="btn-sm" onclick="editUnion(${u.id})">✏️ تعديل</button>
        <button class="btn-sm danger" onclick="deleteUnion(${u.id})">🗑️ حذف</button>
      </div>
    </div>
  `).join('');
}

async function editAnn(id) {
  const ann = getAnnouncements();
  const a = ann.find(x => x.id === id);
  if (!a) return;
  const newTitle = prompt('✏️ العنوان الجديد:', a.title);
  if (newTitle === null) return;
  const newContent = prompt('✏️ المحتوى الجديد:', a.content);
  if (newContent === null) return;
  a.title = newTitle.trim();
  a.content = newContent.trim();
  a.dateText = new Date().toLocaleString('ar-EG') + ' (معدّل)';
  saveAnnouncements(ann);
  renderAnnouncements();
}

async function deleteAnn(id) {
  if (!confirm('⚠️ حذف الإعلان؟')) return;
  const ann = getAnnouncements();
  const a = ann.find(x => x.id === id);
  if (a && a.file && a.file.driveId) {
    try { await deleteFileFromDrive(a.file.driveId); } catch(e) { console.error(e); }
  }
  saveAnnouncements(ann.filter(x => x.id !== id));
  renderAnnouncements();
}

async function editUnion(id) {
  const unions = getUnions();
  const u = unions.find(x => x.id === id);
  if (!u) return;
  const newTitle = prompt('✏️ العنوان الجديد:', u.title);
  if (newTitle === null) return;
  const newContent = prompt('✏️ المحتوى الجديد:', u.content);
  if (newContent === null) return;
  u.title = newTitle.trim();
  u.content = newContent.trim();
  u.dateText = new Date().toLocaleString('ar-EG') + ' (معدّل)';
  saveUnions(unions);
  renderUnions();
}

async function deleteUnion(id) {
  if (!confirm('⚠️ حذف النشاط؟')) return;
  const unions = getUnions();
  const u = unions.find(x => x.id === id);
  if (u && u.file && u.file.driveId) {
    try { await deleteFileFromDrive(u.file.driveId); } catch(e) { console.error(e); }
  }
  saveUnions(unions.filter(x => x.id !== id));
  renderUnions();
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