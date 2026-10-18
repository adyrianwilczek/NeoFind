const { app, BrowserWindow, WebContentsView, ipcMain, dialog, shell } = require("electron");
const { autoUpdater } = require("electron-updater");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");

const HOME_URL = "https://neofind.pl/";
let mainWindow;
let nextTabId = 1;
let activeTabId = null;
function isHttpUrl(value) { return typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://")); }
let pendingExternalUrl = process.argv.find(isHttpUrl) || null;
const tabs = new Map();
let viewportBounds = { x: 0, y: 92, width: 1100, height: 650 };
let restoredSession = null;
let sessionSaveTimer = null;

function saveSessionSync() {
  try {
    const session = {
      tabs: Array.from(tabs.values()).map((tab) => ({
        url: tab.view.webContents.getURL() || tab.url || HOME_URL,
        title: tab.title || "New Tab"
      })).filter((tab) => isHttpUrl(tab.url)),
      activeIndex: Math.max(0, Array.from(tabs.keys()).indexOf(activeTabId))
    };
    const file = path.join(app.getPath("userData"), "browser-session.json");
    fsSync.mkdirSync(path.dirname(file), { recursive: true });
    fsSync.writeFileSync(file, JSON.stringify(session, null, 2), "utf8");
  } catch (error) {
    console.error("Could not synchronously save NeoFind Browser session:", error);
  }
}

function queueSessionSave() {
  if (sessionSaveTimer) clearTimeout(sessionSaveTimer);
  sessionSaveTimer = setTimeout(async () => {
    sessionSaveTimer = null;
    try {
      const session = {
        tabs: Array.from(tabs.values()).map((tab) => ({
          url: tab.view.webContents.getURL() || tab.url || HOME_URL,
          title: tab.title || "New Tab"
        })).filter((tab) => isHttpUrl(tab.url)),
        activeIndex: Math.max(0, Array.from(tabs.keys()).indexOf(activeTabId))
      };
      const file = path.join(app.getPath("userData"), "browser-session.json");
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, JSON.stringify(session, null, 2), "utf8");
    } catch (error) {
      console.error("Could not save NeoFind Browser session:", error);
    }
  }, 250);
}

async function loadSavedSession() {
  try {
    const file = path.join(app.getPath("userData"), "browser-session.json");
    const data = JSON.parse(await fs.readFile(file, "utf8"));
    if (data && Array.isArray(data.tabs)) {
      restoredSession = {
        tabs: data.tabs.filter((tab) => tab && isHttpUrl(tab.url)).slice(0, 100),
        activeIndex: Number.isInteger(data.activeIndex) ? data.activeIndex : 0
      };
    }
  } catch {
    restoredSession = null;
  }
}

function restoreSessionOrHome() {
  const saved = restoredSession;
  restoredSession = null;
  if (saved && saved.tabs.length) {
    const activeIndex = Math.max(0, Math.min(saved.activeIndex, saved.tabs.length - 1));
    saved.tabs.forEach((tab, index) => openTab(tab.url, index === activeIndex));
    return;
  }
  openTab(HOME_URL, true);
}

function normalizeAddress(input) {
  const value = String(input || "").trim();
  if (!value || /^about:(blank|home)$/i.test(value)) return HOME_URL;
  if (/^(profile|link)$/i.test(value)) return HOME_URL + "?p=profile";

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
    queueSessionSave();
  });
  wc.on("did-navigate", (_event, url) => {
    tab.url = url;
    sendState();
    queueSessionSave();
  });
  wc.on("did-navigate-in-page", (_event, url) => {
    tab.url = url;
    sendState();
    queueSessionSave();
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
  queueSessionSave();
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
    icon: path.join(__dirname, "icon.ico"),
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
    if (pendingExternalUrl) {
      const target = pendingExternalUrl;
      pendingExternalUrl = null;
      restoredSession = null;
      openTab(target, true);
    } else {
      restoreSessionOrHome();
    }
  });
  mainWindow.on("resize", updateActiveBounds);
  mainWindow.on("close", saveSessionSync);
  mainWindow.on("closed", () => {
    mainWindow = null;
    for (const tab of tabs.values()) {
      try { tab.view.webContents.close(); } catch {}
    }
    tabs.clear();
  });
}

