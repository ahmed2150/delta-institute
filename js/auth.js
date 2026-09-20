// ============================================
// ===== Delta Institute - Auth System ======
// ============================================

// ===== Storage =====
function getUsers() {
  return JSON.parse(localStorage.getItem('deltaUsers') || '[]');
}

function saveUsers(users) {
  localStorage.setItem('deltaUsers', JSON.stringify(users));
}

function setCurrentUser(user) {
  localStorage.setItem('deltaCurrentUser', JSON.stringify(user));
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('deltaCurrentUser') || 'null');
}

// ===== Doctor Code Check =====
// يقبل: dr + 4 أرقام (dr0000, dr2005, dr1234...)
function isValidDoctorCode(code) {
  if (!code) return false;
  code = code.trim().toLowerCase();
  // لازم يبدأ بـ dr وبعده 4 أرقام بالظبط
  if (code.length !== 6) return false;
  if (code.substring(0, 2) !== 'dr') return false;
  const numbers = code.substring(2);
  if (!/^\d{4}$/.test(numbers)) return false;
  return true;
}

// ===== Staff Codes =====
const STAFF_CODES = ['st0000', 'st0001', 'st0002', 'st0003', 'st0004', 'st0005'];

// ===== Tab Switching =====
function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));
  document.getElementById('errorMsg').textContent = '';

  if (tab === 'login') {
    document.querySelectorAll('.tab')[0].classList.add('active');
    document.getElementById('loginForm').classList.add('active');
  } else {
    document.querySelectorAll('.tab')[1].classList.add('active');
    document.getElementById('registerForm').classList.add('active');
  }
}

// ===== Toggle Role Fields =====
function toggleRoleFields() {
  const roleInput = document.querySelector('input[name="role"]:checked');
  if (!roleInput) return;

  const role = roleInput.value;
  const levelSelect = document.getElementById('regLevel');
  const doctorCodeBox = document.getElementById('doctorCodeBox');
  const staffCodeBox = document.getElementById('staffCodeBox');

  // إخفاء الكل
  levelSelect.style.display = 'none';
  doctorCodeBox.style.display = 'none';
  staffCodeBox.style.display = 'none';

  // إظهار حسب الدور
  if (role === 'student') {
    levelSelect.style.display = 'block';
  } else if (role === 'doctor') {
    doctorCodeBox.style.display = 'block';
  } else if (role === 'staff') {
    staffCodeBox.style.display = 'block';
  }
}

// ===== Password Strength =====
function isStrongPassword(pwd) {
  return pwd.length >= 8 && /[A-Za-z]/.test(pwd) && /[0-9]/.test(pwd);
}

