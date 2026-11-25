const { db } = require('./db');

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
    
    socket.on('room:create', (opts, cb) => {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      rooms.set(code, {
        code, status: 'waiting', host: socket.id, turn: 0, current: 0,
        settings: opts,
        players: [{ id: socket.id, name: opts.name, money: opts.startMoney, pos: 0, ready: false, char: null }],
        props: {} // купленные клетки {cellIndex: {owner: socketId}}
      });
      socket.join(code);
      socket.data.room = code;
      cb({ success: true, code });
      io.to(code).emit('room:update', rooms.get(code));
    });

    socket.on('room:join', ({ code, name }, cb) => {
      const room = rooms.get(code);
      if (!room) return cb({ success: false, message: 'Комната не найдена' });
      if (room.status !== 'waiting') return cb({ success: false, message: 'Игра уже идет' });
      
      room.players.push({ id: socket.id, name, money: room.settings.startMoney, pos: 0, ready: false, char: null });
      socket.join(code);
      socket.data.room = code;
      cb({ success: true });
      io.to(code).emit('room:update', room);
    });

    socket.on('player:character', (char) => {
      const room = rooms.get(socket.data.room);
      if (!room) return;
      const p = room.players.find(x => x.id === socket.id);
      if (p && !p.ready) p.char = char;
      io.to(room.code).emit('room:update', room);
    });

    socket.on('player:ready', (ready) => {
      const room = rooms.get(socket.data.room);
      if (!room) return;
      const p = room.players.find(x => x.id === socket.id);
      if (p) p.ready = ready;
      
      io.to(room.code).emit('room:update', room);
      if (room.players.length >= 2 && room.players.every(x => x.ready)) {
        room.status = 'playing';
        io.to(room.code).emit('game:started');
        io.to(room.code).emit('room:update', room);
      }
    });

    socket.on('game:roll', () => {
      const room = rooms.get(socket.data.room);
      if (!room || room.status !== 'playing') return;
      if (room.players[room.current].id !== socket.id) return;

      const d1 = Math.floor(Math.random()*6)+1;
      const d2 = Math.floor(Math.random()*6)+1;
      
      io.to(room.code).emit('game:dice', { first: d1, second: d2 });

      setTimeout(() => {
        const p = room.players[room.current];
        p.pos = (p.pos + d1 + d2) % BOARD.length;
        
        const cell = BOARD[p.pos];
        const prop = room.props[p.pos];
        let action = null;

        if (cell[1] === 'start') { p.money += 200; action = 'start'; }
        else if (cell[1] === 'territory') {
          if (!prop) { action = 'buy'; }
          else if (prop.owner !== p.id) {
            const rent = Math.round(cell[2] * 0.2);
            p.money -= rent;
            const owner = room.players.find(x => x.id === prop.owner);
            if (owner) owner.money += rent;
            action = 'rent';
          }
        }

        io.to(room.code).emit('game:landed', { cell, pos: p.pos, action, price: cell[2] });
        io.to(room.code).emit('room:update', room);
      }, 1000); // Задержка, чтобы кубики покрутились
    });

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

    socket.on('game:end-turn', () => {
      const room = rooms.get(socket.data.room);
      if (!room || room.status !== 'playing') return;
      if (room.players[room.current].id !== socket.id) return;

      room.current = (room.current + 1) % room.players.length;
      if (room.current === 0) room.turn++;
      
      if (room.turn >= room.settings.maxTurns) {
        room.status = 'finished';
        const winner = [...room.players].sort((a,b) => b.money - a.money)[0];
        db.prepare('INSERT INTO games (room_code, players_json) VALUES (?, ?)').run(room.code, JSON.stringify(room.players));
        io.to(room.code).emit('game:finished', { winner: winner.name });
      }
      
      io.to(room.code).emit('room:update', room);
    });

    socket.on('disconnect', () => {
      const code = socket.data.room;
      if (!code) return;
      const room = rooms.get(code);
      if (!room) return;
      
      room.players = room.players.filter(p => p.id !== socket.id);
      if (room.players.length === 0) rooms.delete(code);
      else io.to(room.code).emit('room:update', room);
    });
  });
}

module.exports = { attachSocket };