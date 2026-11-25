const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// База создастся в папке server
const db = new Database(path.join(__dirname, 'pixelopoly.db'));

function initDb() {
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  db.exec(schema);

  // Создаем первого админа, если БД пустая
  const admin = db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, 'admin')`)
      .run('admin', 'admin@local', hash);
    console.log('⚠ СОЗДАН АДМИН: логин admin / пароль admin123 (ОБЯЗАТЕЛЬНО СМЕНИТЕ)');
  }
}

module.exports = { db, initDb };