/**
 * Vision Agent Desktop — Main Process (Electron)
 * Tray icon, BrowserWindow, IPC handlers, SSE live logs
 *
 * BUILD:
 *   npm install
 *   npm run build:win    → dist/VisionAgentSetup.exe
 *   npm run build:mac    → dist/Vision Agent.dmg
 *   npm run build:linux  → dist/Vision Agent.AppImage
 */
'use strict';

const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell, Notification } = require('electron');
const path  = require('path');
const https = require('https');
const http  = require('http');
const fs    = require('fs');

// ── Config ────────────────────────────────────────────────────────
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');
let config = {
  apiUrl:  'https://visioncore-api-gateway.weiganlight.workers.dev',
  token:   '',
  project: '',
};
function loadConfig() {
  try { if (fs.existsSync(CONFIG_PATH)) config = { ...config, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) }; }
  catch(e) { console.warn('[Config] load error:', e.message); }
}
function saveConfig() { fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2)); }

// ── Windows ───────────────────────────────────────────────────────
let mainWindow   = null;
let tray         = null;
let sseRequest   = null; // active SSE connection

function createMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) { mainWindow.show(); mainWindow.focus(); return; }

  mainWindow = new BrowserWindow({
    width:  920,
    height: 680,
    minWidth: 700,
    minHeight: 500,
    show: false,
    backgroundColor: '#06060f',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('close', (e) => {
    // Minimize to tray instead of closing
    e.preventDefault();
    mainWindow.hide();
  });
}

// ── Tray ──────────────────────────────────────────────────────────
function createTray() {
  // V4.3.1: tray icon real. Prefer tray-icon.png, fallback to icon.png.
  const preferredIcon = path.join(__dirname, '..', 'assets', 'tray-icon.png');
  const fallbackIcon  = path.join(__dirname, '..', 'assets', 'icon.png');
  const iconPath = fs.existsSync(preferredIcon) ? preferredIcon : fallbackIcon;
  const icon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : nativeImage.createEmpty();
  if (!fs.existsSync(iconPath)) console.warn('[Tray] icon asset not found; tray will use empty icon');

  tray = new Tray(icon);
  tray.setToolTip('Vision Agent');

  updateTrayMenu('IDLE');

  tray.on('click', () => {
    if (mainWindow) { mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show(); }
    else createMainWindow();
  });
}

function updateTrayMenu(status) {
  if (!tray) return;
  const menu = Menu.buildFromTemplate([
    { label: 'Vision Agent Desktop', enabled: false },
    { label: `Status: ${status}`, enabled: false },
    { type: 'separator' },
    { label: 'Abrir painel',     click: () => { createMainWindow(); mainWindow.show(); } },
    { label: 'Abrir no browser', click: () => shell.openExternal(config.apiUrl.replace('api-gateway','')) },
    { type: 'separator' },
    { label: 'Configurações',    click: () => { createMainWindow(); mainWindow.webContents.send('navigate', 'settings'); } },
    { type: 'separator' },
    { label: 'Sair',             click: () => { sseRequest?.destroy?.(); app.quit(); } },
  ]);
  tray.setContextMenu(menu);
  tray.setToolTip('Vision Agent — ' + status);
}

// ── SSE Live Logs ─────────────────────────────────────────────────
function startSSE(missionText) {
  stopSSE();

  const apiUrlFull = config.apiUrl + '/api/run-live-stream?mission=' + encodeURIComponent(missionText);
  const parsed = new URL(apiUrlFull);
  const requestLib = parsed.protocol === 'https:' ? https : http;

  updateTrayMenu('RUNNING');

  sseRequest = requestLib.get({
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path: parsed.pathname + parsed.search,
    headers: {
      'Authorization': config.token ? 'Bearer ' + config.token : '',
      'Accept': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  }, (res) => {
    let buffer = '';
    res.on('data', (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();
      lines.forEach(line => {
        if (line.startsWith('event:')) {
          // Next data line will have the event data
        } else if (line.startsWith('data:')) {
          const data = line.slice(5).trim();
          if (!mainWindow?.isDestroyed()) {
            mainWindow?.webContents.send('sse-event', { data });
          }
        }
      });
    });
    res.on('end', () => {
      stopSSE();
      updateTrayMenu('IDLE');
      if (!mainWindow?.isDestroyed()) mainWindow?.webContents.send('mission-done', {});
    });
    res.on('error', (e) => { console.error('[SSE]', e.message); stopSSE(); });
  });

  sseRequest.on('error', (e) => {
    console.error('[SSE request]', e.message);
    stopSSE();
    updateTrayMenu('ERROR');
  });
}

function stopSSE() {
  if (sseRequest) { try { sseRequest.destroy(); } catch(e) {} sseRequest = null; }
}

// ── IPC Handlers ──────────────────────────────────────────────────
ipcMain.handle('get-config', () => config);

ipcMain.handle('save-config', (_, newConfig) => {
  config = { ...config, ...newConfig };
  saveConfig();
  return { ok: true };
});

ipcMain.handle('start-mission', async (_, mission) => {
  try {
    // POST /api/run-live
    const body = JSON.stringify({ mission, mode: 'dry-run', project_id: config.project });
    const parsed = new URL(config.apiUrl + '/api/run-live');
    const requestLib = parsed.protocol === 'https:' ? https : http;

    const missionId = await new Promise((resolve, reject) => {
      const req = requestLib.request({
        hostname: parsed.hostname,
        port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'Authorization': config.token ? 'Bearer ' + config.token : '',
        },
      }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try { resolve(JSON.parse(data).mission_id || null); } catch(e) { resolve(null); }
        });
      });
      req.on('error', reject);
      req.write(body);
      req.end();
    });

    startSSE(mission);
    return { ok: true, mission_id: missionId };
  } catch(e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('stop-mission', () => { stopSSE(); updateTrayMenu('IDLE'); return { ok: true }; });

ipcMain.handle('open-external', (_, url) => shell.openExternal(url));

ipcMain.handle('show-notification', (_, { title, body }) => {
  new Notification({ title: title || 'Vision Agent', body: body || '' }).show();
});

ipcMain.handle('fetch-api', async (_, { path: apiPath, method, body }) => {
  const parsed = new URL(config.apiUrl + apiPath);
  const requestLib = parsed.protocol === 'https:' ? https : http;
  const postData = body ? JSON.stringify(body) : '';

  return new Promise((resolve) => {
    const req = requestLib.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': config.token ? 'Bearer ' + config.token : '',
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ ok: res.statusCode < 400, status: res.statusCode, data: JSON.parse(data) }); }
        catch(e) { resolve({ ok: false, error: e.message }); }
      });
    });
    req.on('error', e => resolve({ ok: false, error: e.message }));
    if (postData) req.write(postData);
    req.end();
  });
});

