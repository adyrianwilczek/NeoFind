const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("neoBrowser", {
  createTab: (url) => ipcRenderer.invoke("tabs:create", url),
  switchTab: (id) => ipcRenderer.send("tabs:switch", id),
  closeTab: (id) => ipcRenderer.send("tabs:close", id),
  navigate: (url) => ipcRenderer.send("tabs:navigate", url),
  back: () => ipcRenderer.send("browser:back"),
  forward: () => ipcRenderer.send("browser:forward"),
  reload: () => ipcRenderer.send("browser:reload"),
  home: () => ipcRenderer.send("browser:home"),
  setBounds: (bounds) => ipcRenderer.send("browser:set-bounds", bounds),
  openDefaultApps: () => ipcRenderer.invoke("browser:open-default-apps"),
  chooseBookmarksFile: () => ipcRenderer.invoke("import:choose-bookmarks"),
  onTabsState: (callback) => {
    ipcRenderer.removeAllListeners("tabs:state");
    ipcRenderer.on("tabs:state", (_event, state) => callback(state));
  }
});
