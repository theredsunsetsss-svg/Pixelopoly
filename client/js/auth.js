const jwt = require('jsonwebtoken');
const { pool } = require('./db');

const SECRET = 'pixelopoly-secret-key-123';
const COOKIE_NAME = 'pixelopoly_token';

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, SECRET, { expiresIn: '7d' });
}

// Middleware проверки токена (теперь асинхронный)
async function authMiddleware(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'Нужно войти в аккаунт' });

  try {
    const decoded = jwt.verify(token, SECRET);
    const result = await pool.query('SELECT id, username, email, role, banned, wins, games_played FROM users WHERE id = $1', [decoded.id]);
    
    if (result.rowCount === 0) return res.status(401).json({ error: 'Пользователь не найден' });
    
    const user = result.rows[0];
    if (user.banned) return res.status(403).json({ error: 'Аккаунт заблокирован' });
    
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Сессия истекла, войдите снова' });
  }
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Доступ только для админа' });
  next();
}

module.exports = { signToken, authMiddleware, adminOnly, COOKIE_NAME };