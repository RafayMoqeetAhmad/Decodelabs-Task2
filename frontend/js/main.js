/* =============================================
   DecodeLabs – Full Stack App
   Frontend JS — connects to backend API
   Vanilla JS only | No frameworks
   ============================================= */

'use strict';

const API_BASE = 'http://localhost:3000/api';

// ── Nav Toggle ────────────────────────────────
const navToggle = document.getElementById('navToggle');
const navMenu   = document.getElementById('navMenu');

navToggle?.addEventListener('click', () => {
  const isOpen = navMenu.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', String(isOpen));
});
navMenu?.querySelectorAll('.nav-link').forEach(l =>
  l.addEventListener('click', () => {
    navMenu.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  })
);
document.addEventListener('click', e => {
  if (!navMenu?.contains(e.target) && !navToggle?.contains(e.target)) {
    navMenu?.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
  }
});

// ── Active nav on scroll ──────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks  = document.querySelectorAll('.nav-link');
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting)
      navLinks.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${e.target.id}`));
  });
}, { rootMargin: '-40% 0px -40% 0px' });
sections.forEach(s => io.observe(s));

// ── Toast ─────────────────────────────────────
const toastEl = document.getElementById('toast');
let toastTimer;
function showToast(msg, type = 'success') {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.className = `toast show toast-${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.className = 'toast', 3500);
}

// ── API Status Check ──────────────────────────
const statusDot  = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

async function checkApiStatus() {
  try {
    const res  = await fetch(`${API_BASE}/status`, { signal: AbortSignal.timeout(4000) });
    const json = await res.json();
    if (json.success) {
      statusDot.className  = 'status-dot online';
      statusText.textContent = `API Online · ${json.data.totalUsers} users`;
    }
  } catch {
    statusDot.className  = 'status-dot offline';
    statusText.textContent = 'API Offline — start the backend server';
  }
}

// ── Dashboard Stats ───────────────────────────
async function loadStats() {
  try {
    const [all, interns, mentors, admins] = await Promise.all([
      fetch(`${API_BASE}/users`).then(r => r.json()),
      fetch(`${API_BASE}/users?role=intern`).then(r => r.json()),
      fetch(`${API_BASE}/users?role=mentor`).then(r => r.json()),
      fetch(`${API_BASE}/users?role=admin`).then(r => r.json()),
    ]);
    animateNum('statTotal',   all.data?.count    ?? 0);
    animateNum('statInterns', interns.data?.count ?? 0);
    animateNum('statMentors', mentors.data?.count ?? 0);
    animateNum('statAdmins',  admins.data?.count  ?? 0);
  } catch {
    ['statTotal','statInterns','statMentors','statAdmins'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '?';
    });
  }
}

function animateNum(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let cur = 0;
  const step = Math.ceil(target / 20);
  const t = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = cur;
    if (cur >= target) clearInterval(t);
  }, 40);
}

// ── Load Users Table ──────────────────────────
let allUsers = [];