// ===== Register =====
function handleRegister(e) {
  e.preventDefault();
  
  const errorMsg = document.getElementById('errorMsg');
  errorMsg.style.color = '#dc2626';
  errorMsg.textContent = '';

  // جلب القيم
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const password = document.getElementById('regPassword').value;
  const roleInput = document.querySelector('input[name="role"]:checked');
  
  if (!roleInput) {
    errorMsg.textContent = '❌ اختر نوع الحساب';
    return;
  }
  
  const role = roleInput.value;
  const level = role === 'student' ? document.getElementById('regLevel').value : null;
  const doctorCode = document.getElementById('regDoctorCode').value.trim().toLowerCase();
  const staffCode = document.getElementById('regStaffCode').value.trim().toLowerCase();

  // تحقق أساسي
  if (!name || !email || !password) {
    errorMsg.textContent = '❌ املأ كل الحقول';
    return;
  }

  const users = getUsers();

  // ====== تحقق الطالب ======
  if (role === 'student') {
    if (!isStrongPassword(password)) {
      errorMsg.textContent = '❌ كلمة المرور: 8 خانات على الأقل + حرف + رقم';
      return;
    }
  }
  
  // ====== تحقق الدكتور ======
  else if (role === 'doctor') {
    if (password.length < 6) {
      errorMsg.textContent = '❌ كلمة المرور: 6 خانات على الأقل';
      return;
    }
    
    if (!doctorCode) {
      errorMsg.textContent = '❌ أدخل كود الدكتور';
      return;
    }
    
    // ✅ التحقق من صيغة الكود
    if (!isValidDoctorCode(doctorCode)) {
      errorMsg.textContent = '❌ كود الدكتور غير صحيح. لازم dr + 4 أرقام (مثال: dr2005)';
      return;
    }
    
    // التحقق إن الكود مش مستخدم
    const codeUsed = users.find(u => u.doctorCode === doctorCode);
    if (codeUsed) {
      errorMsg.textContent = '❌ هذا الكود مستخدم بالفعل';
      return;
    }
  }
  
  // ====== تحقق الموظف ======
  else if (role === 'staff') {
    if (password.length < 6) {
      errorMsg.textContent = '❌ كلمة المرور: 6 خانات على الأقل';
      return;
    }
    
    if (!staffCode) {
      errorMsg.textContent = '❌ أدخل كود الموظف';
      return;
    }
    
    if (STAFF_CODES.indexOf(staffCode) === -1) {
      errorMsg.textContent = '❌ كود الموظف غير صحيح';
      return;
    }
    
    const codeUsed = users.find(u => u.staffCode === staffCode);
    if (codeUsed) {
      errorMsg.textContent = '❌ هذا الكود مستخدم بالفعل';
      return;
    }
  }

  // ====== تحقق البريد ======
  if (users.find(u => u.email === email)) {
    errorMsg.textContent = '❌ البريد الإلكتروني مسجل بالفعل';
    return;
  }

  // ====== إنشاء المستخدم ======
  const newUser = {
    id: Date.now(),
    name: name,
    email: email,
    password: password,
    role: role,
    level: level,
    doctorCode: role === 'doctor' ? doctorCode : null,
    staffCode: role === 'staff' ? staffCode : null,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);
  setCurrentUser(newUser);

  errorMsg.style.color = '#16a34a';
  errorMsg.textContent = '✅ تم إنشاء الحساب! جاري التحويل...';

  setTimeout(function() {
    redirectByRole(newUser);
  }, 800);
}

// ===== Login =====
function handleLogin(e) {
  e.preventDefault();
  
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const password = document.getElementById('loginPassword').value;
  const errorMsg = document.getElementById('errorMsg');

  errorMsg.style.color = '#dc2626';
  errorMsg.textContent = '';

  const users = getUsers();
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    errorMsg.textContent = '❌ البريد أو كلمة المرور غير صحيحة';
    return;
  }

  setCurrentUser(user);
  errorMsg.style.color = '#16a34a';
  errorMsg.textContent = '✅ جاري تسجيل الدخول...';

  setTimeout(function() {
    redirectByRole(user);
  }, 500);
}

// ===== Redirect =====
function redirectByRole(user) {
  if (user.role === 'doctor') {
    window.location.href = 'doctor.html';
  } else if (user.role === 'staff') {
    window.location.href = 'staff.html';
  } else {
    window.location.href = 'student.html';
  }
}

// ===== Check Auth =====
function checkAuth(requiredRole) {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }
  if (requiredRole && user.role !== requiredRole) {
    redirectByRole(user);
    return null;
  }
  return user;
}

// ===== Logout =====
function logout() {
  localStorage.removeItem('deltaCurrentUser');
  window.location.href = 'index.html';
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', function() {
  // ربط الأزرار
  document.querySelectorAll('input[name="role"]').forEach(function(radio) {
    radio.addEventListener('change', toggleRoleFields);
  });

  // لو مسجل بالفعل
  const user = getCurrentUser();
  const path = window.location.pathname;
  if (user && (path.endsWith('index.html') || path === '/' || path.endsWith('/delta-institute/'))) {
    redirectByRole(user);
  }
});
