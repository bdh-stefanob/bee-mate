const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

const isDev = process.env.NODE_ENV !== 'production';
const PORT = 3000;

let mainWindow = null;
let nextProcess = null;

function waitForServer(timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      http.get(`http://127.0.0.1:${PORT}`, () => resolve())
        .on('error', () => {
          if (Date.now() - start > timeout) reject(new Error('Next.js server timeout'));
          else setTimeout(check, 500);
        });
    };
    check();
  });
}

function startNextServer() {
  if (isDev) return Promise.resolve();

  // monorepo: Next.js standalone mirrors the subfolder structure → web-ui/server.js
  const serverScript = path.join(__dirname, '../.next/standalone/web-ui/server.js');
  nextProcess = spawn(process.execPath, [serverScript], {
    env: { ...process.env, PORT: String(PORT), HOSTNAME: '127.0.0.1' },
    stdio: 'pipe',
  });

  nextProcess.stderr.on('data', (d) => console.error('[next]', d.toString()));

  return waitForServer();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: 'BDD Catalog',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

app.whenReady().then(async () => {
  await startNextServer();
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (nextProcess) nextProcess.kill();
});
