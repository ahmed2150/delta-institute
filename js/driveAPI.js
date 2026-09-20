// ============================================
// ===== Google Drive API Integration =====
// ============================================

// ⚠️ ضع رابط الـ Web App هنا
const DRIVE_API_URL = 'https://script.google.com/macros/s/AKfycbwGhithMfH9TAS9c-BHdBf8izJKHyOypySOT8OVR4FNQ-6O_fbHThPcbC0WTMEr4-LoAw/exec';

// ===== رفع ملف إلى Google Drive =====
async function uploadFileToDrive(file, onProgress) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      const payload = JSON.stringify({
        action: 'upload',
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileData: base64
      });

      const xhr = new XMLHttpRequest();
      xhr.open('POST', DRIVE_API_URL, true);
      xhr.setRequestHeader('Content-Type', 'text/plain;charset=utf-8');
      
      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        };
      }
      
      xhr.onload = () => {
        try {
          // الرد أحياناً بيكون نص مش JSON بسبب CORS
          let res;
          try { res = JSON.parse(xhr.responseText); } 
          catch (e) { res = { success: true, rawResponse: xhr.responseText }; }
          
          // ابحث عن fileId في الرد
          if (res.success || xhr.status === 200) {
            resolve(res);
          } else {
            reject(new Error(res.error || 'Upload failed'));
          }
        } catch (e) {
          reject(new Error('Invalid response: ' + xhr.responseText.substring(0, 200)));
        }
      };
      
      xhr.onerror = () => reject(new Error('Network error'));
      xhr.ontimeout = () => reject(new Error('Timeout'));
      xhr.timeout = 300000; // 5 دقائق
      
      xhr.send(payload);
    };
    
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsDataURL(file);
  });
}

// ===== حذف ملف من Drive =====
async function deleteFileFromDrive(fileId) {
  try {
    const response = await fetch(DRIVE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'delete', fileId })
    });
    const text = await response.text();
    try { return JSON.parse(text); } catch (e) { return { success: true }; }
  } catch (err) {
    console.error('Delete error:', err);
    return { success: false, error: err.message };
  }
}

// ===== تحميل ملف من Drive =====
function downloadFileFromDrive(fileId, fileName) {
  const url = `${DRIVE_API_URL}?action=download&fileId=${fileId}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName || 'file';
  a.target = '_blank';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ===== رابط مباشر للتحميل من Google Drive =====
function getDirectDownloadUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

// ===== رابط المعاينة =====
function getPreviewUrl(fileId) {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

// ===== قائمة الملفات =====
async function listDriveFiles() {
  try {
    const response = await fetch(`${DRIVE_API_URL}?action=list`);
    const data = await response.json();
    return data.files || [];
  } catch (err) {
    console.error('List error:', err);
    return [];
  }
}