// ── Update checker ────────────────────────────────────────────────
function checkForUpdates() {
  https.get({
    hostname: 'api.github.com',
    path: '/repos/Imadechumbo/vision-core-master/releases/latest',
    headers: { 'User-Agent': 'VisionAgentDesktop/1.0' },
  }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      try {
        const rel = JSON.parse(data);
        const latest = rel.tag_name?.replace(/^v/, '');
        const current = app.getVersion();
        if (latest && latest !== current) {
          if (!mainWindow?.isDestroyed()) {
            mainWindow?.webContents.send('update-available', { version: latest, url: rel.html_url });
          }
        }
      } catch(e) {}
    });
  }).on('error', () => {});
}

// ── App lifecycle ─────────────────────────────────────────────────
app.whenReady().then(() => {
  loadConfig();
  createMainWindow();
  createTray();

  // Check updates after 3s delay
  setTimeout(checkForUpdates, 3000);
  // Re-check every 6 hours
  setInterval(checkForUpdates, 6 * 60 * 60 * 1000);
});

app.on('window-all-closed', (e) => e.preventDefault()); // keep tray alive

app.on('before-quit', () => {
  stopSSE();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.removeAllListeners('close');
    mainWindow.close();
  }
});

app.on('activate', () => {
  if (!mainWindow || mainWindow.isDestroyed()) createMainWindow();
  else mainWindow.show();
});
