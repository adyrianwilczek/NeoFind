const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("neoBrowser", {
  createTab: (url) => ipcRenderer.invoke("tabs:create", url),
  openNeoAI: () => ipcRenderer.invoke("sidebar:open-neoai"),
  switchTab: (id) => ipcRenderer.send("tabs:switch", id),
  closeTab: (id) => ipcRenderer.send("tabs:close", id),
  reorderTabs: (fromId, toId) => ipcRenderer.send("tabs:reorder", fromId, toId),
  navigate: (url) => ipcRenderer.send("tabs:navigate", url),
  back: () => ipcRenderer.send("browser:back"),
  forward: () => ipcRenderer.send("browser:forward"),
  reload: () => ipcRenderer.send("browser:reload"),
  home: () => ipcRenderer.send("browser:home"),
  setBounds: (bounds) => ipcRenderer.send("browser:set-bounds", bounds),
  hideContent: () => ipcRenderer.send("browser:hide-content"),
  showContent: () => ipcRenderer.send("browser:show-content"),
  openDefaultApps: () => ipcRenderer.invoke("browser:open-default-apps"),
  chooseBookmarksFile: () => ipcRenderer.invoke("import:choose-bookmarks"),
  chooseSourceProfile: (sourceBrowser) => ipcRenderer.invoke("import:choose-source-profile", sourceBrowser),
  importSourceProfile: (sourceBrowser, profilePath, selected) => ipcRenderer.invoke("import:source-profile", sourceBrowser, profilePath, selected),
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
