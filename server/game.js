const { pool } = require('./db'); // Исправлен путь (было .db)

// Упрощенное поле (индекс = позиция)
const BOARD = [
  ["Старт","start",null],["Руины I","territory",100],["Сундук","event",null],["Руины II","territory",120],
  ["Пещеры I","territory",140],["Лагерь","territory",160],["Ловушка","event",null],["Пещеры II","territory",160],
  ["Отдых","corner",null],["Город I","territory",180],["Артефакт","event",null],["Город II","territory",200],
  ["Порт","territory",180],["Пираты I","territory",220],["Задание","event",null],["Пираты II","territory",240],
  ["Тюрьма","jail",null],["Руины III","territory",140],["Сундук","event",null],["Пещеры III","territory",180],
  ["Таверна","territory",200],["Город III","territory",220],["Телепорт","event",null],["Пираты III","territory",260],
  ["Переход","corner",null],["Компас","event",null],["Караван","territory",220],["Задание","event",null],
  ["Город IV","territory",240],["Ловушка","event",null],["Пираты IV","territory",280],["Сундук","event",null],
  ["Пещеры IV","territory",200],["Отдых","corner",null],["Лагерь","territory",240],["Событие","event",null],
  ["Руины IV","territory",160],["Телепорт","event",null]
];

const rooms = new Map();

function attachSocket(io) {
  io.on('connection', (socket) => {
    
    // 1. СОЗДАНИЕ КОМНАТЫ
    socket.on('room:create', (opts, cb) => {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      rooms.set(code, {
        code, status: 'waiting', host: socket.id, turn: 0, current: 0,
        settings: opts,
        players: [{ 
          id: socket.id, 
          name: opts.name, 
          money: opts.startMoney, 
          pos: 0, 
          ready: false, 
          char: null,
          userId: opts.userId || null // Сохраняем ID пользователя из БД (если есть)
        }],
        props: {} // купленные клетки {cellIndex: {owner: socketId}}
      });
      socket.join(code);
      socket.data.room = code;
      cb({ success: true, code });
      io.to(code).emit('room:update', rooms.get(code));
    });

    // 2. ВХОД В КОМНАТУ
    socket.on('room:join', ({ code, name, userId }, cb) => {
      const room = rooms.get(code);
      if (!room) return cb({ success: false, message: 'Комната не найдена' });
      if (room.status !== 'waiting') return cb({ success: false, message: 'Игра уже идет' });
      
      room.players.push({ 
        id: socket.id, 
        name, 
        money: room.settings.startMoney, 
        pos: 0, 
        ready: false, 
        char: null,
        userId: userId || null 
      });
      socket.join(code);
      socket.data.room = code;
      cb({ success: true });
      io.to(code).emit('room:update', room);
    });

    // 3. ВЫБОР ПЕРСОНАЖА
    socket.on('player:character', (char) => {
      const room = rooms.get(socket.data.room);
      if (!room) return;
      const p = room.players.find(x => x.id === socket.id);
      if (p && !p.ready) p.char = char;
      io.to(room.code).emit('room:update', room);
    });

    // 4. ГОТОВНОСТЬ
    socket.on('player:ready', (ready) => {
      const room = rooms.get(socket.data.room);
      if (!room) return;
      const p = room.players.find(x => x.id === socket.id);
      if (p) p.ready = ready;
      
      io.to(room.code).emit('room:update', room);
      
      // Если все готовы и игроков >= 2, начинаем игру
      if (room.players.length >= 2 && room.players.every(x => x.ready)) {
        room.status = 'playing';
        io.to(room.code).emit('game:started');
        io.to(room.code).emit('room:update', room);
      }
    });

    // 5. БРОСОК КУБИКОВ
    socket.on('game:roll', () => {
      const room = rooms.get(socket.data.room);
      if (!room || room.status !== 'playing') return;
      if (room.players[room.current].id !== socket.id) return;

      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      
      io.to(room.code).emit('game:dice', { first: d1, second: d2 });

      // Задержка для анимации кубиков
      setTimeout(() => {
        const p = room.players[room.current];
        p.pos = (p.pos + d1 + d2) % BOARD.length;
        
        const cell = BOARD[p.pos];
        const prop = room.props[p.pos];
        let action = null;

        if (cell[1] === 'start') { 
          p.money += 200; 
          action = 'start'; 
        } else if (cell[1] === 'territory') {
          if (!prop) { 
            action = 'buy'; 
          } else if (prop.owner !== p.id) {
            const rent = Math.round(cell[2] * 0.2);
            p.money -= rent;
            const owner = room.players.find(x => x.id === prop.owner);
            if (owner) owner.money += rent;
            action = 'rent';
          }
        }

        io.to(room.code).emit('game:landed', { cell, pos: p.pos, action, price: cell[2] });
        io.to(room.code).emit('room:update', room);
      }, 1000); 
    });

    // 6. ПОКУПКА КЛЕТКИ
    socket.on('property:buy', () => {
      const room = rooms.get(socket.data.room);
      if (!room || room.status !== 'playing') return;
      const p = room.players[room.current];
      const cell = BOARD[p.pos];
      
      if (cell[1] === 'territory' && !room.props[p.pos] && p.money >= cell[2]) {
        p.money -= cell[2];
        room.props[p.pos] = { owner: p.id };
        io.to(room.code).emit('room:update', room);
      }
    });

    // 7. КОНЕЦ ХОДА
    socket.on('game:end-turn', () => {
      const room = rooms.get(socket.data.room);
      if (!room || room.status !== 'playing') return;
      if (room.players[room.current].id !== socket.id) return;

      room.current = (room.current + 1) % room.players.length;
      if (room.current === 0) room.turn++;
      
      // Проверка на окончание игры
      if (room.turn >= room.settings.maxTurns) {
        room.status = 'finished';
        const winner = [...room.players].sort((a, b) => b.money - a.money)[0];
        
        // --- СОХРАНЕНИЕ В POSTGRESQL ---
        // 1. Сохраняем саму игру
        pool.query(
          'INSERT INTO games (room_code, players_json) VALUES ($1, $2)',
          [room.code, JSON.stringify(room.players)]
        ).catch(err => console.error('Ошибка при сохранении игры:', err));

        // 2. Обновляем статистику игроков
        room.players.forEach(async (player) => {
          if (player.userId) {
            try {
              // Всем +1 партия
              await pool.query('UPDATE users SET games_played = games_played + 1 WHERE id = $1', [player.userId]);
              // Победителю +1 победа
              if (player.id === winner.id) {
                await pool.query('UPDATE users SET wins = wins + 1 WHERE id = $1', [player.userId]);
              }
            } catch (err) {
              console.error('Ошибка при обновлении статистики:', err);
            }
          }
        });
        // -------------------------------

        io.to(room.code).emit('game:finished', { winner: winner.name });
      }
      
      io.to(room.code).emit('room:update', room);
    });

    // 8. ОТКЛЮЧЕНИЕ
    socket.on('disconnect', () => {
      const code = socket.data.room;
      if (!code) return;
      const room = rooms.get(code);
      if (!room) return;
      
      room.players = room.players.filter(p => p.id !== socket.id);
      if (room.players.length === 0) {
        rooms.delete(code);
      } else {
        // Если вышел тот, чей сейчас ход, передаем ход следующему
        if (room.current >= room.players.length) {
          room.current = 0;
        }
        io.to(room.code).emit('room:update', room);
      }
    });
  });
}

module.exports = { attachSocket };