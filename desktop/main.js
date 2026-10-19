const { app, BrowserWindow, WebContentsView, ipcMain, dialog, shell, session, safeStorage, clipboard } = require("electron");
const crypto = require("node:crypto");
const { autoUpdater } = require("electron-updater");
const fs = require("node:fs/promises");
const fsSync = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const HOME_URL = "https://neofind.pl/";
let mainWindow;
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
const downloadHistoryPath = path.join(app.getPath("userData"), "download-history.json");
const passwordVaultPath = path.join(app.getPath("userData"), "password-vault.json");
let pendingPasswordCandidate = null;
function readDownloadHistory() {
  try { const value = JSON.parse(fsSync.readFileSync(downloadHistoryPath, "utf8")); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function writeDownloadHistory(items) {
  try { fsSync.mkdirSync(path.dirname(downloadHistoryPath), { recursive: true }); fsSync.writeFileSync(downloadHistoryPath, JSON.stringify(items.slice(0, 1000), null, 2), "utf8"); return true; }
  catch (error) { console.error("Could not save download history:", error); return false; }
}
function sendDownloadHistory() { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("downloads:state", readDownloadHistory()); }
function readPasswordVault() { try { return JSON.parse(fsSync.readFileSync(passwordVaultPath, "utf8")); } catch { return null; } }
function writePasswordVault(vault) {
  try { fsSync.mkdirSync(path.dirname(passwordVaultPath), { recursive: true }); fsSync.writeFileSync(passwordVaultPath, JSON.stringify(vault, null, 2), { mode: 0o600 }); return true; }
  catch (error) { console.error("Could not save password vault:", error); return false; }
}
function verifyVaultPin(pin, vault = readPasswordVault()) {
  if (!vault || !vault.pinSalt || !vault.pinHash || typeof pin !== "string") return false;
  const actual = crypto.scryptSync(pin, vault.pinSalt, 32);
  const expected = Buffer.from(vault.pinHash, "hex");
  return expected.length === actual.length && crypto.timingSafeEqual(actual, expected);
}
function readVaultEntries(vault = readPasswordVault()) {
  if (!vault || !vault.encryptedEntries || !safeStorage.isEncryptionAvailable()) return [];
  try { return JSON.parse(safeStorage.decryptString(Buffer.from(vault.encryptedEntries, "base64"))); } catch { return []; }
}
function writeVaultEntries(entries, vault = readPasswordVault()) {
  if (!vault || !safeStorage.isEncryptionAvailable()) return false;
  try { vault.encryptedEntries = safeStorage.encryptString(JSON.stringify(entries)).toString("base64"); return writePasswordVault(vault); } catch { return false; }
}
function saveCredentialEntry(candidate) {
  const vault = readPasswordVault();
  if (!vault || !safeStorage.isEncryptionAvailable()) return false;
  const entries = readVaultEntries(vault);
  const origin = String(candidate.origin || "");
  const username = String(candidate.username || "");
  const existing = entries.findIndex(entry => entry.origin === origin && entry.username === username);
  const entry = { id: crypto.randomUUID(), origin, url: String(candidate.url || origin), title: String(candidate.title || origin), username, password: String(candidate.password || ""), savedAt: new Date().toISOString() };
  if (existing >= 0) { entry.id = entries[existing].id; entries[existing] = entry; } else entries.unshift(entry);
  return writeVaultEntries(entries, vault);
}
function sendPasswordVaultChanged() { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("passwords:changed"); }
function handleCredentialCandidate(candidate) {
  if (!candidate || typeof candidate.origin !== "string" || !/^https?:\/\//i.test(candidate.origin) || typeof candidate.password !== "string" || !candidate.password || typeof candidate.username !== "string" || !mainWindow || mainWindow.isDestroyed()) return;
  if (!readPasswordVault()) {
    pendingPasswordCandidate = candidate;
    dialog.showMessageBox(mainWindow, { type: "info", title: "Password Manager", message: "Set up Password Manager before saving this login.", detail: "Create a separate NeoFind Password Manager PIN in Settings. This is not your Windows PIN.", buttons: ["Open Password Manager", "Not now"], defaultId: 0, cancelId: 1 }).then(({ response }) => {
      if (response === 0 && mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("passwords:open-settings");
      else pendingPasswordCandidate = null;
    }).catch(() => { pendingPasswordCandidate = null; });
    return;
  }
  dialog.showMessageBox(mainWindow, { type: "question", title: "Save password?", message: "Save login for " + candidate.origin + "?", detail: "Username: " + (candidate.username || "(not detected)") + "\nThe password will be encrypted in your local vault.", buttons: ["Don't save", "Save password"], defaultId: 1, cancelId: 0 }).then(({ response }) => {
    if (response === 1 && saveCredentialEntry(candidate)) sendPasswordVaultChanged();
  }).catch(() => {});
}
function installCredentialCapture(wc) {
  if (!wc || wc.isDestroyed()) return;
  wc.executeJavaScript(`(() => {
    if (window.__neoFindCredentialCaptureInstalled) return;
    window.__neoFindCredentialCaptureInstalled = true;
    document.addEventListener("submit", (event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      const passwordInput = form.querySelector('input[type="password"]');
      if (!passwordInput || !passwordInput.value) return;
      const userInput = form.querySelector('input[autocomplete="username"], input[type="email"], input[name*="user" i], input[name*="email" i], input[name*="login" i], input[type="text"]');
      const candidate = { origin: location.origin, url: location.href, title: document.title, username: userInput ? userInput.value : "", password: passwordInput.value };
      console.info("__NEOFIND_PASSWORD_CANDIDATE__" + JSON.stringify(candidate));
    }, true);
  })()`).catch(() => {});
}

const blockedNotificationsPath = path.join(app.getPath("userData"), "blocked-notifications.json");
const permissionDecisionsPath = path.join(app.getPath("userData"), "permission-decisions.json");
function readPermissionDecisions() { try { const value = JSON.parse(fsSync.readFileSync(permissionDecisionsPath, "utf8")); return value && typeof value === "object" && !Array.isArray(value) ? value : {}; } catch { return {}; } }
function savePermissionDecision(origin, permission, decision) {
  const decisions = readPermissionDecisions(); decisions[origin + "|" + permission] = decision;
  try { fsSync.mkdirSync(path.dirname(permissionDecisionsPath), { recursive: true }); fsSync.writeFileSync(permissionDecisionsPath, JSON.stringify(decisions, null, 2), "utf8"); return true; }
  catch (error) { console.error("Could not save website permission:", error); return false; }
}
function getPermissionDecision(origin, permission) { return readPermissionDecisions()[origin + "|" + permission] || null; }
function getRiskReason(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    if (url.username || url.password) return "The address contains hidden login credentials.";
    if (host.startsWith("xn--") || host.split(".").some(part => part.startsWith("xn--"))) return "The domain uses encoded characters that can disguise its real name.";
    if (url.protocol === "http:" && /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return "This page uses an unencrypted connection to a numeric IP address.";
    if (/(^|\.)neofind\.pl\./i.test(host) || /(^|\.)(paypa[l1]|micros0ft|g[o0]{2}gle|app1e)\./i.test(host)) return "The domain resembles a well-known site but may be a look-alike.";
  } catch {}
  return "";
}
function makeBlockedPage(target, reason) {
  const safeTarget = String(target).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const safeReason = String(reason || "NeoFind Browser could not verify this page.").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  return "data:text/html;charset=utf-8," + encodeURIComponent("<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>Page blocked by NeoFind</title><style>body{margin:0;background:#09111f;color:#eaf2ff;font:16px system-ui;display:grid;place-items:center;min-height:100vh}.card{max-width:660px;margin:24px;padding:32px;border:1px solid #314765;border-radius:22px;background:#111e30;box-shadow:0 20px 70px #0008}h1{font-size:28px}p{line-height:1.6;color:#b9c9dd;overflow-wrap:anywhere}.buttons{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px}button{border:0;border-radius:10px;padding:12px 16px;font-weight:700;cursor:pointer;background:#273c55;color:white}.danger{background:#a92f39;color:white}</style></head><body><main class='card'><p>NEOFIND BROWSER · SAFETY CHECK</p><h1>Ta strona jest zablokowana</h1><p>" + safeReason + "</p><p><b>Adres:</b> " + safeTarget + "</p><p>NeoFind Browser nie może zagwarantować bezpieczeństwa tej strony. Otwieraj ją tylko wtedy, gdy ufasz jej źródłu.</p><div class='buttons'><button onclick='history.back()'>OK</button><button class='danger' id='openRisk'>Open page !HIGH RISK!</button></div></main><script>document.getElementById('openRisk').addEventListener('click',()=>{if(window.neoBrowser)window.neoBrowser.openRiskPage(" + JSON.stringify(String(target)) + ")})</script></body></html>");
}
function makeNavigationErrorPage(target) {
  const safeTarget = String(target).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  return "data:text/html;charset=utf-8," + encodeURIComponent("<!doctype html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'><title>NeoFind: page not found</title><style>body{margin:0;background:#09111f;color:#eaf2ff;font:16px system-ui;display:grid;place-items:center;min-height:100vh}.card{max-width:680px;margin:24px;padding:32px;border:1px solid #314765;border-radius:22px;background:#111e30}h1{font-size:28px}p{line-height:1.6;color:#b9c9dd;overflow-wrap:anywhere}button{border:0;border-radius:10px;padding:12px 16px;font-weight:700;background:#273c55;color:white;cursor:pointer}</style></head><body><main class='card'><p>NEOFIND BROWSER</p><h1>Neo nie może odnaleźć strony</h1><p>Sprawdź, czy w <b>" + safeTarget + "</b> nie ma błędu.</p><p>Sprawdź pisownię adresu, połączenie z internetem albo spróbuj ponownie.</p><button onclick='history.back()'>Go back</button></main></body></html>");
}
function getBlockedNotificationOrigins() {
  try { const data = JSON.parse(fsSync.readFileSync(blockedNotificationsPath, "utf8")); return Array.isArray(data) ? Array.from(new Set(data.filter(value => typeof value === "string"))) : []; }
  catch { return []; }
}
function saveBlockedNotificationOrigins(origins) {
  try { fsSync.writeFileSync(blockedNotificationsPath, JSON.stringify(Array.from(new Set(origins)), null, 2), "utf8"); return true; }
  catch (error) { console.error("Could not save blocked notification sites:", error); return false; }
}

function getSessionSnapshot() {
  const orderedTabs = Array.from(tabs.values());
  const savedTabs = [];
  let activeIndex = 0;
  orderedTabs.forEach((tab, index) => {
    if (tab.isPrivate) return;
    let currentUrl = tab.isHomeTab ? (tab.homePage ? "about:home" : "about:blank") : (tab.url || HOME_URL);
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
    saved.tabs.forEach((tab, index) => openTab(tab.url || (tab.isHomeTab ? "about:home" : HOME_URL), index === activeIndex, { pinned: tab.pinned === true }));
    return;
  }
  openTab(HOME_URL, true);
}

function normalizeAddress(input) {
  const value = String(input || "").trim();
  if (!value || /^about:(blank|home)$/i.test(value)) return "about:blank";
  if (/^(profile|link)$/i.test(value)) return HOME_URL + "?p=profile";
  if (/^file:/i.test(value)) { try { const url = new URL(value); if (url.protocol === "file:") return url.href; } catch {} }
  if (/^(?:[a-zA-Z]:[\\/]|\\\\)/.test(value) || /^\.\.?[\\/]/.test(value)) {
    try { return pathToFileURL(path.resolve(value)).href; } catch {}
  }
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(value)) {
    try {
      const url = new URL(value);
      if (url.protocol === "http:" || url.protocol === "https:") return url.href;
      if (url.protocol === "file:") return url.href;
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
  const homePage = options.homePage === true || String(address || "").toLowerCase() === "about:home";
  const tab = { id, view, title: "New Tab", url: isHomeTab ? (homePage ? "about:home" : "about:blank") : "", loading: true, isHomeTab, homePage, isPrivate, pinned: options.pinned === true };
  tabs.set(id, tab);
  const wc = view.webContents;
  // NEOFIND_011_KEYBOARD_SHORTCUTS: keep browser shortcuts active while a web page has focus.
  wc.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    const key = String(input.key || "").toLowerCase();
    const control = input.control || input.meta;
    if (control && key === "u") {
      event.preventDefault();
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("browser:shortcut", "settings");
    } else if (control && key === "r") {
      event.preventDefault();
      activeContents()?.reload();
    } else if (control && key === "f5") {
      event.preventDefault();
      activeContents()?.reloadIgnoringCache();
    } else if (control && key === "x") {
      event.preventDefault();
      if (activeTabId !== null) closeTab(activeTabId);
    }
  });

  wc.setWindowOpenHandler(({ url }) => {
    openTab(url, true);
    return { action: "deny" };
  });
  wc.on("will-navigate", (event, targetUrl) => {
    if (!isHttpUrl(targetUrl)) return;
    const reason = getRiskReason(targetUrl);
    if (!reason) return;
    event.preventDefault();
    tab.pendingRiskUrl = targetUrl;
    tab.title = "Page blocked by NeoFind";
    tab.url = targetUrl;
    wc.loadURL(makeBlockedPage(targetUrl, reason)).catch(() => {});
  });
  wc.on("did-fail-load", (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || errorCode === -3 || !validatedURL || !isHttpUrl(validatedURL)) return;
    tab.loading = false;
    tab.errorUrl = validatedURL;
    tab.title = "NeoFind: page not found";
    tab.url = validatedURL;
    wc.loadURL(makeNavigationErrorPage(validatedURL)).catch(() => {});
  });
  wc.on("console-message", (_event, details) => {
    const message = typeof details === "string" ? details : details && details.message;
    if (typeof message !== "string" || !message.startsWith("__NEOFIND_PASSWORD_CANDIDATE__")) return;
    try { handleCredentialCandidate(JSON.parse(message.slice("__NEOFIND_PASSWORD_CANDIDATE__".length))); } catch {}
  });
  wc.on("dom-ready", () => installCredentialCapture(wc));
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
    tab.url = tab.isHomeTab ? (tab.homePage ? "about:home" : "about:blank") : wc.getURL();
    tab.title = wc.getTitle() || tab.title || "New Tab";
    if (!tab.isHomeTab) tab.url = wc.getURL() || tab.url || HOME_URL;
    sendState();
    saveSessionSync();
  });
  wc.on("did-navigate", (_event, url) => {
    if (tab.homePage && url === HOME_URL) { tab.isHomeTab = true; tab.url = "about:home"; }
    else { tab.isHomeTab = false; tab.homePage = false; tab.url = url; }
    sendState();
    saveSessionSync();
  });
  wc.on("did-navigate-in-page", (_event, url) => {
    if (tab.homePage && url === HOME_URL) { tab.isHomeTab = true; tab.url = "about:home"; }
    else { tab.isHomeTab = false; tab.homePage = false; tab.url = url; }
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

  const targetUrl = homePage ? HOME_URL : (isHomeTab ? "about:blank" : normalizeAddress(address));
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
    recentlyClosedTabs.unshift({ url: tab.isHomeTab ? (tab.homePage ? "about:home" : "about:blank") : tab.url, title: tab.title || "New Tab", isHomeTab: tab.isHomeTab === true, pinned: tab.pinned === true });
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
  session.defaultSession.on("will-download", (_event, item) => {
    const sourceUrl = item.getURL();
    const originalName = item.getFilename() || "download";
    const downloadsDir = app.getPath("downloads");
    let targetPath = item.getSavePath();
    if (!targetPath) {
      const parsed = path.parse(originalName);
      let candidatePath = path.join(downloadsDir, originalName);
      let suffix = 1;
      while (fsSync.existsSync(candidatePath)) candidatePath = path.join(downloadsDir, parsed.name + " (" + suffix++ + ")" + parsed.ext);
      targetPath = candidatePath;
      item.setSavePath(targetPath);
    }
    const entry = { id: crypto.randomUUID(), filename: path.basename(targetPath), url: sourceUrl, path: targetPath, startedAt: new Date().toISOString(), finishedAt: null, state: "downloading", receivedBytes: 0, totalBytes: item.getTotalBytes() };
    const history = readDownloadHistory(); history.unshift(entry); writeDownloadHistory(history); sendDownloadHistory();
    item.on("updated", (_updateEvent, state) => {
      const list = readDownloadHistory(); const current = list.find(row => row.id === entry.id);
      if (current) { current.state = state === "interrupted" ? "interrupted" : "downloading"; current.receivedBytes = item.getReceivedBytes(); current.totalBytes = item.getTotalBytes(); writeDownloadHistory(list); sendDownloadHistory(); }
    });
    item.once("done", (_doneEvent, state) => {
      const list = readDownloadHistory(); const current = list.find(row => row.id === entry.id);
      if (current) { current.state = state === "completed" ? "completed" : state === "cancelled" ? "cancelled" : "interrupted"; current.receivedBytes = item.getReceivedBytes(); current.totalBytes = item.getTotalBytes(); current.finishedAt = new Date().toISOString(); current.path = item.getSavePath() || current.path; current.filename = path.basename(current.path); writeDownloadHistory(list); sendDownloadHistory(); }
    });
  });
  const allowedPermissions = new Set(["notifications", "geolocation", "media", "clipboard-read", "midi", "fullscreen", "pointerLock"]);
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin) => {
    if (!allowedPermissions.has(permission)) return false;
    const origin = (() => { try { return new URL(requestingOrigin).origin; } catch { return ""; } })();
    if (!origin) return false;
    if (permission === "notifications" && getBlockedNotificationOrigins().includes(origin)) return false;
    return getPermissionDecision(origin, permission) === "allow";
  });
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const origin = details && details.requestingUrl ? (() => { try { return new URL(details.requestingUrl).origin; } catch { return ""; } })() : "";
    if (!allowedPermissions.has(permission) || !origin || !mainWindow || mainWindow.isDestroyed()) { callback(false); return; }
    if (permission === "notifications" && getBlockedNotificationOrigins().includes(origin)) { callback(false); return; }
    const previous = getPermissionDecision(origin, permission);
    if (previous === "allow") { callback(true); return; }
    if (previous === "deny") { callback(false); return; }
    const isNotificationRequest = permission === "notifications";
    const buttons = isNotificationRequest ? ["Deny", "Allow", "Block notifications for this site"] : ["Deny", "Allow"];
    const detail = isNotificationRequest ? "Allow notifications only if you trust this website. Blocked sites can be unblocked in Settings → General." : "Allow only if you trust this website.";
    dialog.showMessageBox(mainWindow, { type: "question", title: "Website permission", message: origin + " wants access to " + permission + ".", detail, buttons, defaultId: 0, cancelId: 0, checkboxLabel: "Always allow for this site", checkboxChecked: false }).then(({ response, checkboxChecked }) => {
      if (isNotificationRequest && response === 2) {
        const origins = getBlockedNotificationOrigins(); if (!origins.includes(origin)) origins.push(origin);
        saveBlockedNotificationOrigins(origins); savePermissionDecision(origin, permission, "deny"); callback(false);
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("browser:blocked-notifications-changed");
        return;
      }
      const allow = response === 1;
      if (checkboxChecked && allow) savePermissionDecision(origin, permission, "allow");
      callback(allow);
    }).catch(() => callback(false));
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
ipcMain.handle("tabs:duplicate", (_event, id) => { const tab = tabs.get(Number(id)) || tabs.get(activeTabId); if (!tab) return null; return openTab(tab.isHomeTab ? (tab.homePage ? "about:home" : "about:blank") : (tab.url || HOME_URL), true, { private: tab.isPrivate, pinned: false }); });
ipcMain.handle("tabs:toggle-pin", (_event, id) => { const tab = tabs.get(Number(id)); if (!tab) return { ok: false }; tab.pinned = !tab.pinned; sendState(); queueSessionSave(); return { ok: true, pinned: tab.pinned }; });
ipcMain.handle("browser:clear-data", async () => { try { await session.defaultSession.clearStorageData(); await session.defaultSession.clearCache(); return { ok: true }; } catch (error) { return { ok: false, message: error.message }; } });
ipcMain.handle("downloads:get", () => readDownloadHistory());
ipcMain.handle("downloads:open", async (_event, id) => {
  const entry = readDownloadHistory().find(row => row.id === id);
  if (!entry || entry.state !== "completed" || !entry.path) return { ok: false, message: "File is not available." };
  const error = await shell.openPath(entry.path); return error ? { ok: false, message: error } : { ok: true };
});
ipcMain.handle("downloads:show-in-folder", (_event, id) => {
  const entry = readDownloadHistory().find(row => row.id === id); if (!entry || !entry.path) return { ok: false };
  shell.showItemInFolder(entry.path); return { ok: true };
});
ipcMain.handle("downloads:clear-history", () => { const ok = writeDownloadHistory([]); sendDownloadHistory(); return { ok }; });
ipcMain.handle("browser:open-risk-page", async (event, targetUrl) => {
  if (!isHttpUrl(targetUrl)) return { ok: false };
  const tab = Array.from(tabs.values()).find(item => item.view.webContents === event.sender);
  if (!tab) return { ok: false };
  tab.pendingRiskUrl = null; tab.errorUrl = null;
  await tab.view.webContents.loadURL(targetUrl).catch(() => {});
  return { ok: true };
});
ipcMain.handle("passwords:has-pin", () => !!readPasswordVault());
ipcMain.handle("passwords:set-pin", (_event, pin) => {
  if (typeof pin !== "string" || !/^\d{4,12}$/.test(pin)) return { ok: false, message: "Use a separate 4–12 digit Password Manager PIN." };
  if (!safeStorage.isEncryptionAvailable()) return { ok: false, message: "Windows secure storage is not available." };
  if (readPasswordVault()) return { ok: false, message: "The Password Manager is already set up." };
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(pin, salt, 32).toString("hex");
  const ok = writePasswordVault({ version: 1, pinSalt: salt, pinHash: hash, encryptedEntries: safeStorage.encryptString("[]").toString("base64") });
  if (ok) { if (pendingPasswordCandidate) { const candidate = pendingPasswordCandidate; pendingPasswordCandidate = null; setTimeout(() => handleCredentialCandidate(candidate), 150); } return { ok: true }; }
  return { ok: false, message: "Could not create the encrypted password vault." };
});
ipcMain.handle("passwords:get", (_event, pin) => {
  const vault = readPasswordVault(); if (!verifyVaultPin(pin, vault)) return { ok: false, message: "Incorrect Password Manager PIN." };
  return { ok: true, entries: readVaultEntries(vault) };
});
ipcMain.handle("passwords:delete", (_event, pin, id) => {
  const vault = readPasswordVault(); if (!verifyVaultPin(pin, vault)) return { ok: false, message: "Incorrect Password Manager PIN." };
  const ok = writeVaultEntries(readVaultEntries(vault).filter(entry => entry.id !== id), vault); if (ok) sendPasswordVaultChanged(); return { ok };
});
ipcMain.handle("passwords:copy", (_event, pin, id) => {
  const vault = readPasswordVault(); if (!verifyVaultPin(pin, vault)) return { ok: false, message: "Incorrect Password Manager PIN." };
  const entry = readVaultEntries(vault).find(row => row.id === id); if (!entry) return { ok: false, message: "Password not found." };
  clipboard.writeText(entry.password); return { ok: true };
});
ipcMain.handle("passwords:open-url", async (_event, url) => {
  try { const parsed = new URL(url); if (!["http:", "https:"].includes(parsed.protocol)) return { ok: false }; return { ok: true, tabId: openTab(parsed.href, true) }; }
  catch { return { ok: false }; }
});
ipcMain.handle("browser:blocked-notifications:get", () => getBlockedNotificationOrigins());
ipcMain.handle("browser:blocked-notifications:unblock", (_event, origin) => {
  if (typeof origin !== "string") return { ok: false };
  const ok = saveBlockedNotificationOrigins(getBlockedNotificationOrigins().filter(value => value !== origin));
  if (ok && mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send("browser:blocked-notifications-changed");
  return { ok };
});
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
  sendUpdaterState({ status: "downloaded", version: info.version, message: "Update downloaded. Ready to install." });
});
ipcMain.handle("updater:install", () => {
  if (!app.isPackaged) return { ok: false, message: "Updates can be installed from the packaged app." };
  setTimeout(() => autoUpdater.quitAndInstall(), 150);
  return { ok: true };
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
