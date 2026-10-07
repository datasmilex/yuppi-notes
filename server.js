// `--prod` bayrağı Windows'ta da çalışır (NODE_ENV=production sözdizimi PowerShell/cmd'de çalışmaz).
if (process.argv.includes('--prod')) process.env.NODE_ENV = 'production';

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');
const os = require('os');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port, dir: __dirname });
const handle = app.getRequestHandler();

// Paketlenmiş (asar) uygulamada __dirname salt okunurdur; Electron veri klasörünü YUPPI_DATA_DIR ile verir.
const DATA_DIR = process.env.YUPPI_DATA_DIR || path.join(__dirname, 'data');
const ROOMS_DIR = path.join(DATA_DIR, 'rooms');
fs.mkdirSync(ROOMS_DIR, { recursive: true });

const MAX_NOTES_PER_ROOM = 2000;

// ---------- Oda deposu (bellek önbelleği + gecikmeli, atomik disk yazımı) ----------

function normalizeRoom(roomId) {
  return String(roomId || 'default').trim().slice(0, 64) || 'default';
}

// ASCII dışı karakterler de ayrı dosya/oda anahtarı üretir (çakışma olmaz)
function roomKey(roomId) {
  return normalizeRoom(roomId).replace(/[^a-zA-Z0-9_-]/g, (c) => '~' + c.codePointAt(0).toString(16));
}

function roomFile(key, type) {
  return path.join(ROOMS_DIR, `${key}_${type}.json`);
}

function loadJson(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (err) {
    console.error('Veri okuma hatası:', filePath, err.message);
  }
  return fallback;
}

function writeJsonAtomic(filePath, data) {
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data), 'utf-8');
  fs.renameSync(tmp, filePath);
}

const rooms = new Map();

function getRoom(key) {
  let room = rooms.get(key);
  if (!room) {
    const notes = loadJson(roomFile(key, 'notes'), []);
    room = {
      key,
      notes: Array.isArray(notes) ? notes : [],
      // null: oda henüz hiç klasör kaydetmedi (istemci varsayılanları tohumlar)
      folders: loadJson(roomFile(key, 'folders'), null),
      dirty: false,
      timer: null,
    };
    rooms.set(key, room);
  }
  return room;
}

function flushRoom(room) {
  if (room.timer) {
    clearTimeout(room.timer);
    room.timer = null;
  }
  if (!room.dirty) return;
  room.dirty = false;
  try {
    writeJsonAtomic(roomFile(room.key, 'notes'), room.notes);
    if (room.folders) writeJsonAtomic(roomFile(room.key, 'folders'), room.folders);
  } catch (err) {
    room.dirty = true;
    console.error('Veri kaydetme hatası:', err.message);
  }
}

function scheduleSave(room) {
  room.dirty = true;
  if (!room.timer) room.timer = setTimeout(() => flushRoom(room), 400);
}

function flushAll() {
  rooms.forEach(flushRoom);
}

process.on('exit', flushAll);
['SIGINT', 'SIGTERM'].forEach((sig) =>
  process.on(sig, () => {
    flushAll();
    process.exit(0);
  })
);

function getIPAddress() {
  const interfaces = os.networkInterfaces();
  for (const devName in interfaces) {
    for (const alias of interfaces[devName] || []) {
      if (alias.family === 'IPv4' && !alias.internal) return alias.address;
    }
  }
  return 'localhost';
}

