const { contextBridge, ipcRenderer } = require('electron');

// Git sync operations will be exposed here in the 999.3 phase
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
});
