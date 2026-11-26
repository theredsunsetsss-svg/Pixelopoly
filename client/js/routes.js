const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('./db');
const { signToken, authMiddleware, COOKIE_NAME } = require('./auth');

const router = express.Router();

// 1. РЕГИСТРАЦИЯ
router.post('/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) return res.status(400).json({ error: 'Заполните все поля' });
  if (password.length < 6) return res.status(400).json({ error: 'Пароль должен быть от 6 символов' });

  // Проверяем, занят ли логин или почта
  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) return res.status(400).json({ error: 'Это имя или email уже заняты' });

  // Хэшируем пароль и сохраняем
  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)')
                   .run(username, email, hash);

  // Сразу авторизуем пользователя
  const user = { id: result.lastInsertRowid, username, role: 'user' };
  res.cookie(COOKIE_NAME, signToken(user), { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 });
  res.json({ user });
});

// 2. ВХОД
router.post('/auth/login', (req, res) => {
  const { login, password } = req.body;

  // Ищем по имени или email
  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(login, login);
  
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Неверный логин или пароль' });
  }
  if (user.banned) return res.status(403).json({ error: 'Аккаунт заблокирован' });

  res.cookie(COOKIE_NAME, signToken(user), { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 });
  res.json({ user: { id: user.id, username: user.username, role: user.role } });
});

// 3. ВЫХОД
router.post('/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

// 4. ПОЛУЧИТЬ СВОИ ДАННЫЕ (Кто я?)
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;