ipcMain.handle("tabs:create", (_event, url) => openTab(url || HOME_URL, true));
ipcMain.handle("sidebar:open-neoai", () => {
  const id = openTab(HOME_URL, true);
  const tab = tabs.get(id);
  if (tab) {
    const wc = tab.view.webContents;
    wc.once("did-finish-load", () => {
      setTimeout(() => {
        if (!wc.isDestroyed()) wc.executeJavaScript("document.getElementById('neoAiFloatBtn')?.click()").catch(() => {});
      }, 500);
    });
  }
  return { ok: true };
});
ipcMain.on("tabs:switch", (_event, id) => {
  if (!tabs.has(Number(id))) return;
  activeTabId = Number(id);
  showActiveTab();
  queueSessionSave();
});
ipcMain.on("tabs:close", (_event, id) => closeTab(id));
ipcMain.on("tabs:reorder", (_event, fromId, toId) => {
  const from = Number(fromId), to = Number(toId);
  const ids = Array.from(tabs.keys());
  const fromIndex = ids.indexOf(from), toIndex = ids.indexOf(to);
  if (fromIndex < 0 || toIndex < 0 || from === to) return;
  ids.splice(fromIndex, 1);
  ids.splice(toIndex, 0, from);
  const ordered = new Map();
  ids.forEach((id) => { if (tabs.has(id)) ordered.set(id, tabs.get(id)); });
  tabs.clear();
  ordered.forEach((tab, id) => tabs.set(id, tab));
  sendState();
  queueSessionSave();
});
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
ipcMain.on("browser:hide-content", () => {
  const tab = tabs.get(activeTabId);
  if (tab && mainWindow) { try { mainWindow.contentView.removeChildView(tab.view); } catch {} }
});
ipcMain.on("browser:show-content", () => showActiveTab());
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
ipcMain.handle("import:choose-source-profile", async (_event, sourceBrowser) => {
  if (!mainWindow || mainWindow.isDestroyed()) return { canceled: true };
  const local = process.env.LOCALAPPDATA || path.join(require("node:os").homedir(), "AppData", "Local");
  const roaming = app.getPath("appData");
  const defaults = {
    "Google Chrome": path.join(local, "Google", "Chrome", "User Data", "Default"),
    "Microsoft Edge": path.join(local, "Microsoft", "Edge", "User Data", "Default"),
    "Brave": path.join(local, "BraveSoftware", "Brave-Browser", "User Data", "Default"),
    "Opera": path.join(roaming, "Opera Software", "Opera Stable"),
    "Opera GX": path.join(roaming, "Opera Software", "Opera GX Stable"),
    "Mozilla Firefox": path.join(roaming, "Mozilla", "Firefox", "Profiles")
  };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Choose " + String(sourceBrowser || "browser") + " profile folder",
    properties: ["openDirectory"],
    ...(defaults[sourceBrowser] ? { defaultPath: defaults[sourceBrowser] } : {})
  });
  if (result.canceled || !result.filePaths[0]) return { canceled: true };
  return { canceled: false, profilePath: result.filePaths[0] };
});

