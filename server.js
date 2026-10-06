const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Data persistence directory
const DATA_DIR = path.join(__dirname, 'data');
const ROOMS_DIR = path.join(DATA_DIR, 'rooms');
if (!fs.existsSync(ROOMS_DIR)) {
  fs.mkdirSync(ROOMS_DIR, { recursive: true });
}

function getRoomFile(roomId, type) {
  const safeId = (roomId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(ROOMS_DIR, `${safeId}_${type}.json`);
}

function loadData(filePath, defaultData) {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Veri okuma hatasi:', err);
  }
  return defaultData;
}

function saveData(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Veri kaydetme hatasi:', err);
  }
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Request handling error:', err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 1e7, // 10MB
  });

  // Track room counts
  const roomUsers = new Map();

  io.on('connection', (socket) => {
    let currentRoom = 'default';

    socket.on('join:room', (roomId) => {
      const safeRoomId = roomId || 'default';
      socket.leave(currentRoom);

      // Decrement old room
      if (roomUsers.has(currentRoom)) {
        const count = Math.max(0, (roomUsers.get(currentRoom) || 1) - 1);
        roomUsers.set(currentRoom, count);
        io.to(currentRoom).emit('presence:update', { count });
      }

      currentRoom = safeRoomId;
      socket.join(currentRoom);

      const count = (roomUsers.get(currentRoom) || 0) + 1;
      roomUsers.set(currentRoom, count);
      io.to(currentRoom).emit('presence:update', { count });

      // Send initial data for this shared room
      const notesFile = getRoomFile(currentRoom, 'notes');
      const foldersFile = getRoomFile(currentRoom, 'folders');
      const notes = loadData(notesFile, []);
      const folders = loadData(foldersFile, []);
      socket.emit('sync:response', { notes, folders, roomId: currentRoom });
      console.log(`[Socket] Kullanıcı "${currentRoom}" odasına katıldı. Aktif kullanıcı: ${count}`);
    });

    // Note actions within the room
    socket.on('note:create', ({ note, roomId }) => {
      const targetRoom = roomId || currentRoom;
      const notesFile = getRoomFile(targetRoom, 'notes');
      let notes = loadData(notesFile, []);
      notes = [note, ...notes.filter((n) => n.id !== note.id)];
      saveData(notesFile, notes);
      socket.to(targetRoom).emit('note:created', note);
    });

    socket.on('note:update', ({ note, roomId }) => {
      const targetRoom = roomId || currentRoom;
      const notesFile = getRoomFile(targetRoom, 'notes');
      let notes = loadData(notesFile, []);
      const index = notes.findIndex((n) => n.id === note.id);
      if (index !== -1) {
        notes[index] = note;
      } else {
        notes.unshift(note);
      }
      saveData(notesFile, notes);
      socket.to(targetRoom).emit('note:updated', note);
    });

    socket.on('note:delete', ({ noteId, roomId }) => {
      const targetRoom = roomId || currentRoom;
      const notesFile = getRoomFile(targetRoom, 'notes');
      let notes = loadData(notesFile, []);
      notes = notes.filter((n) => n.id !== noteId);
      saveData(notesFile, notes);
      socket.to(targetRoom).emit('note:deleted', noteId);
    });

    socket.on('notes:reorder', ({ newNotes, roomId }) => {
      const targetRoom = roomId || currentRoom;
      const notesFile = getRoomFile(targetRoom, 'notes');
      saveData(notesFile, newNotes);
      socket.to(targetRoom).emit('notes:reordered', newNotes);
    });

    socket.on('folder:save', ({ folder, roomId }) => {
      const targetRoom = roomId || currentRoom;
      const foldersFile = getRoomFile(targetRoom, 'folders');
      let folders = loadData(foldersFile, []);
      const idx = folders.findIndex((f) => f.id === folder.id);
      if (idx !== -1) {
        folders[idx] = folder;
      } else {
        folders.push(folder);
      }
      saveData(foldersFile, folders);
      socket.to(targetRoom).emit('folder:saved', folder);
    });

    socket.on('folder:delete', ({ folderId, roomId }) => {
      const targetRoom = roomId || currentRoom;
      const foldersFile = getRoomFile(targetRoom, 'folders');
      let folders = loadData(foldersFile, []);
      folders = folders.filter((f) => f.id !== folderId);
      saveData(foldersFile, folders);
      socket.to(targetRoom).emit('folder:deleted', folderId);
    });

    socket.on('disconnect', () => {
      if (roomUsers.has(currentRoom)) {
        const count = Math.max(0, (roomUsers.get(currentRoom) || 1) - 1);
        roomUsers.set(currentRoom, count);
        io.to(currentRoom).emit('presence:update', { count });
      }
      console.log(`[Socket] İstemci ayrıldı.`);
    });
  });

  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`> YuPPi Notes Server çalışıyor: http://localhost:${port}`);
    console.log(`> Yerel ağ (Mobil erişim için): http://${getIPAddress()}:${port}`);
  });
});

function getIPAddress() {
  const interfaces = require('os').networkInterfaces();
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (let i = 0; i < iface.length; i++) {
      const alias = iface[i];
      if (alias.family === 'IPv4' && alias.address !== '127.0.0.1' && !alias.internal) {
        return alias.address;
      }
    }
  }
  return 'localhost';
}
