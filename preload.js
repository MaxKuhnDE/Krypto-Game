/* KryptoQuest – Preload: schmale, sichere Brücke zur Oberfläche */
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const info = ipcRenderer.sendSync('kq:info') || {};

contextBridge.exposeInMainWorld('kqNative', {
  isElectron: true,
  platform: info.platform,
  micaSupported: !!info.micaSupported,
  versions: { electron: process.versions.electron, chrome: process.versions.chrome },
  setAppearance: (opts) => ipcRenderer.send('kq:appearance', {
    theme: String(opts && opts.theme),
    dark: !!(opts && opts.dark),
    mica: !!(opts && opts.mica),
  }),
});
