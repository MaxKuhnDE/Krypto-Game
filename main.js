/* KryptoQuest – Electron-Hauptprozess (Windows 11 App) */
'use strict';
const { app, BrowserWindow, ipcMain, nativeTheme, shell, Menu } = require('electron');
const path = require('node:path');
const os = require('node:os');
const { registerUpdater, mode: updateMode } = require('./updater');

const LIGHT = { bg: '#f7f7f5', symbol: '#1b1c1a' };
const DARK = { bg: '#1a1c1b', symbol: '#e3e5e2' };

/** Mica gibt es ab Windows 11 22H2 (Build 22621) */
const micaSupported = () => {
  if (process.platform !== 'win32') return false;
  const build = parseInt(os.release().split('.')[2] || '0', 10);
  return build >= 22621;
};

let win = null;

function createWindow() {
  const dark = nativeTheme.shouldUseDarkColors;
  win = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 880,
    minHeight: 600,
    title: 'KryptoQuest',
    icon: path.join(__dirname, 'build', 'icon.png'),
    backgroundColor: dark ? DARK.bg : LIGHT.bg,
    show: false,
    // Eigene Titelleiste mit nativen Windows-11-Fensterknöpfen (Snap-Layouts bleiben erhalten)
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: dark ? DARK.bg : LIGHT.bg, symbolColor: dark ? DARK.symbol : LIGHT.symbol, height: 40 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.once('ready-to-show', () => win.show());

  // Keine Navigation weg von der App; externe Links im Standardbrowser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) e.preventDefault();
  });
  win.on('closed', () => { win = null; });
}

ipcMain.on('kq:info', (e) => {
  e.returnValue = { micaSupported: micaSupported(), platform: process.platform, version: app.getVersion(), packaged: app.isPackaged, updateMode: updateMode() };
});
registerUpdater();

ipcMain.on('kq:appearance', (e, opts) => {
  if (!win || !opts) return;
  const theme = ['system', 'light', 'dark'].includes(opts.theme) ? opts.theme : 'system';
  nativeTheme.themeSource = theme;
  const dark = theme === 'dark' || (theme === 'system' && nativeTheme.shouldUseDarkColors);
  const c = dark ? DARK : LIGHT;
  const mica = !!opts.mica && micaSupported();
  try {
    if (typeof win.setBackgroundMaterial === 'function') win.setBackgroundMaterial(mica ? 'mica' : 'none');
    win.setBackgroundColor(mica ? '#00000000' : c.bg);
    win.setTitleBarOverlay({ color: mica ? '#00000000' : c.bg, symbolColor: c.symbol, height: 40 });
  } catch (err) {
    console.error('Darstellung konnte nicht angepasst werden:', err);
  }
});

// Nur eine Instanz
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => app.quit());
}
