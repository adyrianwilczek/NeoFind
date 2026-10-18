const { app, BrowserWindow, WebContentsView, ipcMain, dialog, shell, session } = require("electron");
const { autoUpdater } = require("electron-updater");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");

const HOME_URL = "https://neofind.pl/";
let mainWindow;
const blockedDialogOrigins = new Set();
let browserLanguage = "en";
let nextTabId = 1;
let activeTabId = null;
function isHttpUrl(value) { return typeof value === "string" && (value.startsWith("http://") || value.startsWith("https://")); }
function isRestorableUrl(value) { return isHttpUrl(value) || value === "about:home" || value === "about:blank"; }
let pendingExternalUrl = process.argv.find(isHttpUrl) || null;
const tabs = new Map();
let viewportBounds = { x: 0, y: 92, width: 1100, height: 650 };
let restoredSession = null;
let sessionSaveTimer = null;
const recentlyClosedTabs = [];

function getSessionSnapshot() {
  const orderedTabs = Array.from(tabs.values());
  const savedTabs = [];
  let activeIndex = 0;
  orderedTabs.forEach((tab, index) => {
    if (tab.isPrivate) return;
    let currentUrl = tab.isHomeTab ? "about:home" : (tab.url || HOME_URL);
    let currentTitle = tab.title || "New Tab";
    try {
      if (tab.view && tab.view.webContents && !tab.view.webContents.isDestroyed()) {
        if (!tab.isHomeTab) currentUrl = tab.view.webContents.getURL() || currentUrl;
        currentTitle = tab.isHomeTab ? "New Tab" : (tab.view.webContents.getTitle() || currentTitle);
      }
    } catch (error) {
      // Use the last URL/title recorded by navigation events if the view is closing.
    }
    if (isRestorableUrl(currentUrl)) {
      if (tab.id === activeTabId) activeIndex = savedTabs.length;
      savedTabs.push({ url: currentUrl, title: currentTitle, isHomeTab: tab.isHomeTab === true, pinned: tab.pinned === true });
    }
  });
  return { tabs: savedTabs, activeIndex };
}

function sessionFilePath() {
  return path.join(app.getPath("userData"), "browser-session.json");
}

function saveSessionSync() {
  try {
    const file = sessionFilePath();
    fsSync.mkdirSync(path.dirname(file), { recursive: true });
    const tempFile = file + ".tmp";
    fsSync.writeFileSync(tempFile, JSON.stringify(getSessionSnapshot(), null, 2), "utf8");
    fsSync.renameSync(tempFile, file);
  } catch (error) {
    console.error("Could not synchronously save NeoFind Browser session:", error);
  }
}

function queueSessionSave() {
  if (sessionSaveTimer) clearTimeout(sessionSaveTimer);
  sessionSaveTimer = setTimeout(() => {
    sessionSaveTimer = null;
    saveSessionSync();
  }, 200);
}

