const { app, BrowserWindow, WebContentsView, ipcMain, dialog, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const fs = require("node:fs/promises");
const path = require("node:path");

const HOME_URL = "https://neofind.pl/";
let mainWindow;
let nextTabId = 1;
let activeTabId = null;
function isHttpUrl(value) { return typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://")); }
let pendingExternalUrl = process.argv.find(isHttpUrl) || null;
const tabs = new Map();
let viewportBounds = { x: 0, y: 92, width: 1100, height: 650 };

function normalizeAddress(input) {
  const value = String(input || "").trim();
  if (!value || /^about:(blank|home)$/i.test(value)) return HOME_URL;

  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)) {
    try {
      const url = new URL(value);
      if (url.protocol === "http:" || url.protocol === "https:") return url.href;
    } catch {}
    return "https://www.google.com/search?q=" + encodeURIComponent(value);
  }

  if (value.includes(" ") || !value.includes(".")) {
    return "https://www.google.com/search?q=" + encodeURIComponent(value);
  }
  return "https://" + value;
}

function sendState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const list = Array.from(tabs.values()).map((tab) => ({
    id: tab.id,
    title: tab.title || "New Tab",
    url: tab.url || "",
    loading: tab.loading,
    canGoBack: tab.view.webContents.navigationHistory.canGoBack(),
    canGoForward: tab.view.webContents.navigationHistory.canGoForward()
  }));
  mainWindow.webContents.send("tabs:state", { tabs: list, activeTabId });
}

function updateActiveBounds() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const active = tabs.get(activeTabId);
  if (!active) return;
  const size = mainWindow.getContentBounds();
  active.view.setBounds({
    x: Math.max(0, Math.round(viewportBounds.x)),
    y: Math.max(0, Math.round(viewportBounds.y)),
    width: Math.max(1, Math.min(Math.round(viewportBounds.width), size.width)),
    height: Math.max(1, Math.min(Math.round(viewportBounds.height), size.height))
  });
}

function showActiveTab() {
  if (!mainWindow) return;
  for (const tab of tabs.values()) {
    try { mainWindow.contentView.removeChildView(tab.view); } catch {}
  }
  const tab = tabs.get(activeTabId);
  if (tab) {
    mainWindow.contentView.addChildView(tab.view);
    updateActiveBounds();
  }
  sendState();
}

function openTab(address = HOME_URL, activate = true) {
  const id = nextTabId++;
  const view = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true
    }
  });
  const tab = { id, view, title: "New Tab", url: "", loading: true };
  tabs.set(id, tab);
  const wc = view.webContents;

  wc.setWindowOpenHandler(({ url }) => {
    openTab(url, true);
    return { action: "deny" };
  });
  wc.on("page-title-updated", (_event, title) => {
    tab.title = title || "New Tab";
    sendState();
  });
  wc.on("did-start-loading", () => {
    tab.loading = true;
    sendState();
  });
  wc.on("did-stop-loading", () => {
    tab.loading = false;
    tab.url = wc.getURL();
    tab.title = wc.getTitle() || tab.title || "New Tab";
    sendState();
  });
  wc.on("did-navigate", (_event, url) => {
    tab.url = url;
    sendState();
  });
  wc.on("did-navigate-in-page", (_event, url) => {
    tab.url = url;
    sendState();
  });
  wc.on("render-process-gone", () => {
    tab.title = "Page crashed";
    tab.loading = false;
    sendState();
  });

  if (activate) {
    activeTabId = id;
    showActiveTab();
  } else {
    sendState();
  }

  wc.loadURL(normalizeAddress(address)).catch(() => {
    tab.loading = false;
    tab.title = "Unable to load page";
    sendState();
  });
  return id;
}

function closeTab(id) {
  const tab = tabs.get(Number(id));
  if (!tab) return;
  try { mainWindow.contentView.removeChildView(tab.view); } catch {}
  try { tab.view.webContents.close(); } catch {}
  tabs.delete(tab.id);

  if (activeTabId === tab.id) {
    const ids = Array.from(tabs.keys());
    activeTabId = ids.length ? ids[ids.length - 1] : null;
    if (activeTabId === null) {
      openTab(HOME_URL, true);
      return;
    }
    showActiveTab();
  } else {
    sendState();
  }
}