async function loadUsers() {
  const tbody      = document.getElementById('usersTableBody');
  const search     = document.getElementById('searchInput')?.value.trim()  || '';
  const roleFilter = document.getElementById('roleFilter')?.value           || '';

  tbody.innerHTML = `<tr><td colspan="6" class="table-loading">Loading...</td></tr>`;

  let url = `${API_BASE}/users`;
  const params = new URLSearchParams();
  if (roleFilter) params.set('role',   roleFilter);
  if (search)     params.set('search', search);
  if ([...params].length) url += '?' + params.toString();

  try {
    const res  = await fetch(url);
    const json = await res.json();

    if (!json.success) throw new Error(json.error);

    allUsers = json.data.users;

    if (!allUsers.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="table-empty">No users found.</td></tr>`;
      return;
    }

    tbody.innerHTML = allUsers.map(u => `
      <tr data-id="${u.id}">
        <td><strong>#${u.id}</strong></td>
        <td>${escHtml(u.name)}</td>
        <td>${escHtml(u.email)}</td>
        <td><span class="role-badge role-${u.role}">${u.role}</span></td>
        <td>${formatDate(u.createdAt)}</td>
        <td>
          <div class="actions-cell">
            <button class="btn-edit"   onclick="startEdit(${u.id})"   aria-label="Edit ${escHtml(u.name)}">Edit</button>
            <button class="btn-danger" onclick="deleteUser(${u.id})"  aria-label="Delete ${escHtml(u.name)}">Delete</button>
          </div>
        </td>
      </tr>
    `).join('');

  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-error">⚠ Could not load users. Is the backend running?</td></tr>`;
  }
}

// ── Delete User ───────────────────────────────
async function deleteUser(id) {
  if (!confirm(`Delete user #${id}?`)) return;
  try {
    const res  = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    showToast(`User #${id} deleted successfully`, 'success');
    await loadUsers();
    await loadStats();
    await checkApiStatus();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// ── Add / Edit User Form ──────────────────────
function clearForm() {
  document.getElementById('inputName').value  = '';
  document.getElementById('inputEmail').value = '';
  document.getElementById('inputRole').value  = 'intern';
  document.getElementById('editUserId').value = '';
  document.getElementById('errName').textContent  = '';
  document.getElementById('errEmail').textContent = '';
  document.getElementById('formResult').textContent = '';
  document.getElementById('formResult').className  = 'form-result';
  document.getElementById('submitBtn').textContent  = 'Add User';
  document.getElementById('cancelBtn').style.display = 'none';
  document.getElementById('formHeading').textContent = 'Add New User';
  document.querySelector('#add-user .section-sub').innerHTML =
    'Sends a <code>POST /api/users</code> request to the backend.';
}

function startEdit(id) {
  const user = allUsers.find(u => u.id === id);
  if (!user) return;
  document.getElementById('inputName').value  = user.name;
  document.getElementById('inputEmail').value = user.email;
  document.getElementById('inputRole').value  = user.role;
  document.getElementById('editUserId').value = user.id;
  document.getElementById('submitBtn').textContent  = 'Update User';
  document.getElementById('cancelBtn').style.display = 'inline-block';
  document.getElementById('formHeading').textContent = `Edit User #${id}`;
  document.querySelector('#add-user .section-sub').innerHTML =
    `Sends a <code>PUT /api/users/${id}</code> request to the backend.`;
  document.getElementById('add-user').scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() { clearForm(); }

function clientValidate(name, email) {
  let ok = true;
  document.getElementById('errName').textContent  = '';
  document.getElementById('errEmail').textContent = '';
  if (!name || name.trim().length < 2) {
    document.getElementById('errName').textContent = 'Name must be at least 2 characters.';
    ok = false;
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById('errEmail').textContent = 'Enter a valid email address.';
    ok = false;
  }
  return ok;
}

async function submitUser() {
  const name    = document.getElementById('inputName').value.trim();
  const email   = document.getElementById('inputEmail').value.trim();
  const role    = document.getElementById('inputRole').value;
  const editId  = document.getElementById('editUserId').value;
  const resultEl= document.getElementById('formResult');
  const btn     = document.getElementById('submitBtn');

  if (!clientValidate(name, email)) return;

  btn.disabled = true;
  btn.textContent = editId ? 'Updating...' : 'Adding...';
  resultEl.textContent = '';
  resultEl.className   = 'form-result';

  const isEdit = !!editId;
  const url    = isEdit ? `${API_BASE}/users/${editId}` : `${API_BASE}/users`;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, role }),
    });
    const json = await res.json();

    if (!json.success) throw new Error(json.error);

    resultEl.textContent = isEdit
      ? `✅ User #${json.data.user.id} updated!`
      : `✅ User "${json.data.user.name}" added (ID: ${json.data.user.id})`;
    resultEl.className = 'form-result ok';
    showToast(resultEl.textContent, 'success');
    clearForm();
    await loadUsers();
    await loadStats();
    await checkApiStatus();

  } catch (err) {
    resultEl.textContent = '❌ ' + err.message;
    resultEl.className   = 'form-result err';
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = editId ? 'Update User' : 'Add User';
  }
}

// ── Search + Filter (debounced) ───────────────
let debounceTimer;
document.getElementById('searchInput')?.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(loadUsers, 300);
});
document.getElementById('roleFilter')?.addEventListener('change', loadUsers);

// ── Helpers ───────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-PK', { day:'2-digit', month:'short', year:'numeric' }) : '—';
}

// ── Init ──────────────────────────────────────
(async function init() {
  await checkApiStatus();
  await loadStats();
  await loadUsers();
})();
