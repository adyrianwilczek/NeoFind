const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("neoBrowser", {
  createTab: (url) => ipcRenderer.invoke("tabs:create", url),
  switchTab: (id) => ipcRenderer.send("tabs:switch", id),
  closeTab: (id) => ipcRenderer.send("tabs:close", id),
  reorderTabs: (fromId, toId) => ipcRenderer.send("tabs:reorder", fromId, toId),
  navigate: (url) => ipcRenderer.send("tabs:navigate", url),
  back: () => ipcRenderer.send("browser:back"),
  forward: () => ipcRenderer.send("browser:forward"),
  reload: () => ipcRenderer.send("browser:reload"),
  home: () => ipcRenderer.send("browser:home"),
  setBounds: (bounds) => ipcRenderer.send("browser:set-bounds", bounds),
  openDefaultApps: () => ipcRenderer.invoke("browser:open-default-apps"),
  chooseBookmarksFile: () => ipcRenderer.invoke("import:choose-bookmarks"),
  chooseOperaProfile: () => ipcRenderer.invoke("import:choose-opera-profile"),
  importOperaProfile: (profilePath, selected) => ipcRenderer.invoke("import:opera-profile", profilePath, selected),
  checkForUpdates: () => ipcRenderer.invoke("updater:check"),
  getVersion: () => ipcRenderer.invoke("updater:version"),
  onUpdaterState: (callback) => {
    ipcRenderer.removeAllListeners("updater:state");
    ipcRenderer.on("updater:state", (_event, state) => callback(state));
  },
  onTabsState: (callback) => {
    ipcRenderer.removeAllListeners("tabs:state");
    ipcRenderer.on("tabs:state", (_event, state) => callback(state));
  }
});
