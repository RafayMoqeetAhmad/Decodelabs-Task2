// =============================================
//  DecodeLabs – Project 2: Backend API
//  Node.js + Express | Full CRUD REST API
//  Batch 2026
// =============================================

const express = require('express');
const cors    = require('cors');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── In-memory Database ────────────────────────
let users = [
  { id: 1, name: 'Rafay Ahmad',  email: 'rafay@decodelabs.tech',  role: 'intern',  createdAt: new Date().toISOString() },
  { id: 2, name: 'Ali Hassan',   email: 'ali@decodelabs.tech',    role: 'intern',  createdAt: new Date().toISOString() },
  { id: 3, name: 'Sara Khan',    email: 'sara@decodelabs.tech',   role: 'mentor',  createdAt: new Date().toISOString() },
  { id: 4, name: 'Usman Malik',  email: 'usman@decodelabs.tech',  role: 'admin',   createdAt: new Date().toISOString() },
];
let nextId = 5;

// ── Response Helpers ──────────────────────────
const success = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });

const fail = (res, message, status = 400) =>
  res.status(status).json({ success: false, error: message });

// ── Validation ────────────────────────────────
const validateUser = ({ name, email, role }) => {
  const errors = [];
  if (!name  || typeof name !== 'string' || name.trim().length < 2)
    errors.push('name must be at least 2 characters');
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.push('email must be a valid address');
  if (role && !['intern', 'mentor', 'admin'].includes(role))
    errors.push('role must be: intern | mentor | admin');
  return errors;
};

const emailExists = (email, excludeId = null) =>
  users.some(u => u.email === email && u.id !== excludeId);

// =============================================
//  ROUTES
// =============================================

// GET /api/status
app.get('/api/status', (_req, res) => {
  success(res, {
    status:    'online',
    project:   'DecodeLabs Project 2 – Backend API',
    batch:     '2026',
    timestamp: new Date().toISOString(),
    totalUsers: users.length,
    endpoints: [
      'GET    /api/status',
      'GET    /api/users',
      'GET    /api/users?role=intern',
      'GET    /api/users/:id',
      'POST   /api/users',
      'PUT    /api/users/:id',
      'DELETE /api/users/:id',
    ],
  });
});

// GET /api/users
app.get('/api/users', (req, res) => {
  const { role, search } = req.query;
  let result = [...users];
  if (role)   result = result.filter(u => u.role === role);
  if (search) result = result.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );
  success(res, { count: result.length, users: result });
});

// GET /api/users/:id
app.get('/api/users/:id', (req, res) => {
  const id   = parseInt(req.params.id);
  const user = users.find(u => u.id === id);
  if (!user) return fail(res, `User with id ${id} not found`, 404);
  success(res, { user });
});

// POST /api/users
app.post('/api/users', (req, res) => {
  const { name, email, role = 'intern' } = req.body;

  const errors = validateUser({ name, email, role });
  if (errors.length) return fail(res, errors.join('; '), 400);

  if (emailExists(email))
    return fail(res, 'Email already registered', 409);

  const user = {
    id: nextId++,
    name: name.trim(),
    email: email.toLowerCase(),
    role,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  success(res, { user }, 201);
});

// PUT /api/users/:id
app.put('/api/users/:id', (req, res) => {
  const id    = parseInt(req.params.id);
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return fail(res, `User ${id} not found`, 404);

  const { name, email, role } = req.body;
  const patch = {
    name:  name  ?? users[index].name,
    email: email ?? users[index].email,
    role:  role  ?? users[index].role,
  };

  const errors = validateUser(patch);
  if (errors.length) return fail(res, errors.join('; '), 400);

  if (email && emailExists(email, id))
    return fail(res, 'Email already in use', 409);

  users[index] = { ...users[index], ...patch, updatedAt: new Date().toISOString() };
  success(res, { user: users[index] });
});

// DELETE /api/users/:id
app.delete('/api/users/:id', (req, res) => {
  const id    = parseInt(req.params.id);
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return fail(res, `User ${id} not found`, 404);
  const [deleted] = users.splice(index, 1);
  success(res, { deleted });
});

// Root
app.get('/', (_req, res) => {
  res.json({ message: '🚀 DecodeLabs Project 2 API is running!', docs: 'GET /api/status' });
});

// 404
app.use((req, res) => {
  fail(res, `Route ${req.method} ${req.path} not found`, 404);
});

// Global error
app.use((err, _req, res, _next) => {
  console.error('Error:', err.message);
  fail(res, 'Internal server error', 500);
});

app.listen(PORT, () => {
  console.log(`\n✅  DecodeLabs Project 2 API`);
  console.log(`🌐  http://localhost:${PORT}`);
  console.log(`📋  http://localhost:${PORT}/api/status\n`);
});

module.exports = app;