function activeContents() {
  return tabs.get(activeTabId)?.view.webContents;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 760,
    minHeight: 520,
    title: "NeoFind Browser",
    backgroundColor: "#080d18",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, "ui.html"));
  mainWindow.webContents.once("did-finish-load", () => {
    const target = pendingExternalUrl || HOME_URL;
    pendingExternalUrl = null;
    openTab(target, true);
  });
  mainWindow.on("resize", updateActiveBounds);
  mainWindow.on("closed", () => {
    mainWindow = null;
    for (const tab of tabs.values()) {
      try { tab.view.webContents.close(); } catch {}
    }
    tabs.clear();
  });
}

ipcMain.handle("tabs:create", (_event, url) => openTab(url || HOME_URL, true));
ipcMain.on("tabs:switch", (_event, id) => {
  if (!tabs.has(Number(id))) return;
  activeTabId = Number(id);
  showActiveTab();
});
ipcMain.on("tabs:close", (_event, id) => closeTab(id));
ipcMain.on("tabs:navigate", (_event, address) => {
  const wc = activeContents();
  if (wc) wc.loadURL(normalizeAddress(address)).catch(() => {});
});
ipcMain.on("browser:back", () => {
  const wc = activeContents();
  if (wc && wc.navigationHistory.canGoBack()) wc.navigationHistory.goBack();
});
ipcMain.on("browser:forward", () => {
  const wc = activeContents();
  if (wc && wc.navigationHistory.canGoForward()) wc.navigationHistory.goForward();
});
ipcMain.on("browser:reload", () => activeContents()?.reload());
ipcMain.on("browser:home", () => activeContents()?.loadURL(HOME_URL));
ipcMain.on("browser:set-bounds", (_event, bounds) => {
  if (!bounds || !["x", "y", "width", "height"].every((key) => Number.isFinite(bounds[key]))) return;
  viewportBounds = bounds;
  updateActiveBounds();
});

ipcMain.handle("browser:open-default-apps", async () => {
  if (process.platform !== "win32") return { ok: false };
  try { await shell.openExternal("ms-settings:defaultapps"); return { ok: true }; }
  catch { return { ok: false }; }
});
ipcMain.handle("import:choose-bookmarks", async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return { canceled: true };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Select exported bookmarks",
    properties: ["openFile"],
    filters: [{ name: "Bookmarks HTML", extensions: ["html", "htm"] }]
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  const content = await fs.readFile(result.filePaths[0], "utf8");
  return { canceled: false, content };
});
function sendUpdaterState(state) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("updater:state", state);
}

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.allowPrerelease = true;
autoUpdater.on("checking-for-update", () => sendUpdaterState({ status: "checking", message: "Checking for updates..." }));
autoUpdater.on("update-available", (info) => sendUpdaterState({ status: "available", version: info.version, message: "Update found. Downloading in the background..." }));
autoUpdater.on("update-not-available", (info) => sendUpdaterState({ status: "current", version: info.version, message: "NeoFind Browser is up to date." }));
autoUpdater.on("download-progress", (progress) => sendUpdaterState({ status: "downloading", percent: Math.round(progress.percent), message: "Downloading update: " + Math.round(progress.percent) + "%" }));
autoUpdater.on("update-downloaded", (info) => {
  sendUpdaterState({ status: "downloaded", version: info.version, message: "Update downloaded. Restart to install it." });
  if (!mainWindow || mainWindow.isDestroyed()) return;
  dialog.showMessageBox(mainWindow, {
    type: "info", title: "NeoFind Browser update ready",
    message: "NeoFind Browser " + info.version + " has been downloaded.",
    detail: "Restart the browser now to install the update. Your browser data should remain in place.",
    buttons: ["Restart and install", "Later"], defaultId: 0, cancelId: 1
  }).then(({ response }) => { if (response === 0) autoUpdater.quitAndInstall(); });
});
autoUpdater.on("error", (error) => sendUpdaterState({ status: "error", message: "Update check failed: " + (error && error.message ? error.message : "unknown error") }));

ipcMain.handle("updater:check", async () => {
  if (!app.isPackaged) return { status: "development", message: "Updates are available in the installed version." };
  try { await autoUpdater.checkForUpdates(); return { status: "checking", message: "Checking GitHub Releases..." }; }
  catch (error) { return { status: "error", message: "Update check failed: " + (error && error.message ? error.message : "unknown error") }; }
});
ipcMain.handle("updater:version", () => app.getVersion());
app.whenReady().then(() => {
  createWindow();
  if (app.isPackaged) setTimeout(() => autoUpdater.checkForUpdates().catch(() => {}), 5000);
});
app.on("second-instance", (_event, commandLine) => {
  const externalUrl = commandLine.find(isHttpUrl);
  if (externalUrl) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      openTab(externalUrl, true);
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    } else {
      pendingExternalUrl = externalUrl;
      createWindow();
    }
  } else if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
