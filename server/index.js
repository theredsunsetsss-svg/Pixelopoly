const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cookieParser = require('cookie-parser');
const { initDb } = require('./db');
const routes = require('./routes');
const { attachSocket } = require('./game');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true, credentials: true } });

app.use(express.json());
app.use(cookieParser());

app.use(express.static(path.join(__dirname, '../client')));

app.get('/', (req, res) => {
  res.redirect('/pages/main.html');
});

app.use('/api', routes);

initDb();
attachSocket(io);

const PORT = 3000;
server.listen(PORT, () => console.log(`Сервер запущен: http://localhost:${PORT}`));