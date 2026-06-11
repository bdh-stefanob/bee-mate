const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

const isDev = process.env.NODE_ENV !== 'production';
const PORT = 3000;

let mainWindow = null;
let nextProcess = null;

// --- Workspace path persistence ---

const settingsPath = path.join(app.getPath('userData'), 'bdd-settings.json');

function loadWorkspacePath() {
  try {
    if (fs.existsSync(settingsPath)) {
      const s = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      if (s.workspacePath && fs.existsSync(path.join(s.workspacePath, 'step-catalog.json'))) {
        return s.workspacePath;
      }
    }
  } catch {}
  return null;
}

function saveWorkspacePath(p) {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify({ workspacePath: p }, null, 2));
}

async function pickWorkspace() {
  const result = await dialog.showOpenDialog({
    title: 'Seleziona la cartella del progetto BDD',
    message: 'Scegli la cartella radice del repository (deve contenere step-catalog.json)',
    properties: ['openDirectory'],
  });
  if (result.canceled || !result.filePaths.length) return null;
  const chosen = result.filePaths[0];
  if (!fs.existsSync(path.join(chosen, 'step-catalog.json'))) {
    await dialog.showMessageBox({
      type: 'warning',
      title: 'Cartella non valida',
      message: `La cartella selezionata non contiene step-catalog.json.\nSeleziona la cartella radice del repository BDD.`,
    });
    return pickWorkspace();
  }
  return chosen;
}

async function resolveWorkspace() {
  if (isDev) {
    // In dev the repo root is two levels up from electron/
    return path.join(__dirname, '../..');
  }
  const saved = loadWorkspacePath();
  if (saved) return saved;

  const chosen = await pickWorkspace();
  if (!chosen) {
    // User cancelled — quit
    app.quit();
    return null;
  }
  saveWorkspacePath(chosen);
  return chosen;
}

// --- Next.js server ---

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

function startNextServer(workspacePath) {
  if (isDev) return Promise.resolve();

  // monorepo: Next.js standalone mirrors the subfolder structure → web-ui/server.js
  const serverScript = path.join(__dirname, '../.next/standalone/web-ui/server.js');
  nextProcess = spawn(process.execPath, [serverScript], {
    env: {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: '127.0.0.1',
      BDD_WORKSPACE: workspacePath,
    },
    stdio: 'pipe',
  });

  nextProcess.stderr.on('data', (d) => console.error('[next]', d.toString()));

  return waitForServer();
}

// --- Window ---

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    title: 'BDD Catalog',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, '../public/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

// --- App lifecycle ---

app.whenReady().then(async () => {
  const workspacePath = await resolveWorkspace();
  if (!workspacePath) return;

  await startNextServer(workspacePath);
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