const isNote = (n) => n && typeof n === 'object' && typeof n.id === 'string' && n.id.length > 0;
const isFolder = (f) => f && typeof f === 'object' && typeof f.id === 'string' && f.id.length > 0;

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);

      if (parsedUrl.pathname === '/__yuppi/info') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify({ lanUrl: `http://${getIPAddress()}:${port}` }));
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Request handling error:', err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`> ${port} portu zaten kullanımda. Farklı bir port için: PORT=3001 npm run dev`);
    } else {
      console.error(err);
    }
    process.exit(1);
  });

  const io = new Server(server, {
    maxHttpBufferSize: 1e7, // 10MB (görseller)
    // Başka bir sitenin, tarayıcıdan yerel sunucuya WebSocket ile bağlanıp notları okumasını engelle
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      if (!origin) return callback(null, true);
      try {
        callback(null, new URL(origin).host === req.headers.host);
      } catch {
        callback(null, false);
      }
    },
  });

  const roomCount = (key) => io.sockets.adapter.rooms.get(key)?.size || 0;

  io.on('connection', (socket) => {
    socket.data.room = null;
    socket.data.roomRaw = null;

    const resolve = (roomId) => (roomId ? roomKey(roomId) : socket.data.room);

    const guard = (handler) => (payload) => {
      try {
        if (payload && typeof payload === 'object') handler(payload);
      } catch (err) {
        console.error('[Socket] İşlem hatası:', err.message);
      }
    };

    socket.on('join:room', (roomId) => {
      const raw = normalizeRoom(roomId);
      const key = roomKey(raw);
      const previous = socket.data.room;

      if (previous && previous !== key) {
        socket.leave(previous);
        io.to(previous).emit('presence:update', { count: roomCount(previous) });
      }

      socket.data.room = key;
      socket.data.roomRaw = raw;
      socket.join(key);
      io.to(key).emit('presence:update', { count: roomCount(key) });

      const room = getRoom(key);
      socket.emit('sync:response', { notes: room.notes, folders: room.folders, roomId: raw });
      console.log(`[Socket] "${raw}" odasına katılım. Aktif kullanıcı: ${roomCount(key)}`);
    });

    socket.on(
      'note:create',
      guard(({ note, roomId }) => {
        const key = resolve(roomId);
        if (!key || !isNote(note)) return;
        const room = getRoom(key);
        room.notes = [note, ...room.notes.filter((n) => n.id !== note.id)].slice(0, MAX_NOTES_PER_ROOM);
        scheduleSave(room);
        socket.to(key).emit('note:created', note);
      })
    );

    socket.on(
      'note:update',
      guard(({ note, roomId }) => {
        const key = resolve(roomId);
        if (!key || !isNote(note)) return;
        const room = getRoom(key);
        const idx = room.notes.findIndex((n) => n.id === note.id);
        if (idx !== -1) room.notes[idx] = note;
        else room.notes.unshift(note);
        scheduleSave(room);
        socket.to(key).emit('note:updated', note);
      })
    );

    socket.on(
      'note:delete',
      guard(({ noteId, roomId }) => {
        const key = resolve(roomId);
        if (!key || typeof noteId !== 'string') return;
        const room = getRoom(key);
        room.notes = room.notes.filter((n) => n.id !== noteId);
        scheduleSave(room);
        socket.to(key).emit('note:deleted', noteId);
      })
    );

    socket.on(
      'notes:reorder',
      guard(({ order, roomId }) => {
        const key = resolve(roomId);
        if (!key || !Array.isArray(order)) return;
        const room = getRoom(key);
        const rank = new Map(order.map((id, i) => [id, i]));
        room.notes.sort(
          (a, b) => (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER)
        );
        scheduleSave(room);
        socket.to(key).emit('notes:reordered', order);
      })
    );

    socket.on(
      'folder:save',
      guard(({ folder, roomId }) => {
        const key = resolve(roomId);
        if (!key || !isFolder(folder)) return;
        const room = getRoom(key);
        const folders = room.folders || [];
        const idx = folders.findIndex((f) => f.id === folder.id);
        if (idx !== -1) folders[idx] = folder;
        else folders.push(folder);
        room.folders = folders;
        scheduleSave(room);
        socket.to(key).emit('folder:saved', folder);
      })
    );

    socket.on(
      'folder:delete',
      guard(({ folderId, roomId }) => {
        const key = resolve(roomId);
        if (!key || typeof folderId !== 'string') return;
        const room = getRoom(key);
        room.folders = (room.folders || []).filter((f) => f.id !== folderId);
        room.notes = room.notes.map((n) => (n.folderId === folderId ? { ...n, folderId: 'all_shared' } : n));
        scheduleSave(room);
        socket.to(key).emit('folder:deleted', folderId);
      })
    );

    socket.on('disconnecting', () => {
      for (const key of socket.rooms) {
        if (key !== socket.id) io.to(key).emit('presence:update', { count: Math.max(0, roomCount(key) - 1) });
      }
    });
  });

  server.listen(port, hostname, () => {
    console.log(`> YuPPi Notes Sunucusu çalışıyor: http://localhost:${port}`);
    console.log(`> Yerel ağ (telefon/tablet için): http://${getIPAddress()}:${port}`);
    console.log(`> Veri klasörü: ${DATA_DIR}`);
  });
});
