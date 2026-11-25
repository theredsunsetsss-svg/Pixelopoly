const jwt = require('jsonwebtoken');
const { db } = require('./db');

const SECRET = 'super-secret-pixelopoly-key'; // В продакшене вынести в .env
const COOKIE = 'pixelopoly_token';

function sign(user) {
  return jwt.sign({ id: user.id, role: user.role, username: user.username }, SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const token = req.cookies?.[COOKIE] || req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Не авторизован' });
  try {
    const payload = jwt.verify(token, SECRET);
    const user = db.prepare('SELECT id, username, email, role, banned, wins, games_played FROM users WHERE id=?').get(payload.id);
    if (!user || user.banned) return res.status(403).json({ error: 'Доступ запрещён' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Сессия истекла' });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Только для админа' });
  next();
}

module.exports = { sign, authMiddleware, adminOnly, COOKIE, SECRET };