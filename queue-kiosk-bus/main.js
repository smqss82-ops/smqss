const { app, BrowserWindow, powerSaveBlocker } = require('electron');
const path = require('path');

const DISPLAY_URL = process.env.KIOSK_BUS_URL
  || 'https://web-production-6fcc0.up.railway.app/bus-display';
const RETRY_INTERVAL = 3000;
const MAX_RETRIES = 30;

let mainWindow = null;
let retryCount = 0;

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  callback(true);
});

app.whenReady().then(() => {
  powerSaveBlocker.start('prevent-display-sleep');
  createWindow();
});

function createWindow() {
  const { width, height } = require('screen').getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width, height, x: 0, y: 0,
    fullscreen: true, frame: false, resizable: false,
    skipTaskbar: true, alwaysOnTop: true,
    backgroundColor: '#070d09',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      autoplayPolicy: 'no-user-gesture-required',
      nodeIntegration: false, contextIsolation: true,
      backgroundThrottling: false,
    },
  });

  mainWindow.webContents.on('dom-ready', () => {
    mainWindow.webContents.insertCSS('html,body{cursor:none!important}*{cursor:none!important}');
  });

  loadWithRetry();
  mainWindow.on('closed', () => { mainWindow = null; });
}

function loadWithRetry() {
  if (!mainWindow) return;
  mainWindow.loadURL(DISPLAY_URL).catch(() => {
    retryCount++;
    if (retryCount >= MAX_RETRIES) {
      if (mainWindow) mainWindow.reload();
      retryCount = 0;
      return;
    }
    setTimeout(loadWithRetry, RETRY_INTERVAL);
  });
}

app.on('window-all-closed', () => { app.quit(); });
