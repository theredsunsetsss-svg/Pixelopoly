const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('./db');
const { sign, authMiddleware, adminOnly, COOKIE } = require('./auth');
const router = express.Router();

// --- АВТОРИЗАЦИЯ ---
router.post('/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !password || !email) return res.status(400).json({ error: 'Заполните все поля' });
  
  const exists = db.prepare('SELECT id FROM users WHERE username=? OR email=?').get(username, email);
  if (exists) return res.status(400).json({ error: 'Имя или Email заняты' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)').run(username, email, hash);
  
  const user = { id: info.lastInsertRowid, username, role: 'user' };
  res.cookie(COOKIE, sign(user), { httpOnly: true, maxAge: 7*24*3600*1000 });
  res.json({ user });
});

router.post('/auth/login', (req, res) => {
  const { login, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username=? OR email=?').get(login, login);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  if (user.banned) return res.status(403).json({ error: 'Аккаунт заблокирован' });

  res.cookie(COOKIE, sign(user), { httpOnly: true, maxAge: 7*24*3600*1000 });
  res.json({ user: { id: user.id, username: user.username, role: user.role } });
});

router.post('/auth/logout', (req, res) => {
  res.clearCookie(COOKIE);
  res.json({ ok: true });
});

router.get('/me', authMiddleware, (req, res) => res.json({ user: req.user }));

// --- АДМИНКА ---
router.get('/admin/users', authMiddleware, adminOnly, (req, res) => {
  const users = db.prepare('SELECT id, username, email, role, banned, wins, games_played FROM users').all();
  res.json({ users });
});

router.post('/admin/ban', authMiddleware, adminOnly, (req, res) => {
  db.prepare('UPDATE users SET banned=? WHERE id=?').run(req.body.banned ? 1 : 0, req.body.userId);
  res.json({ ok: true });
});

// --- РЕЙТИНГ ---
router.get('/rating', (req, res) => {
  const players = db.prepare('SELECT username, wins, games_played FROM users WHERE role="user" ORDER BY wins DESC LIMIT 50').all();
  res.json({ players });
});

module.exports = router;