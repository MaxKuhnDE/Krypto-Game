/* KryptoQuest – Preload: schmale, sichere Brücke zur Oberfläche */
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

const info = ipcRenderer.sendSync('kq:info') || {};

contextBridge.exposeInMainWorld('kqNative', {
  isElectron: true,
  platform: info.platform,
  micaSupported: !!info.micaSupported,
  versions: { electron: process.versions.electron, chrome: process.versions.chrome },
  version: info.version,
  packaged: !!info.packaged,
  updateMode: info.updateMode,
  updateCheck: () => ipcRenderer.invoke('update:check'),
  updateInstall: () => ipcRenderer.invoke('update:install'),
  updateLastResult: () => ipcRenderer.invoke('update:lastResult'),
  onUpdateProgress: (cb) => {
    const listener = (_e, p) => cb(p);
    ipcRenderer.on('update:progress', listener);
    return () => ipcRenderer.removeListener('update:progress', listener);
  },
  setAppearance: (opts) => ipcRenderer.send('kq:appearance', {
    theme: String(opts && opts.theme),
    dark: !!(opts && opts.dark),
    mica: !!(opts && opts.mica),
  }),
});
