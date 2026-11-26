const express = require('express');
const bcrypt = require('bcryptjs');
const { pool } = require('./db');
const { signToken, authMiddleware, adminOnly, COOKIE_NAME } = require('./auth');

const router = express.Router();

// 1. РЕГИСТРАЦИЯ
router.post('/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) return res.status(400).json({ error: 'Заполните все поля' });
  if (password.length < 6) return res.status(400).json({ error: 'Пароль должен быть от 6 символов' });

  try {
    const hash = bcrypt.hashSync(password, 10);
    // RETURNING * возвращает созданную запись
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, email, hash]
    );
    
    const user = result.rows[0];
    res.cookie(COOKIE_NAME, signToken(user), { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 });
    res.json({ user });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Это имя или email уже заняты' });
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 2. ВХОД
router.post('/auth/login', async (req, res) => {
  const { login, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1 OR email = $1', [login]);
    const user = result.rows[0];
    
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Неверный логин или пароль' });
    }
    if (user.banned) return res.status(403).json({ error: 'Аккаунт заблокирован' });

    res.cookie(COOKIE_NAME, signToken(user), { httpOnly: true, maxAge: 7 * 24 * 3600 * 1000 });
    res.json({ user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// 3. ВЫХОД
router.post('/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.json({ ok: true });
});

// 4. ПОЛУЧИТЬ СВОИ ДАННЫЕ
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// 5. АДМИНКА (Список пользователей)
router.get('/admin/users', authMiddleware, adminOnly, async (req, res) => {
  const result = await pool.query('SELECT id, username, email, role, banned, wins, games_played FROM users ORDER BY id');
  res.json({ users: result.rows });
});

// 6. АДМИНКА (Бан/Разбан)
router.post('/admin/ban', authMiddleware, adminOnly, async (req, res) => {
  await pool.query('UPDATE users SET banned = $1 WHERE id = $2', [req.body.banned, req.body.userId]);
  res.json({ ok: true });
});

// 7. РЕЙТИНГ
router.get('/rating', async (req, res) => {
  const result = await pool.query('SELECT username, wins, games_played FROM users WHERE role = $1 ORDER BY wins DESC LIMIT 50', ['user']);
  res.json({ players: result.rows });
});

module.exports = router;