async function loadSavedSession() {
  try {
    const file = sessionFilePath();
    const data = JSON.parse(await fs.readFile(file, "utf8"));
    if (data && Array.isArray(data.tabs)) {
      restoredSession = {
        tabs: data.tabs.filter((tab) => tab && isRestorableUrl(tab.url)).slice(0, 100),
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
    saved.tabs.forEach((tab, index) => openTab(tab.isHomeTab ? "about:home" : tab.url, index === activeIndex, { pinned: tab.pinned === true }));
    return;
  }
  openTab(HOME_URL, true);
}

function normalizeAddress(input) {
  const value = String(input || "").trim();
  if (!value || /^about:(blank|home)$/i.test(value)) return "about:blank";
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
    isHomeTab: tab.isHomeTab === true,
    isPrivate: tab.isPrivate === true,
    pinned: tab.pinned === true,
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

function openTab(address = HOME_URL, activate = true, options = {}) {
  const id = nextTabId++;
  const isPrivate = options.private === true;
  const view = new WebContentsView({
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      ...(isPrivate ? { partition: "neofind-private-" + id } : {})
    }
  });
  const isHomeTab = /^about:(blank|home)$/i.test(String(address || ""));
  const tab = { id, view, title: "New Tab", url: isHomeTab ? "about:home" : "", loading: true, isHomeTab, isPrivate, pinned: options.pinned === true };
  // NEOFIND_SITE_DIALOG_GUARD: add a per-origin opt-out for JavaScript dialogs.
  const getDialogPrompt = () => ({
    en: "Block messages from this website?",
    pl: "Zablokować komunikaty tej strony?",
    es: "¿Bloquear los mensajes de este sitio web?",
    fr: "Bloquer les messages de ce site web ?"
  }[browserLanguage] || "Block messages from this website?");
  view.webContents.on("did-finish-load", () => {
    const wc = view.webContents;
    if (wc.isDestroyed()) return;
    let origin = "";
    try { origin = new URL(wc.getURL()).origin; } catch {}
    if (!origin || origin === "null") return;
    const alreadyBlocked = blockedDialogOrigins.has(origin);
    const promptText = getDialogPrompt();
    const bridge = `window.addEventListener("message", event => { if (event.source === window && event.data && event.data.__neoFindBlockDialogs && typeof event.data.origin === "string") console.warn("__NEOFIND_BLOCK_DIALOGS__:" + event.data.origin); });`;
    const script = `(() => {
      if (window.__neoFindDialogGuard) return;
      window.__neoFindDialogGuard = true;
      const origin = ${JSON.stringify(origin)};
      const promptText = ${JSON.stringify(promptText)};
      let blocked = ${JSON.stringify(alreadyBlocked)};
      const nativeAlert = window.alert.bind(window);
      const nativeConfirm = window.confirm.bind(window);
      const nativePrompt = window.prompt.bind(window);
      const offerBlock = () => {
        if (blocked) return;
        if (nativeConfirm(promptText)) {
          blocked = true;
          window.postMessage({ __neoFindBlockDialogs: true, origin }, "*");
        }
      };
      window.alert = (message) => { if (blocked) return; nativeAlert(String(message)); offerBlock(); };
      window.confirm = (message) => { if (blocked) return false; const answer = nativeConfirm(String(message)); offerBlock(); return answer; };
      window.prompt = (message, defaultValue) => { if (blocked) return null; const answer = nativePrompt(String(message), defaultValue); offerBlock(); return answer; };
    })();`;
    wc.executeJavaScript(bridge).then(() => wc.executeJavaScript(script)).catch(() => {});
  });
  view.webContents.on("console-message", (_event, detailsOrLevel, legacyMessage) => {
    const level = typeof detailsOrLevel === "object" && detailsOrLevel ? detailsOrLevel.level : detailsOrLevel;
    const message = typeof detailsOrLevel === "object" && detailsOrLevel ? detailsOrLevel.message : legacyMessage;
    if (typeof message === "string" && message.startsWith("__NEOFIND_BLOCK_DIALOGS__:")) {
      const origin = message.slice("__NEOFIND_BLOCK_DIALOGS__:".length);
      try { if (new URL(origin).origin === origin) blockedDialogOrigins.add(origin); } catch {}
    }
  });
  wc.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    const key = String(input.key || "").toLowerCase();
    const control = input.control || input.meta;
    if (control && key === "u") { event.preventDefault(); mainWindow?.webContents.send("browser:shortcut", "settings"); }
    else if (control && key === "c") { event.preventDefault(); mainWindow?.webContents.send("browser:shortcut", "focus-address"); }
    else if (control && key === "r") { event.preventDefault(); wc.reload(); }
    else if (control && key === "f5") { event.preventDefault(); wc.reloadIgnoringCache(); }
    else if (control && key === "x") { event.preventDefault(); if (tab.id === activeTabId) closeTab(tab.id); }
    else if (!control && !input.alt && key === "arrowleft") { event.preventDefault(); if (wc.navigationHistory.canGoBack()) wc.navigationHistory.goBack(); }
    else if (!control && !input.alt && key === "arrowright") { event.preventDefault(); if (wc.navigationHistory.canGoForward()) wc.navigationHistory.goForward(); }
  });
  tabs.set(id, tab);
  const wc = view.webContents;

  wc.setWindowOpenHandler(({ url }) => {
    openTab(url, true);
    return { action: "deny" };
  });
  wc.on("page-title-updated", (_event, title) => {
    tab.title = tab.isHomeTab ? "New Tab" : (title || "New Tab");
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
    if (!tab.isHomeTab) tab.url = wc.getURL() || tab.url || HOME_URL;
    sendState();
    saveSessionSync();
  });
  wc.on("did-navigate", (_event, url) => {
    tab.isHomeTab = false;
    tab.url = url;
    sendState();
    saveSessionSync();
  });
  wc.on("did-navigate-in-page", (_event, url) => {
    tab.isHomeTab = false;
    tab.url = url;
    sendState();
    saveSessionSync();
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

  const targetUrl = isHomeTab ? "about:blank" : normalizeAddress(address);
  wc.loadURL(targetUrl).catch(() => {
    tab.loading = false;
    tab.title = "Unable to load page";
    sendState();
  });
  return id;
}

function closeTab(id) {
  const tab = tabs.get(Number(id));
  if (!tab) return;
  if (!tab.isPrivate && tab.url && isRestorableUrl(tab.url)) {
    recentlyClosedTabs.unshift({ url: tab.isHomeTab ? "about:home" : tab.url, title: tab.title || "New Tab", isHomeTab: tab.isHomeTab === true, pinned: tab.pinned === true });
    if (recentlyClosedTabs.length > 10) recentlyClosedTabs.length = 10;
  }
  try { mainWindow.contentView.removeChildView(tab.view); } catch {}
  try { tab.view.webContents.close(); } catch {}
  tabs.delete(tab.id);
  if (tab.isPrivate) { try { tab.view.webContents.session.clearStorageData(); tab.view.webContents.session.clearCache(); } catch {} }
  saveSessionSync();

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
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const origin = details && details.requestingUrl ? (() => { try { return new URL(details.requestingUrl).origin; } catch { return "this website"; } })() : "this website";
    const allowedPermissions = new Set(["notifications", "geolocation", "media", "clipboard-read", "midi", "fullscreen", "pointerLock"]);
    if (!allowedPermissions.has(permission) || !mainWindow || mainWindow.isDestroyed()) { callback(false); return; }
    dialog.showMessageBox(mainWindow, { type: "question", title: "Website permission", message: origin + " wants permission: " + permission, detail: "Allow only if you trust this website. You can deny the request.", buttons: ["Deny", "Allow"], defaultId: 0, cancelId: 0 }).then(({ response }) => callback(response === 1)).catch(() => callback(false));
  });
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
  mainWindow.on("close", () => { saveSessionSync(); });
  mainWindow.on("closed", () => {
    mainWindow = null;
    for (const tab of tabs.values()) {
      try { tab.view.webContents.close(); } catch {}
    }
    tabs.clear();
  });
}

