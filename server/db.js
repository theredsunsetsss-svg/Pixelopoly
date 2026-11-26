const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// Настройки подключения (замените 'ваш_пароль' на пароль из pgAdmin)
const pool = new Pool({
  user: 'pixelopoly_user',
  host: 'localhost',
  database: 'pixelopoly',
  password: 'ваш_пароль', // <-- ВАШ ПАРОЛЬ
  port: 5432,
});

async function initDb() {
  try {
    // Создаем таблицу
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'user',
        banned BOOLEAN NOT NULL DEFAULT FALSE,
        wins INTEGER NOT NULL DEFAULT 0,
        games_played INTEGER NOT NULL DEFAULT 0
      );
    `);

    // Создаем игру (для сохранения результатов партий)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        room_code VARCHAR(10) NOT NULL,
        winner_id INTEGER REFERENCES users(id),
        players_json TEXT NOT NULL,
        finished_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Создаем админа, если его нет
    const adminCheck = await pool.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
    if (adminCheck.rowCount === 0) {
      const hash = bcrypt.hashSync('admin123', 10);
      await pool.query(
        "INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, 'admin')",
        ['admin', 'admin@local', hash]
      );
      console.log('⚠ СОЗДАН АДМИН: логин admin, пароль admin123 (СМЕНИТЕ ПАРОЛЬ!)');
    }
  } catch (err) {
    console.error('Ошибка инициализации БД:', err);
  }
}

module.exports = { pool, initDb };