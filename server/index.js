const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');

// Импорт наших модулей
const { initDb } = require('./db');
const routes = require('./routes');
const { attachSocket } = require('./game');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });

// --- MIDDLEWARE ---
app.use(express.json());      // Чтобы сервер понимал JSON от фронтенда
app.use(cookieParser());      // Чтобы сервер мог читать куки (авторизация)

// --- СТАТИЧЕСКИЕ ФАЙЛЫ ---
// 1. Раздаем клиентскую часть (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../client')));

// 2. Раздаем картинки. 
// Проверяем, лежит ли папка img внутри client или рядом с server
app.use('/img', express.static(path.join(__dirname, '../client/img')));
// 1. Раздаем клиентскую часть (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, '../client')));

// 2. Раздаем картинки по новому пути
app.use('/img', express.static(path.join(__dirname, '../client/img'))); 
// Если папка img в корне проекта, раскомментируйте строку ниже:
// app.use('/img', express.static(path.join(__dirname, '../img')));

// 👇 ДОБАВЬТЕ ЭТИ ДВЕ СТРОКИ 👇
// Перехватываем старые пути с ../../ и отправляем в правильную папку
app.use('/..', express.static(path.join(__dirname, '../client'))); 
app.use('/../..', express.static(path.join(__dirname, '../client')));
// --- МАРШРУТЫ ---
// Редирект с главной страницы на игровое меню
app.get('/', (req, res) => {
  res.redirect('/pages/main.html');
});

// Подключаем API (регистрация, вход, рейтинг, админка)
app.use('/api', routes);

// --- ЗАПУСК ---
initDb().then(() => {
  attachSocket(io);
  const PORT = 3000;
  server.listen(PORT, () => {
    console.log(`🚀 Сервер успешно запущен: http://localhost:${PORT}`);
  });
});