ipcMain.handle("tabs:create", (_event, url, options) => openTab(url || HOME_URL, true, options || {}));
ipcMain.handle("tabs:duplicate", (_event, id) => { const tab = tabs.get(Number(id)) || tabs.get(activeTabId); if (!tab) return null; return openTab(tab.isHomeTab ? "about:home" : (tab.url || HOME_URL), true, { private: tab.isPrivate, pinned: false }); });
ipcMain.handle("tabs:toggle-pin", (_event, id) => { const tab = tabs.get(Number(id)); if (!tab) return { ok: false }; tab.pinned = !tab.pinned; sendState(); queueSessionSave(); return { ok: true, pinned: tab.pinned }; });
ipcMain.handle("browser:clear-data", async () => { try { await session.defaultSession.clearStorageData(); await session.defaultSession.clearCache(); return { ok: true }; } catch (error) { return { ok: false, message: error.message }; } });
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
  if (tabs.get(from)?.pinned) return;
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
ipcMain.on("browser:reload-ignoring-cache", () => activeContents()?.reloadIgnoringCache());
ipcMain.on("browser:set-language", (_event, language) => { if (["en", "pl", "es", "fr"].includes(language)) browserLanguage = language; });
ipcMain.on("browser:focus-address", () => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("browser:focus-address"); });
ipcMain.on("browser:close-active-tab", () => { if (activeTabId !== null) closeTab(activeTabId); });
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
app.on("before-quit", () => { if (sessionSaveTimer) clearTimeout(sessionSaveTimer); if (tabs.size > 0) saveSessionSync(); });
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
