const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const http = require('http');

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;
const PORT = process.env.PORT || 3000;
let mainWindow = null;
let serverProcess = null;

function waitForServer(url, timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      http
        .get(url, (res) => {
          if (res.statusCode === 200 || res.statusCode === 304) {
            resolve();
          } else {
            retry();
          }
        })
        .on('error', () => {
          retry();
        });
    };

    const retry = () => {
      if (Date.now() - start > timeout) {
        reject(new Error('Server timeout'));
      } else {
        setTimeout(check, 500);
      }
    };

    check();
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 780,
    minHeight: 560,
    title: 'YuPPi Notes',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    backgroundColor: '#FAF5FF',
    show: false,
  });

  const url = `http://localhost:${PORT}`;

  if (!isDev) {
    // Paketlenmiş uygulamada gömülü sunucuyu PRODUCTION modunda başlat;
    // veriler salt okunur asar yerine kullanıcı veri klasörüne yazılır.
    process.env.NODE_ENV = 'production';
    process.env.YUPPI_DATA_DIR = path.join(app.getPath('userData'), 'data');
    try {
      require('../server.js');
    } catch (e) {
      console.error('Failed to require server.js:', e);
    }
  }

  try {
    await waitForServer(url, 20000);
    mainWindow.loadURL(url);
  } catch {
    // If waiting timed out, still attempt loading
    mainWindow.loadURL(url);
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Aynı anda tek pencere: ikinci başlatma portu çakıştırmasın, mevcut pencereyi öne getirsin
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.whenReady().then(createWindow);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
