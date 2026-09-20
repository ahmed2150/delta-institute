// ============================================
// ===== Delta Institute - Auth System ======
// ============================================

// ===== Storage =====
const getUsers = () => JSON.parse(localStorage.getItem('deltaUsers') || '[]');
const saveUsers = (users) => localStorage.setItem('deltaUsers', JSON.stringify(users));
const setCurrentUser = (user) => localStorage.setItem('deltaCurrentUser', JSON.stringify(user));
const getCurrentUser = () => JSON.parse(localStorage.getItem('deltaCurrentUser') || 'null');

// ===== Doctor Code Validation =====
// يقبل: dr + أي 4 أرقام (dr0000, dr0001, dr1234, dr9999...)
function isValidDoctorCode(code) {
  return /^dr\d{4}$/i.test(code);
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

  // إخفاء الكل أولاً
  levelSelect.style.display = 'none';
  doctorCodeBox.style.display = 'none';
  staffCodeBox.style.display = 'none';

  // تنظيف القيم
  document.getElementById('regDoctorCode').value = '';
  document.getElementById('regStaffCode').value = '';

  // إظهار حسب الدور
  if (role === 'student') {
    levelSelect.style.display = 'block';
  } else if (role === 'doctor') {
    doctorCodeBox.style.display = 'block';
  } else if (role === 'staff') {
    staffCodeBox.style.display = 'block';
  }
}

// ===== Password Strength (Student) =====
function isStrongPassword(pwd) {
  return pwd.length >= 8 && /[A-Za-z]/.test(pwd) && /[0-9]/.test(pwd);
}

// ===== Register =====
function handleRegister(e) {
  e.preventDefault();

  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const password = document.getElementById('regPassword').value;
  const role = document.querySelector('input[name="role"]:checked').value;
  const level = role === 'student' ? document.getElementById('regLevel').value : null;
  const doctorCode = document.getElementById('regDoctorCode').value.trim().toLowerCase();
  const staffCode = document.getElementById('regStaffCode').value.trim().toLowerCase();
  const errorMsg = document.getElementById('errorMsg');

  errorMsg.style.color = '#dc2626';
  errorMsg.textContent = '';

  const users = getUsers();

  // ===== تحقق الطالب =====
  if (role === 'student') {
    if (!isStrongPassword(password)) {
      errorMsg.textContent = '❌ كلمة المرور للطالب: 8 خانات على الأقل + حرف + رقم';
      return;
    }
  }
  // ===== تحقق الدكتور =====
  else if (role === 'doctor') {
    if (password.length < 6) {
      errorMsg.textContent = '❌ كلمة المرور للدكتور: 6 خانات على الأقل';
      return;
    }
    if (!doctorCode) {
      errorMsg.textContent = '❌ أدخل كود الدكتور';
      return;
    }
    if (!isValidDoctorCode(doctorCode)) {
      errorMsg.textContent = '❌ صيغة كود الدكتور غير صحيحة. لازم dr + 4 أرقام (مثال: dr1234)';
      return;
    }
    if (users.find(u => u.doctorCode === doctorCode)) {
      errorMsg.textContent = '❌ هذا الكود مستخدم بالفعل من دكتور آخر';
      return;
    }
  }
  // ===== تحقق الموظف =====
  else if (role === 'staff') {
    if (password.length < 6) {
      errorMsg.textContent = '❌ كلمة المرور للموظف: 6 خانات على الأقل';
      return;
    }
    if (!staffCode) {
      errorMsg.textContent = '❌ أدخل كود الموظف';
      return;
    }
    if (!STAFF_CODES.includes(staffCode)) {
      errorMsg.textContent = '❌ كود الموظف غير صحيح';
      return;
    }
    if (users.find(u => u.staffCode === staffCode)) {
      errorMsg.textContent = '❌ هذا الكود مستخدم بالفعل';
      return;
    }
  }

  // ===== تحقق البريد =====
  if (users.find(u => u.email === email)) {
    errorMsg.textContent = '❌ البريد الإلكتروني مسجل بالفعل';
    return;
  }

  // ===== إنشاء المستخدم =====
  const newUser = {
    id: Date.now(),
    name,
    email,
    password,
    role,
    level,
    doctorCode: role === 'doctor' ? doctorCode : null,
    staffCode: role === 'staff' ? staffCode : null,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);
  setCurrentUser(newUser);

  errorMsg.style.color = '#16a34a';
  errorMsg.textContent = '✅ تم إنشاء الحساب! جاري التحويل...';

  setTimeout(() => redirectByRole(newUser), 800);
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

  setTimeout(() => redirectByRole(user), 500);
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
document.addEventListener('DOMContentLoaded', () => {
  // ربط الـ radio buttons بدالة toggle
  document.querySelectorAll('input[name="role"]').forEach(radio => {
    radio.addEventListener('change', toggleRoleFields);
  });

  // لو مسجل بالفعل، حوّله للوحة بتاعته
  const user = getCurrentUser();
  const path = window.location.pathname;
  if (user && (path.endsWith('index.html') || path === '/' || path.endsWith('/delta-institute/'))) {
    redirectByRole(user);
  }
});