ipcMain.handle("import:source-profile", async (_event, sourceBrowser, profilePath, selected) => {
  if (typeof profilePath !== "string" || !path.isAbsolute(profilePath) || !selected || typeof selected !== "object") {
    throw new Error("Invalid browser import selection.");
  }
  const profile = path.resolve(profilePath);
  const firefox = sourceBrowser === "Mozilla Firefox";
  const result = { bookmarks: [], history: [], settingsFound: false, extensionsFound: 0, cookiesFound: false, notes: [] };

  if (selected.bookmarks) {
    let tempFile;
    try {
      if (firefox) {
        tempFile = path.join(app.getPath("temp"), "neofind-firefox-bookmarks-" + Date.now() + ".sqlite");
        await fs.copyFile(path.join(profile, "places.sqlite"), tempFile);
        const { DatabaseSync } = require("node:sqlite");
        const db = new DatabaseSync(tempFile, { readOnly: true });
        try {
          result.bookmarks = db.prepare("SELECT p.url AS url, COALESCE(b.title,p.title,p.url) AS title FROM moz_bookmarks b JOIN moz_places p ON p.id=b.fk WHERE b.type=1 AND (p.url LIKE 'http://%' OR p.url LIKE 'https://%') LIMIT 50000").all().map((row) => ({ url: String(row.url), title: String(row.title || row.url).slice(0, 300) }));
        } finally { db.close(); }
      } else {
        const data = JSON.parse(await fs.readFile(path.join(profile, "Bookmarks"), "utf8"));
        const walk = (node) => {
          if (!node || typeof node !== "object") return;
          if (node.type === "url" && typeof node.url === "string") {
            try { const u = new URL(node.url); if (["http:", "https:"].includes(u.protocol)) result.bookmarks.push({ title: String(node.name || u.href).slice(0, 300), url: u.href }); } catch {}
          }
          if (Array.isArray(node.children)) node.children.forEach(walk);
          else Object.values(node).forEach((value) => { if (value && typeof value === "object") walk(value); });
        };
        walk(data.roots);
      }
    } catch { result.notes.push("Bookmarks file could not be read. Close the source browser and select its actual profile folder."); }
    finally { if (tempFile) await fs.rm(tempFile, { force: true }).catch(() => {}); }
  }
  if (selected.history) {
    let tempFile;
    try {
      const source = path.join(profile, firefox ? "places.sqlite" : "History");
      await fs.access(source);
      tempFile = path.join(app.getPath("temp"), "neofind-history-" + Date.now() + ".sqlite");
      await fs.copyFile(source, tempFile);
      const { DatabaseSync } = require("node:sqlite");
      const db = new DatabaseSync(tempFile, { readOnly: true });
      try {
        const rows = firefox
          ? db.prepare("SELECT url,title,visit_count,last_visit_date AS last_visit_time FROM moz_places WHERE (url LIKE 'http://%' OR url LIKE 'https://%') AND visit_count>0 ORDER BY last_visit_date DESC LIMIT 20000").all()
          : db.prepare("SELECT url, title, last_visit_time, visit_count FROM urls WHERE url LIKE 'http://%' OR url LIKE 'https://%' ORDER BY last_visit_time DESC LIMIT 20000").all();
        result.history = rows.map((row) => ({ url: String(row.url || ""), title: String(row.title || row.url || "").slice(0, 300), visitCount: Number(row.visit_count || 1), lastVisitTime: Number(row.last_visit_time || 0) }));
      } finally { db.close(); }
    } catch {
      result.notes.push("History could not be read. Close the source browser and try again; this feature needs a compatible SQLite runtime.");
    } finally { if (tempFile) await fs.rm(tempFile, { force: true }).catch(() => {}); }
  }
  if (selected.settings) { try { await fs.access(path.join(profile, firefox ? "prefs.js" : "Preferences")); result.settingsFound = true; } catch {} }
  if (selected.extensions) { try { result.extensionsFound = (await fs.readdir(path.join(profile, firefox ? "extensions" : "Extensions"), { withFileTypes: true })).filter((entry) => entry.isDirectory() || entry.isFile()).length; } catch {} }
  if (selected.cookies) {
    try { await fs.access(firefox ? path.join(profile, "cookies.sqlite") : path.join(profile, "Network", "Cookies")); result.cookiesFound = true; }
    catch { try { await fs.access(path.join(profile, "Cookies")); result.cookiesFound = true; } catch {} }
    if (result.cookiesFound) result.notes.push("Cookies were detected but not copied: their encryption and session format are browser-specific.");
  }
  if (selected.passwords) result.notes.push("Saved passwords are not copied directly because the source browser protects them with OS/browser encryption. Use its password export and a trusted password manager or a supported browser-import flow.");
  if (selected.autofill) result.notes.push("Autofill data is not copied in this version because it is stored in the encrypted browser profile database.");
  if (selected.settings && result.settingsFound) result.notes.push("Browser preferences were detected but not applied because NeoFind Browser uses different settings.");
  if (selected.extensions && result.extensionsFound) result.notes.push("Found " + result.extensionsFound + " extension folder(s); review and install compatible extensions individually.");
  return result;
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
app.whenReady().then(async () => {
  await loadSavedSession();
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
app.on("before-quit", () => { if (sessionSaveTimer) clearTimeout(sessionSaveTimer); saveSessionSync(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
