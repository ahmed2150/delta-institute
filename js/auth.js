// ============================================
// ===== Delta Institute - Auth System ======
// ============================================

const getUsers = () => JSON.parse(localStorage.getItem('deltaUsers') || '[]');
const saveUsers = (users) => localStorage.setItem('deltaUsers', JSON.stringify(users));
const setCurrentUser = (user) => localStorage.setItem('deltaCurrentUser', JSON.stringify(user));
const getCurrentUser = () => JSON.parse(localStorage.getItem('deltaCurrentUser') || 'null');

const DOCTOR_CODES = [
  'dr0000', 'dr0001', 'dr0002', 'dr0003', 'dr0004', 'dr0005',
  'dr0006', 'dr0007', 'dr0008', 'dr0009', 'dr0010'
];

const STAFF_CODES = ['st0000', 'st0001', 'st0002', 'st0003', 'st0004', 'st0005'];

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

function toggleRoleFields() {
  const role = document.querySelector('input[name="role"]:checked').value;
  const levelSelect = document.getElementById('regLevel');
  const doctorCodeBox = document.getElementById('doctorCodeBox');
  const staffCodeBox = document.getElementById('staffCodeBox');

  doctorCodeBox.style.display = 'none';
  staffCodeBox.style.display = 'none';
  levelSelect.style.display = 'none';
  document.getElementById('regDoctorCode').value = '';
  document.getElementById('regStaffCode').value = '';

  if (role === 'student') levelSelect.style.display = 'block';
  else if (role === 'doctor') doctorCodeBox.style.display = 'block';
  else if (role === 'staff') staffCodeBox.style.display = 'block';
}

function isStrongPassword(pwd) {
  return pwd.length >= 8 && /[A-Za-z]/.test(pwd) && /[0-9]/.test(pwd);
}

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

  if (role === 'student') {
    if (!isStrongPassword(password)) {
      errorMsg.textContent = '❌ كلمة المرور للطالب: 8 خانات على الأقل + حرف + رقم';
      return;
    }
  } else if (role === 'doctor') {
    if (password.length < 6) {
      errorMsg.textContent = '❌ كلمة المرور للدكتور: 6 خانات على الأقل';
      return;
    }
    if (!doctorCode) { errorMsg.textContent = '❌ أدخل كود الدكتور'; return; }
    if (!DOCTOR_CODES.includes(doctorCode)) { errorMsg.textContent = '❌ كود الدكتور غير صحيح'; return; }
    if (users.find(u => u.doctorCode === doctorCode)) { errorMsg.textContent = '❌ الكود مستخدم بالفعل'; return; }
  } else if (role === 'staff') {
    if (password.length < 6) {
      errorMsg.textContent = '❌ كلمة المرور للموظف: 6 خانات على الأقل';
      return;
    }
    if (!staffCode) { errorMsg.textContent = '❌ أدخل كود الموظف'; return; }
    if (!STAFF_CODES.includes(staffCode)) { errorMsg.textContent = '❌ كود الموظف غير صحيح'; return; }
    if (users.find(u => u.staffCode === staffCode)) { errorMsg.textContent = '❌ الكود مستخدم بالفعل'; return; }
  }

  if (users.find(u => u.email === email)) {
    errorMsg.textContent = '❌ البريد الإلكتروني مسجل بالفعل';
    return;
  }

  const newUser = {
    id: Date.now(),
    name, email, password, role, level,
    doctorCode: role === 'doctor' ? doctorCode : null,
    staffCode: role === 'staff' ? staffCode : null,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  saveUsers(users);
  setCurrentUser(newUser);

  errorMsg.style.color = '#16a34a';
  errorMsg.textContent = '✅ تم إنشاء الحساب! جاري التحويل...';

  setTimeout(() => redirectByRole(newUser), 1000);
}

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

function redirectByRole(user) {
  if (user.role === 'doctor') window.location.href = 'doctor.html';
  else if (user.role === 'staff') window.location.href = 'staff.html';
  else window.location.href = 'student.html';
}

function checkAuth(requiredRole) {
  const user = getCurrentUser();
  if (!user) { window.location.href = 'index.html'; return null; }
  if (requiredRole && user.role !== requiredRole) { redirectByRole(user); return null; }
  return user;
}

function logout() {
  localStorage.removeItem('deltaCurrentUser');
  window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
  const user = getCurrentUser();
  const path = window.location.pathname;
  if (user && (path.endsWith('index.html') || path === '/' || path.endsWith('/delta-institute/'))) {
    redirectByRole(user);
  }
});