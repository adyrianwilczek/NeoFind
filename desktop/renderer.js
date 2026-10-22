const tabsElement = document.getElementById("tabs");
const addressInput = document.getElementById("address");
const viewport = document.getElementById("pageViewport");

// Native page content is a separate Electron WebContentsView. CSS overlays cannot cover it,
// so every app-owned modal must hide that view while open.
const neoOpenOverlays = new Set();
window.neoSetModalOpen = (key, isOpen) => {
  if (isOpen) neoOpenOverlays.add(key);
  else neoOpenOverlays.delete(key);
  if (neoOpenOverlays.size) window.neoBrowser.hideContent();
  else window.neoBrowser.showContent();
};


function renderTabs(state) {
  tabsElement.replaceChildren();
  for (const tab of state.tabs) {
    const item = document.createElement("div");
    item.className = "tab" + (tab.id === state.activeTabId ? " active" : "") + (tab.pinned ? " pinned" : "") + (tab.isPrivate ? " private-tab" : "");
    item.title = (tab.isPrivate ? "Private tab · " : "") + (tab.url || "about:blank");
    item.draggable = true;
    item.dataset.tabId = String(tab.id);
    item.addEventListener("click", () => window.neoBrowser.switchTab(tab.id));
    item.addEventListener("contextmenu", (event) => { event.preventDefault(); showTabContextMenu(event.clientX, event.clientY, tab); });
    item.addEventListener("dragstart", (event) => { event.dataTransfer.setData("text/plain", String(tab.id)); event.dataTransfer.effectAllowed = "move"; item.classList.add("dragging"); });
    item.addEventListener("dragend", () => { item.classList.remove("dragging"); tabsElement.querySelectorAll(".drag-over").forEach((el) => el.classList.remove("drag-over")); });
    item.addEventListener("dragover", (event) => { event.preventDefault(); item.classList.add("drag-over"); });
    item.addEventListener("dragleave", () => item.classList.remove("drag-over"));
    item.addEventListener("drop", (event) => { event.preventDefault(); item.classList.remove("drag-over"); const from = Number(event.dataTransfer.getData("text/plain")); const to = Number(item.dataset.tabId); if (from && to && from !== to) window.neoBrowser.reorderTabs(from, to); });

    const title = document.createElement("span");
    title.className = "tab-title";
    title.textContent = tab.isHomeTab ? "New Tab" : (tab.loading ? (tab.title || "Loading") + " ·" : (tab.title || "New Tab"));

    const close = document.createElement("button");
    close.className = "tab-close";
    close.type = "button";
    close.textContent = "×";
    close.title = "Close tab";
    close.setAttribute("aria-label", "Close " + (tab.title || "tab"));
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      window.neoBrowser.closeTab(tab.id);
    });
    item.append(title, close);
    tabsElement.append(item);
  }

  const active = state.tabs.find((tab) => tab.id === state.activeTabId);
  if (active && document.activeElement !== addressInput) addressInput.value = active.url || "";
  document.getElementById("back").disabled = !active || !active.canGoBack;
  document.getElementById("forward").disabled = !active || !active.canGoForward;
}


// Tab context menu: duplicate and pin actions live on right-click.
let tabContextTarget = null;
let tabContextMenu = document.getElementById("tabContextMenu");
if (!tabContextMenu) {
  tabContextMenu = document.createElement("div");
  tabContextMenu.id = "tabContextMenu";
  tabContextMenu.className = "tab-context-menu hidden";
  tabContextMenu.setAttribute("role", "menu");
  tabContextMenu.innerHTML = '<button type="button" data-tab-action="duplicate" role="menuitem">Duplicate tab</button><button type="button" data-tab-action="pin" role="menuitem">Pin tab</button>';
  document.body.append(tabContextMenu);
}
function showTabContextMenu(x, y, tab) {
  tabContextTarget = tab;
  const pinAction = tabContextMenu.querySelector('[data-tab-action="pin"]');
  pinAction.textContent = tab.pinned ? "Unpin tab" : "Pin tab";
  tabContextMenu.classList.remove("hidden");
  const width = tabContextMenu.offsetWidth || 180, height = tabContextMenu.offsetHeight || 80;
  tabContextMenu.style.left = Math.max(6, Math.min(x, window.innerWidth - width - 6)) + "px";
  tabContextMenu.style.top = Math.max(6, Math.min(y, window.innerHeight - height - 6)) + "px";
}
tabContextMenu.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-tab-action]");
  if (!button || !tabContextTarget) return;
  const target = tabContextTarget;
  tabContextMenu.classList.add("hidden");
  if (button.dataset.tabAction === "duplicate") await window.neoBrowser.duplicateTab(target.id);
  if (button.dataset.tabAction === "pin") await window.neoBrowser.togglePinTab(target.id);
});
document.addEventListener("click", (event) => { if (!tabContextMenu.contains(event.target)) tabContextMenu.classList.add("hidden"); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") tabContextMenu.classList.add("hidden"); });
window.addEventListener("blur", () => tabContextMenu.classList.add("hidden"));

function updateViewportBounds() {
  const rect = viewport.getBoundingClientRect();
  window.neoBrowser.setBounds({ x: rect.left, y: rect.top, width: rect.width, height: rect.height });
}

document.getElementById("addressForm").addEventListener("submit", (event) => {
  event.preventDefault();
  window.neoBrowser.navigate(addressInput.value);
  addressInput.blur();
});
const sitePermissionsButton = document.getElementById("sitePermissionsButton");
const sitePermissionsOverlay = document.getElementById("sitePermissionsOverlay");
const sitePermissionFields = {
  camera: document.getElementById("permissionCamera"),
  microphone: document.getElementById("permissionMicrophone"),
  geolocation: document.getElementById("permissionGeolocation"),
  notifications: document.getElementById("permissionNotifications")
};
let activeSitePermissionOrigin = "";
function closeSitePermissions() { sitePermissionsOverlay.classList.add("hidden"); window.neoSetModalOpen("site-permissions", false); }
async function openSitePermissions() {
  const status = document.getElementById("sitePermissionsStatus");
  status.textContent = "Loading permissions…";
  sitePermissionsOverlay.classList.remove("hidden"); window.neoSetModalOpen("site-permissions", true);
  try {
    const result = await window.neoBrowser.getSitePermissionsForActiveSite();
    if (!result || !result.ok) {
      activeSitePermissionOrigin = "";
      document.getElementById("sitePermissionsOrigin").textContent = result && result.message ? result.message : "Open a website first.";
      Object.values(sitePermissionFields).forEach(field => { field.value = "ask"; });
      status.textContent = "Navigate to a website to manage its permissions.";
      document.getElementById("saveSitePermissions").disabled = true;
      return;
    }
    activeSitePermissionOrigin = result.origin;
    document.getElementById("sitePermissionsOrigin").textContent = result.origin;
    for (const [key, field] of Object.entries(sitePermissionFields)) field.value = result.permissions[key] || "ask";
    const secure = result.secure;
    sitePermissionFields.camera.disabled = !secure;
    sitePermissionFields.microphone.disabled = !secure;
    status.textContent = secure ? "Changes apply only to this site and reload the current page." : "Camera and microphone can only be allowed on HTTPS or localhost.";
    document.getElementById("saveSitePermissions").disabled = false;
  } catch (error) {
    status.textContent = "Could not load permissions: " + String(error.message || error);
  }
}
sitePermissionsButton.addEventListener("click", openSitePermissions);
document.getElementById("closeSitePermissions").addEventListener("click", closeSitePermissions);
sitePermissionsOverlay.addEventListener("click", event => { if (event.target === sitePermissionsOverlay) closeSitePermissions(); });
document.getElementById("saveSitePermissions").addEventListener("click", async () => {
  const status = document.getElementById("sitePermissionsStatus");
  if (!activeSitePermissionOrigin) return;
  const values = Object.fromEntries(Object.entries(sitePermissionFields).map(([key, field]) => [key, field.value === "ask" ? null : field.value === "allow"]));
  status.textContent = "Saving permissions…";
  const result = await window.neoBrowser.setSitePermissionsForActiveSite(values);
  if (!result || !result.ok) { status.textContent = result && result.message ? result.message : "Could not save permissions."; return; }
  status.textContent = "Saved for " + result.origin + ". Reloading the page…";
  closeSitePermissions();
});
document.getElementById("resetSitePermissions").addEventListener("click", async () => {
  Object.values(sitePermissionFields).forEach(field => { field.value = "ask"; });
  const status = document.getElementById("sitePermissionsStatus");
  if (!activeSitePermissionOrigin) { status.textContent = "Open a website first."; return; }
  const result = await window.neoBrowser.setSitePermissionsForActiveSite({ camera: null, microphone: null, geolocation: null, notifications: null });
  if (!result || !result.ok) status.textContent = result && result.message ? result.message : "Could not reset permissions.";
  else { status.textContent = "Reset to ask."; closeSitePermissions(); }
});
document.getElementById("go").addEventListener("click", () => window.neoBrowser.navigate(addressInput.value));
document.getElementById("newTab").addEventListener("click", () => { const opensNeoFind = localStorage.getItem("neofind.newTabOpensNeoFind") === "true"; window.neoBrowser.createTab(opensNeoFind ? "about:home" : "about:blank"); });
let lastTabsState = null;
document.getElementById("back").addEventListener("click", () => window.neoBrowser.back());
document.getElementById("forward").addEventListener("click", () => window.neoBrowser.forward());
document.getElementById("reload").addEventListener("click", () => window.neoBrowser.reload());
document.getElementById("home").addEventListener("click", () => window.neoBrowser.home());
document.getElementById("brandHome").addEventListener("click", () => window.neoBrowser.home());

window.neoBrowser.onTabsState((state)=>{
  lastTabsState = state;
  renderTabs(state);
  const history=getBrowserHistory(), known=new Set(history.map(item=>item.url));
  if (!isHistorySavingDisabled()) {
    (state.tabs||[]).forEach(tab=>{if(!tab.isPrivate&&tab.url&&/^https?:/i.test(tab.url)&&!known.has(tab.url)){history.unshift({url:tab.url,title:tab.title||tab.url,visitedAt:Date.now()});known.add(tab.url);}});
    if(history.length)localStorage.setItem(browserHistoryKey,JSON.stringify(history.slice(0,1000)));
  }
});
window.addEventListener("resize", updateViewportBounds);
requestAnimationFrame(updateViewportBounds);
setTimeout(updateViewportBounds, 250);


const settingsPanel = document.getElementById("settingsPanel");
const importStatus = document.getElementById("importStatus");
const bookmarkStoreKey = "neofind.importedBookmarks";
const historyStoreKey = "neofind.importedHistory";
const browserThemeKey = "neofind.browserTheme";
const themeSelect = document.getElementById("browserTheme");
function applyBrowserTheme(theme) {
  const allowed = ["midnight","ocean","purple","light","aurora","nord","lavender","rose","sunset","ember","forest","sakura","paper","cyber","space","matrix","prism","neon","candy","galaxy","lava","ice","gold","oceanic","dream","hologram"];
  const value = allowed.includes(theme) ? theme : "midnight";
  document.body.dataset.theme = value;
  themeSelect.value = value;
  try { localStorage.setItem(browserThemeKey, value); } catch {}
}
applyBrowserTheme(localStorage.getItem(browserThemeKey) || "midnight");
themeSelect.addEventListener("change", () => applyBrowserTheme(themeSelect.value));

async function renderBlockedNotifications() {
  const host = document.getElementById("blockedNotificationsList");
  const status = document.getElementById("blockedNotificationsStatus");
  if (!host) return;
  host.replaceChildren();
  let origins = [];
  try { origins = await window.neoBrowser.getBlockedNotificationOrigins(); } catch {}
  if (!Array.isArray(origins) || origins.length === 0) {
    const empty = document.createElement("p"); empty.className = "empty-list";
    empty.textContent = "No websites are blocked from showing notifications."; host.append(empty);
    if (status) status.textContent = ""; return;
  }
  origins.forEach((origin) => {
    const row = document.createElement("div"); row.className = "blocked-notification-row";
    const label = document.createElement("span"); label.textContent = origin;
    const button = document.createElement("button"); button.type = "button"; button.className = "secondary-button"; button.textContent = "Unblock";
    button.addEventListener("click", async () => { button.disabled = true; const result = await window.neoBrowser.unblockNotificationOrigin(origin); if (result && result.ok) await renderBlockedNotifications(); else { button.disabled = false; if (status) status.textContent = "Could not unblock this website."; } });
    row.append(label, button); host.append(row);
  });
  if (status) status.textContent = "Blocked websites cannot show notification prompts until unblocked here.";
}
window.neoBrowser.onBlockedNotificationsChanged(() => renderBlockedNotifications());

function setSettingsTab(tab) {
  document.querySelectorAll(".settings-tab").forEach((button) => button.classList.toggle("selected", button.dataset.settingsTab === tab));
  document.getElementById("settingsGeneral").classList.toggle("hidden", tab !== "general");
  document.getElementById("settingsImport").classList.toggle("hidden", tab !== "import");
  document.getElementById("settingsIntegrations").classList.toggle("hidden", tab !== "integrations");
  document.getElementById("settingsHistory").classList.toggle("hidden", tab !== "history");
  document.getElementById("settingsPrivacy").classList.toggle("hidden", tab !== "privacy");
  if (tab === "general") renderBlockedNotifications();
}


const browserHistoryKey = "neofind.browserHistory";
const disableHistorySavingKey = "neofind.disableHistorySaving";
function isHistorySavingDisabled() { return localStorage.getItem(disableHistorySavingKey) === "true"; }
function getBrowserHistory() { try { const value=JSON.parse(localStorage.getItem(browserHistoryKey)||"[]"); return Array.isArray(value)?value:[]; } catch { return []; } }
function renderBrowserHistory() {
  const host=document.getElementById("browserHistoryList"); if(!host)return; host.replaceChildren();
  const items=getBrowserHistory();
  if(!items.length){host.textContent="No browsing history yet.";return;}
  items.slice(0,300).forEach(entry=>{
    const link=document.createElement("a"); link.href=entry.url; link.textContent=entry.title||entry.url; link.title=entry.url;
    link.addEventListener("click",event=>{event.preventDefault();window.neoBrowser.createTab(entry.url);closeSettingsPanel();}); host.append(link);
  });
}
document.getElementById("clearBrowserHistory").addEventListener("click",()=>{localStorage.removeItem(browserHistoryKey);localStorage.removeItem(historyStoreKey);renderBrowserHistory();});
const disableHistorySavingToggle = document.getElementById("disableHistorySaving");
disableHistorySavingToggle.checked = isHistorySavingDisabled();
disableHistorySavingToggle.addEventListener("change", () => {
  localStorage.setItem(disableHistorySavingKey, disableHistorySavingToggle.checked ? "true" : "false");
  if (disableHistorySavingToggle.checked) { localStorage.removeItem(browserHistoryKey); renderBrowserHistory(); }
  document.getElementById("privacyStatus").textContent = disableHistorySavingToggle.checked
    ? "Browsing history saving is off. Existing local browsing history was cleared."
    : "Browsing history saving is on for regular tabs.";
});
document.getElementById("openIncognito").addEventListener("click", () => {
  window.neoBrowser.createTab("about:home", { private: true });
  document.getElementById("privacyStatus").textContent = "An incognito tab was opened. Close that tab when finished to clear its temporary site data.";
  closeSettingsPanel();
});
document.getElementById("clearBrowserData").addEventListener("click", async () => {
  const status = document.getElementById("privacyStatus"); status.textContent = "Clearing website storage and cache…";
  try { const result = await window.neoBrowser.clearBrowserData(); if (result.ok) { localStorage.removeItem(browserHistoryKey); localStorage.removeItem(historyStoreKey); status.textContent = "Cookies, cache, website storage and local browsing history cleared."; renderBrowserHistory(); } else status.textContent = "Could not clear all data: " + (result.message || "unknown error"); }
  catch (error) { status.textContent = "Could not clear browsing data: " + String(error.message || error); }
});

const sidebarApps = {
  spotify: {label:"Spotify",icon:"♫",url:"https://open.spotify.com/"},
  x: {label:"X",icon:"𝕏",url:"https://x.com/"},
  discord: {label:"Discord",icon:"◉",url:"https://discord.com/app"},
  cyrber: {label:"Cyrber",icon:"C",url:"https://cyrber.com/"},
  github: {label:"GitHub",icon:"⌘",url:"https://github.com/"}
};
const sidebarAppsKey = "neofind.sidebarApps";
function getEnabledSidebarApps() {
  try { const value=JSON.parse(localStorage.getItem(sidebarAppsKey)||"null"); if(value&&typeof value==="object") return value; } catch {}
  return {spotify:true,x:true,discord:true,cyrber:true,github:true};
}
function renderSidebarApps() {
  const host=document.getElementById("sidebarLinks"), enabled=getEnabledSidebarApps();
  host.replaceChildren();
  Object.entries(sidebarApps).forEach(([key,app])=>{
    if(!enabled[key]) return;
    const button=document.createElement("button"); button.type="button"; button.className="side-icon";
    button.title=app.label; button.setAttribute("aria-label","Open "+app.label);
    const icon=document.createElement("span"); icon.textContent=app.icon; button.append(icon);
    button.addEventListener("click",()=>window.neoBrowser.createTab(app.url)); host.append(button);
  });
}
document.querySelectorAll("[data-sidebar-app]").forEach(input=>{
  input.checked=!!getEnabledSidebarApps()[input.dataset.sidebarApp];
  input.addEventListener("change",()=>{
    const enabled=getEnabledSidebarApps(); enabled[input.dataset.sidebarApp]=input.checked;
    localStorage.setItem(sidebarAppsKey,JSON.stringify(enabled)); renderSidebarApps();
  });
});
renderSidebarApps();
const newTabDestination = document.getElementById("newTabDestination");
if (newTabDestination) {
  newTabDestination.value = localStorage.getItem("neofind.newTabOpensNeoFind") === "true" ? "neofind" : "blank";
  newTabDestination.addEventListener("change", () => localStorage.setItem("neofind.newTabOpensNeoFind", newTabDestination.value === "neofind" ? "true" : "false"));
}
document.getElementById("sideNeoAI").addEventListener("click",()=>window.neoBrowser.openNeoAI());
document.getElementById("sideHistory").addEventListener("click",()=>{ renderBrowserHistory(); settingsPanel.classList.remove("hidden"); window.neoSetModalOpen("settings", true); setSettingsTab("history"); });
document.getElementById("sideAccount").addEventListener("click",()=>window.neoBrowser.createTab("https://neofind.pl/?p=profile"));

function setImportPreset(preset) {
  document.getElementById("importEverything").classList.toggle("selected", preset === "everything");
  document.getElementById("importNoCookies").classList.toggle("selected", preset === "no-cookies");
  document.querySelectorAll('input[name="importData"]').forEach((input) => {
    input.checked = preset === "everything" || (preset === "no-cookies" && input.value !== "cookies");
  });
  importStatus.textContent = preset === "everything"
    ? "All categories selected, including cookies. Selected data will be imported only where supported."
    : "All categories except cookies selected. Selected data will be imported only where supported.";
}
document.getElementById("sideSettings").addEventListener("click", () => { settingsPanel.classList.remove("hidden"); window.neoSetModalOpen("settings", true); setSettingsTab("general"); });
function closeSettingsPanel() { settingsPanel.classList.add("hidden"); window.neoSetModalOpen("settings", false); }
document.getElementById("closeSettings").addEventListener("click", closeSettingsPanel);
settingsPanel.addEventListener("click", (event) => { if (event.target === settingsPanel) closeSettingsPanel(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !settingsPanel.classList.contains("hidden")) { closeSettingsPanel(); return; }
  const key = event.key.toLowerCase();
  // NEOFIND_011_KEYBOARD_SHORTCUTS: shortcuts while the browser toolbar has focus.
  if (event.ctrlKey || event.metaKey) {
    if (event.shiftKey && key === "c") { event.preventDefault(); window.neoBrowser.openDevTools(); return; }
    if (key === "u") { event.preventDefault(); settingsPanel.classList.remove("hidden"); window.neoSetModalOpen("settings", true); setSettingsTab("general"); return; }
    if (key === "r") { event.preventDefault(); window.neoBrowser.reload(); return; }
    if (key === "f5") { event.preventDefault(); window.neoBrowser.reload(); return; }
    if (key === "x") { event.preventDefault(); window.neoBrowser.closeActiveTab(); return; }
  }
  if (!(event.ctrlKey || event.metaKey)) return;
  if (key === "t" && !event.shiftKey) { event.preventDefault(); document.getElementById("newTab").click(); }
  else if (key === "w") { event.preventDefault(); window.neoBrowser.closeActiveTab(); }
  else if (key === "l") { event.preventDefault(); addressInput.focus(); addressInput.select(); }
  else if (key === "d") { event.preventDefault(); const active = lastTabsState && lastTabsState.tabs.find(tab => tab.id === lastTabsState.activeTabId); if (active) window.neoBrowser.duplicateTab(active.id); }
});
window.neoBrowser.onContextSearchSelection((text) => {
  addressInput.value = String(text || "");
  addressInput.focus();
  addressInput.select();
});
window.neoBrowser.onContextAskNeoAI((text) => { window.neoBrowser.openNeoAIWithPrompt(String(text || "")); });
window.neoBrowser.onFocusAddress(() => { addressInput.focus(); addressInput.select(); });
window.neoBrowser.onShortcut((action) => {
  if (action === "settings") {
    settingsPanel.classList.remove("hidden");
    window.neoSetModalOpen("settings", true);
    setSettingsTab("general");
  }
});
document.querySelectorAll(".settings-tab").forEach((button) => button.addEventListener("click", () => { setSettingsTab(button.dataset.settingsTab); if (button.dataset.settingsTab === "history") renderBrowserHistory(); }));
document.getElementById("importEverything").addEventListener("click", () => setImportPreset("everything"));
document.getElementById("importNoCookies").addEventListener("click", () => setImportPreset("no-cookies"));
document.querySelectorAll('input[name="importData"]').forEach((input) => input.addEventListener("change", () => {
  document.getElementById("importEverything").classList.remove("selected");
  document.getElementById("importNoCookies").classList.remove("selected");
  importStatus.textContent = "Custom selection updated. Only supported data types will be imported.";
}));
document.getElementById("setDefaultBrowser").addEventListener("click", async () => {
  const status = document.getElementById("defaultBrowserStatus");
  status.textContent = "Opening Windows Default apps settings…";
  try {
    const result = await window.neoBrowser.openDefaultApps();
    status.textContent = result && result.ok
      ? "Windows Settings opened. Find NeoFind Browser and select it as the default for HTTP and HTTPS."
      : "Could not open Windows Settings. Open Settings → Apps → Default apps and search for NeoFind Browser.";
  } catch {
    status.textContent = "Open Windows Settings → Apps → Default apps and search for NeoFind Browser.";
  }
});
function getImportedBookmarks() {
  try { const value = JSON.parse(localStorage.getItem(bookmarkStoreKey) || "[]"); return Array.isArray(value) ? value : []; }
  catch { return []; }
}
function renderImportedBookmarks() {
  const container = document.getElementById("importedBookmarksList");
  const bookmarks = getImportedBookmarks();
  container.replaceChildren(); container.classList.remove("hidden");
  if (!bookmarks.length) { container.textContent = "No imported bookmarks yet."; return; }
  const heading = document.createElement("h3"); heading.textContent = "Imported bookmarks (" + bookmarks.length + ")"; container.append(heading);
  bookmarks.slice(0, 300).forEach((bookmark) => {
    const link = document.createElement("a"); link.href = bookmark.url; link.textContent = bookmark.title || bookmark.url; link.title = bookmark.url;
    link.addEventListener("click", (event) => { event.preventDefault(); window.neoBrowser.navigate(bookmark.url); closeSettingsPanel(); });
    container.append(link);
  });
}
document.getElementById("chooseBookmarksFile").addEventListener("click", async () => {
  try {
    const result = await window.neoBrowser.chooseBookmarksFile();
    if (result.canceled) return;
    const doc = new DOMParser().parseFromString(result.content, "text/html");
    const imported = [];
    doc.querySelectorAll("a[href]").forEach((anchor) => {
      let url; try { url = new URL(anchor.getAttribute("href")); } catch { return; }
      if (!["http:", "https:"].includes(url.protocol)) return;
      imported.push({ title: (anchor.textContent || url.href).trim().slice(0, 300), url: url.href });
    });
    if (!imported.length) { importStatus.textContent = "No valid bookmarks found. Export bookmarks as HTML from your source browser and try again."; return; }
    const merged = new Map(getImportedBookmarks().map((bookmark) => [bookmark.url, bookmark]));
    imported.forEach((bookmark) => merged.set(bookmark.url, bookmark));
    localStorage.setItem(bookmarkStoreKey, JSON.stringify(Array.from(merged.values())));
    importStatus.textContent = "Imported " + imported.length + " bookmarks from " + document.getElementById("sourceBrowser").value + ". Total saved: " + merged.size + ".";
    renderImportedBookmarks();
  } catch (error) { importStatus.textContent = "Could not import bookmarks: " + String(error.message || error); }
});
document.getElementById("showImportedBookmarks").addEventListener("click", renderImportedBookmarks);
document.getElementById("chooseOperaProfile").addEventListener("click", async () => {
  const sourceBrowser = document.getElementById("sourceBrowser").value;
  try {
    const picked = await window.neoBrowser.chooseSourceProfile(sourceBrowser);
    if (picked.canceled) return;
    const selected = {};
    document.querySelectorAll('input[name="importData"]').forEach((input) => { selected[input.value] = input.checked; });
    importStatus.textContent = "Reading " + sourceBrowser + " profile…";
    const result = await window.neoBrowser.importSourceProfile(sourceBrowser, picked.profilePath, selected);
    if (selected.bookmarks && result.bookmarks.length) {
      const merged = new Map(getImportedBookmarks().map((bookmark) => [bookmark.url, bookmark]));
      result.bookmarks.forEach((bookmark) => merged.set(bookmark.url, bookmark));
      localStorage.setItem(bookmarkStoreKey, JSON.stringify(Array.from(merged.values())));
    }
    if (selected.history && result.history.length) {
      let existing = [];
      try { existing = JSON.parse(localStorage.getItem(historyStoreKey) || "[]"); } catch {}
      const merged = new Map(existing.map((item) => [item.url, item]));
      result.history.forEach((item) => merged.set(item.url, item));
      localStorage.setItem(historyStoreKey, JSON.stringify(Array.from(merged.values()).slice(0, 20000)));
    }
    const summary = [];
    if (selected.bookmarks) summary.push("bookmarks: " + result.bookmarks.length);
    if (selected.history) summary.push("history: " + result.history.length);
    if (selected.settings && result.settingsFound) summary.push("settings detected, not applied");
    if (selected.extensions && result.extensionsFound) summary.push("extensions found: " + result.extensionsFound + " (not installed)");
    if (selected.cookies && result.cookiesFound) summary.push("cookies detected but not copied");
    importStatus.textContent = sourceBrowser + " import finished. " + summary.join(" · ") + (result.notes.length ? " | " + result.notes.join(" ") : "");
    renderImportedBookmarks();
    renderImportedHistory();
  } catch (error) { importStatus.textContent = sourceBrowser + " import failed: " + String(error.message || error); }
});
function renderImportedHistory() {
  const container = document.getElementById("importedHistoryList");
  if (!container) return;
  let history = [];
  try { history = JSON.parse(localStorage.getItem(historyStoreKey) || "[]"); } catch {}
  container.replaceChildren();
  container.classList.remove("hidden");
  const heading = document.createElement("h3");
  heading.textContent = "Imported browsing history (" + history.length + ")";
  container.append(heading);
  if (!history.length) { container.append(document.createTextNode("No imported history yet.")); return; }
  history.slice(0, 100).forEach((entry) => {
    const link = document.createElement("a");
    link.href = entry.url;
    link.textContent = entry.title || entry.url;
    link.title = entry.url;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      window.neoBrowser.navigate(entry.url);
      closeSettingsPanel();
    });
    container.append(link);
  });
}

setImportPreset("no-cookies");


const updateStatusElement = document.getElementById("updateStatus");
const checkUpdatesButton = document.getElementById("checkUpdatesButton");
window.neoBrowser.getVersion().then((version) => { document.getElementById("appVersion").textContent = "Installed version: " + version; }).catch(() => {});
window.neoBrowser.onUpdaterState((state) => {
  window.__neoLastUpdaterState = state;
  updateStatusElement.textContent = state.message || "Update status changed.";
  if (state.status === "current" && state.version) updateStatusElement.textContent = "Version " + state.version + " is already installed.";
  checkUpdatesButton.disabled = ["checking", "downloading"].includes(state.status);
  checkUpdatesButton.textContent = state.status === "downloaded" ? "Install update" : state.status === "downloading" ? "Downloading..." : state.status === "checking" ? "Checking..." : "Check for updates";
  window.dispatchEvent(new CustomEvent("neo-updater-state", { detail: state }));
});
checkUpdatesButton.addEventListener("click", async () => {
  checkUpdatesButton.disabled = true;
  updateStatusElement.textContent = "Checking GitHub Releases...";
  try {
    const result = await window.neoBrowser.checkForUpdates();
    if (result && result.message && result.status !== "checking") updateStatusElement.textContent = result.message;
  } catch (error) { updateStatusElement.textContent = "Could not check for updates: " + String(error.message || error); }
  finally { checkUpdatesButton.disabled = false; }
});


/* NeoFind Browser 0.1.12: interface languages EN / PL / ES. */
const browserLanguageKey = "neofind.browserLanguage";
const languageSelect = document.getElementById("browserLanguage");
const languageText = {
  "Open NeoFind home": ["Otwórz stronę główną NeoFind", "Abrir inicio de NeoFind"],
  "New tab": ["Nowa karta", "Nueva pestaña"],
  "Back": ["Wstecz", "Atrás"],
  "Forward": ["Dalej", "Adelante"],
  "Reload": ["Odśwież", "Recargar"],
  "NeoFind home": ["Strona główna NeoFind", "Inicio de NeoFind"],
  "Search NeoFind or enter an address": ["Szukaj w NeoFind lub wpisz adres", "Busca en NeoFind o escribe una dirección"],
  "Go": ["Przejdź", "Ir"],
  "NeoFind sidebar": ["Panel boczny NeoFind", "Barra lateral de NeoFind"],
  "History": ["Historia", "Historial"],
  "Account": ["Konto", "Cuenta"],
  "Settings": ["Ustawienia", "Configuración"],
  "Close settings": ["Zamknij ustawienia", "Cerrar configuración"],
  "General": ["Ogólne", "General"],
  "Import": ["Importuj", "Importar"],
  "Sidebar apps": ["Aplikacje panelu bocznego", "Aplicaciones de la barra lateral"],
  "Privacy & security": ["Prywatność i bezpieczeństwo", "Privacidad y seguridad"],
  "Manage your NeoFind Browser preferences.": ["Zarządzaj ustawieniami NeoFind Browser.", "Administra las preferencias de NeoFind Browser."],
  "Interface language": ["Język interfejsu", "Idioma de la interfaz"],
  "Choose the language used by NeoFind Browser.": ["Wybierz język interfejsu NeoFind Browser.", "Elige el idioma de NeoFind Browser."],
  "English (EN)": ["English (EN)", "English (EN)"],
  "Polski (PL)": ["Polski (PL)", "Polski (PL)"],
  "Español (ES)": ["Español (ES)", "Español (ES)"],
  "Browser updates": ["Aktualizacje przeglądarki", "Actualizaciones del navegador"],
  "Checking installed version...": ["Sprawdzanie zainstalowanej wersji...", "Comprobando la versión instalada..."],
  "Updates are checked automatically when the app starts.": ["Aktualizacje są sprawdzane automatycznie po uruchomieniu aplikacji.", "Las actualizaciones se comprueban automáticamente al iniciar la aplicación."],
  "Check for updates": ["Sprawdź aktualizacje", "Buscar actualizaciones"],
  "Default browser": ["Domyślna przeglądarka", "Navegador predeterminado"],
  "Set NeoFind Browser as the app that opens web links in Windows.": ["Ustaw NeoFind Browser jako aplikację otwierającą linki w systemie Windows.", "Configura NeoFind Browser como la aplicación que abre enlaces en Windows."],
  "Set as default": ["Ustaw jako domyślną", "Establecer como predeterminado"],
  "Browser theme": ["Motyw przeglądarki", "Tema del navegador"],
  "Choose a theme for the browser chrome and tabs.": ["Wybierz motyw interfejsu i kart przeglądarki.", "Elige un tema para la interfaz y las pestañas del navegador."],
  "New tab": ["Nowa karta", "Nueva pestaña"],
  "Choose whether a new tab stays blank (tooltip: about:home) or opens NeoFind.": ["Wybierz, czy nowa karta ma być pusta (about:home), czy otwierać NeoFind.", "Elige si una pestaña nueva queda vacía (about:home) o abre NeoFind."],
  "Blank tab (about:home)": ["Pusta karta (about:home)", "Pestaña vacía (about:home)"],
  "NeoFind (neofind.pl)": ["NeoFind (neofind.pl)", "NeoFind (neofind.pl)"],
  "Choose which icons appear on the left. Clicking an icon opens that website in a new tab.": ["Wybierz ikony wyświetlane po lewej stronie. Kliknięcie ikony otwiera stronę w nowej karcie.", "Elige qué iconos aparecen a la izquierda. Al pulsar un icono, el sitio se abre en una pestaña nueva."],
  "Control what NeoFind Browser stores on this device.": ["Kontroluj, jakie dane NeoFind Browser zapisuje na tym urządzeniu.", "Controla qué datos guarda NeoFind Browser en este dispositivo."],
  "Do not save browsing history": ["Nie zapisuj historii przeglądania", "No guardar el historial de navegación"],
  "When enabled, new visits are not added to NeoFind Browser history. This does not erase history imported from another browser.": ["Po włączeniu nowe odwiedziny nie są dodawane do historii NeoFind Browser. Nie usuwa to historii zaimportowanej z innej przeglądarki.", "Al activarlo, las nuevas visitas no se añaden al historial de NeoFind Browser. No elimina el historial importado de otro navegador."],
  "Enabled": ["Włączone", "Activado"],
  "Incognito mode": ["Tryb incognito", "Modo incógnito"],
  "Open a private tab. Its browsing history, cookies and site data are not kept after you close the tab. Websites, your network administrator and your internet provider may still see activity.": ["Otwórz kartę prywatną. Po jej zamknięciu historia, pliki cookie i dane stron nie zostaną zachowane. Strony, administrator sieci i dostawca internetu mogą nadal widzieć aktywność.", "Abre una pestaña privada. Al cerrarla, no se conservan el historial, las cookies ni los datos de los sitios. Las páginas, el administrador de red y el proveedor de internet aún podrían ver la actividad."],
  "Open incognito tab": ["Otwórz kartę incognito", "Abrir pestaña de incógnito"],
  "Clear browsing data": ["Wyczyść dane przeglądania", "Borrar datos de navegación"],
  "Clear cookies, cache and website storage for the regular browser session.": ["Wyczyść pliki cookie, pamięć podręczną i dane stron zwykłej sesji przeglądarki.", "Borra las cookies, la caché y el almacenamiento de sitios de la sesión normal."],
  "Clear data": ["Wyczyść dane", "Borrar datos"],
  "Permission requests from supported websites are shown for approval.": ["Prośby o uprawnienia obsługiwanych stron są wyświetlane do zatwierdzenia.", "Las solicitudes de permisos de sitios compatibles se muestran para su aprobación."],
  "Connection safety": ["Bezpieczeństwo połączenia", "Seguridad de la conexión"],
  "Use HTTPS for websites that support it. A secure connection does not guarantee that a website itself is trustworthy.": ["Korzystaj z HTTPS, gdy strona go obsługuje. Bezpieczne połączenie nie gwarantuje, że sama strona jest godna zaufania.", "Usa HTTPS cuando el sitio lo admita. Una conexión segura no garantiza que el sitio sea fiable."],
  "Pages visited in NeoFind Browser on this device.": ["Strony odwiedzone w NeoFind Browser na tym urządzeniu.", "Páginas visitadas en NeoFind Browser en este dispositivo."],
  "Clear history": ["Wyczyść historię", "Borrar historial"],
  "Import browser data": ["Importuj dane przeglądarki", "Importar datos del navegador"],
  "Move selected information from another browser into NeoFind Browser.": ["Przenieś wybrane informacje z innej przeglądarki do NeoFind Browser.", "Transfiere información seleccionada desde otro navegador a NeoFind Browser."],
  "Source browser": ["Przeglądarka źródłowa", "Navegador de origen"],
  "Everything": ["Wszystko", "Todo"],
  "Select all categories, including cookies.": ["Zaznacz wszystkie kategorie, w tym pliki cookie.", "Selecciona todas las categorías, incluidas las cookies."],
  "Everything except cookies": ["Wszystko oprócz plików cookie", "Todo excepto las cookies"],
  "Select all categories except cookies.": ["Zaznacz wszystkie kategorie oprócz plików cookie.", "Selecciona todas las categorías excepto las cookies."],
  "Bookmarks": ["Zakładki", "Marcadores"],
  "Saved websites and folders": ["Zapisane strony i foldery", "Sitios y carpetas guardados"],
  "Browsing history": ["Historia przeglądania", "Historial de navegación"],
  "Previously visited pages": ["Wcześniej odwiedzone strony", "Páginas visitadas anteriormente"],
  "Saved passwords": ["Zapisane hasła", "Contraseñas guardadas"],
  "Sensitive login information": ["Poufne dane logowania", "Información de inicio de sesión confidencial"],
  "Autofill data": ["Dane autouzupełniania", "Datos de autocompletado"],
  "Addresses and form details": ["Adresy i dane formularzy", "Direcciones y datos de formularios"],
  "Browser settings": ["Ustawienia przeglądarki", "Configuración del navegador"],
  "Preferences, where supported": ["Preferencje, jeśli obsługiwane", "Preferencias, si son compatibles"],
  "Extensions": ["Rozszerzenia", "Extensiones"],
  "May need to be installed again": ["Może być konieczna ponowna instalacja", "Puede que deban instalarse de nuevo"],
  "Cookies and website sessions": ["Pliki cookie i sesje stron", "Cookies y sesiones de sitios web"],
  "Can transfer active sign-in sessions. Only select if you trust this device.": ["Mogą przenieść aktywne sesje logowania. Zaznacz tylko, jeśli ufasz temu urządzeniu.", "Pueden transferir sesiones activas. Selecciónalo solo si confías en este dispositivo."],
  "Import availability in this version": ["Dostępność importu w tej wersji", "Disponibilidad de importación en esta versión"],
  "Chrome, Edge, Brave, Opera, Opera GX and Firefox profiles can import bookmarks and history. Passwords, autofill, browser preferences, extensions and active cookies are detected where possible but are not automatically migrated.": ["Z profili Chrome, Edge, Brave, Opera, Opera GX i Firefox można importować zakładki i historię. Hasła, autouzupełnianie, preferencje, rozszerzenia i aktywne pliki cookie mogą zostać wykryte, ale nie są automatycznie przenoszone.", "Desde los perfiles de Chrome, Edge, Brave, Opera, Opera GX y Firefox se pueden importar marcadores e historial. Las contraseñas, el autocompletado, las preferencias, las extensiones y las cookies activas pueden detectarse, pero no se migran automáticamente."],
  "Import selected browser profile…": ["Importuj wybrany profil przeglądarki…", "Importar perfil del navegador…"],
  "Choose bookmarks HTML…": ["Wybierz plik HTML zakładek…", "Elegir HTML de marcadores…"],
  "View imported bookmarks": ["Wyświetl zaimportowane zakładki", "Ver marcadores importados"],
  "Choose a preset or customize the categories.": ["Wybierz ustawienie lub dostosuj kategorie.", "Elige una opción predefinida o personaliza las categorías."],
  "Open NeoFind home": ["Otwórz stronę główną NeoFind", "Abrir inicio de NeoFind"],
  "Duplicate tab": ["Duplikuj kartę", "Duplicar pestaña"],
  "Pin tab": ["Przypnij kartę", "Fijar pestaña"],
  "Unpin tab": ["Odepnij kartę", "Desfijar pestaña"],
  "Close tab": ["Zamknij kartę", "Cerrar pestaña"],
  "New Tab": ["Nowa karta", "Nueva pestaña"],
  "Loading": ["Ładowanie", "Cargando"],
  "No browsing history yet.": ["Brak historii przeglądania.", "Aún no hay historial de navegación."],
  "Browsing history saving is off. Existing local browsing history was cleared.": ["Zapisywanie historii jest wyłączone. Lokalna historia została wyczyszczona.", "El guardado del historial está desactivado. Se borró el historial local existente."],
  "Browsing history saving is on for regular tabs.": ["Zapisywanie historii jest włączone dla zwykłych kart.", "El guardado del historial está activado para pestañas normales."],
  "An incognito tab was opened. Close that tab when finished to clear its temporary site data.": ["Otwarto kartę incognito. Zamknij ją po zakończeniu, aby usunąć tymczasowe dane stron.", "Se abrió una pestaña de incógnito. Ciérrala al terminar para borrar los datos temporales de los sitios."],
  "Clearing website storage and cache…": ["Czyszczenie danych stron i pamięci podręcznej…", "Borrando el almacenamiento de sitios y la caché…"],
  "Cookies, cache, website storage and local browsing history cleared.": ["Wyczyszczono pliki cookie, pamięć podręczną, dane stron i lokalną historię.", "Se borraron las cookies, la caché, los datos de sitios y el historial local."],
  "Could not clear browsing data: ": ["Nie udało się wyczyścić danych przeglądania: ", "No se pudieron borrar los datos de navegación: "],
  "Could not clear all data: ": ["Nie udało się wyczyścić wszystkich danych: ", "No se pudieron borrar todos los datos: "],
  "Custom selection updated. Only supported data types will be imported.": ["Zmieniono wybór. Zostaną zaimportowane tylko obsługiwane typy danych.", "Selección actualizada. Solo se importarán los tipos de datos compatibles."],
  "Opening Windows Default apps settings…": ["Otwieranie ustawień aplikacji domyślnych Windows…", "Abriendo la configuración de aplicaciones predeterminadas de Windows…"],
  "Checking GitHub Releases...": ["Sprawdzanie wydań GitHub...", "Comprobando las versiones de GitHub..."],
  "Downloading...": ["Pobieranie...", "Descargando..."],
  "Checking...": ["Sprawdzanie...", "Comprobando..."],
  "Check for updates": ["Sprawdź aktualizacje", "Buscar actualizaciones"],
  "Update status changed.": ["Zmieniono stan aktualizacji.", "El estado de actualización ha cambiado."],
  "No imported bookmarks yet.": ["Brak zaimportowanych zakładek.", "Aún no hay marcadores importados."],
  "No imported history yet.": ["Brak zaimportowanej historii.", "Aún no hay historial importado."],
  "Installed version: ": ["Zainstalowana wersja: ", "Versión instalada: "],
  "Version ": ["Wersja ", "Versión "],
  " is already installed.": [" jest już zainstalowana.", " ya está instalada."],
  "Private tab · ": ["Karta prywatna · ", "Pestaña privada · "],
  "Open ": ["Otwórz ", "Abrir "],
  "Choose between a completely empty tab and NeoFind as your new-tab page. NeoFind home tabs keep the internal name “New Tab” and address “about:home”.": ["Wybierz całkowicie pustą kartę albo NeoFind jako stronę nowej karty. Karty NeoFind mają wewnętrzną nazwę „New Tab” i adres „about:home”.", "Elige una pestaña completamente vacía o NeoFind como página de nueva pestaña. Las pestañas de inicio de NeoFind mantienen el nombre interno “New Tab” y la dirección “about:home”."],
  "Completely empty tab (about:blank)": ["Całkowicie pusta karta (about:blank)", "Pestaña completamente vacía (about:blank)"],
  "NeoFind home (about:home)": ["Strona główna NeoFind (about:home)", "Inicio de NeoFind (about:home)"],
  "Blocked notifications": ["Zablokowane komunikaty", "Notificaciones bloqueadas"],
  "Websites listed here cannot show notification prompts. You can undo the block at any time.": ["Wymienione strony nie mogą wyświetlać próśb o zgodę na komunikaty. Możesz cofnąć blokadę w dowolnym momencie.", "Los sitios de esta lista no pueden mostrar solicitudes de notificaciones. Puedes quitar el bloqueo cuando quieras."],
  "No websites are blocked from showing notifications.": ["Żadna strona nie ma zablokowanych komunikatów.", "Ningún sitio tiene bloqueadas las notificaciones."],
  "Unblock": ["Odblokuj", "Desbloquear"],
  "Blocked websites cannot show notification prompts until unblocked here.": ["Zablokowane strony nie mogą wyświetlać próśb o komunikaty, dopóki nie zostaną tutaj odblokowane.", "Los sitios bloqueados no pueden mostrar solicitudes de notificaciones hasta que se desbloqueen aquí."],
  "Could not unblock this website.": ["Nie udało się odblokować tej strony.", "No se pudo desbloquear este sitio."],
  "Downloads": ["Pobrane pliki", "Descargas"],
  "Password Manager": ["Menedżer haseł", "Gestor de contraseñas"],
  "Files downloaded in NeoFind Browser, including the website they came from.": ["Pliki pobrane w NeoFind Browser wraz ze stroną, z której pochodzą.", "Archivos descargados en NeoFind Browser, incluido el sitio de origen."],
  "Clear download history": ["Wyczyść historię pobierania", "Borrar historial de descargas"],
  "Passwords are encrypted locally. Create a separate Password Manager PIN. Do not use your Windows sign-in PIN here.": ["Hasła są szyfrowane lokalnie. Utwórz osobny PIN Menedżera haseł. Nie używaj tutaj PIN-u logowania Windows.", "Las contraseñas se cifran localmente. Crea un PIN independiente para el gestor de contraseñas. No uses aquí tu PIN de Windows."],
  "Create PIN (4–12 digits)": ["Utwórz PIN (4–12 cyfr)", "Crear PIN (4–12 dígitos)"],
  "Password Manager PIN": ["PIN Menedżera haseł", "PIN del gestor de contraseñas"],
  "Update ready": ["Aktualizacja gotowa", "Actualización lista"],
  "A new update is available.": ["Dostępna jest nowa aktualizacja.", "Hay una nueva actualización disponible."],
  "Not now": ["Nie teraz", "Ahora no"],
  "Update": ["Aktualizuj", "Actualizar"],
  "Open": ["Otwórz", "Abrir"],
  "Show in folder": ["Pokaż w folderze", "Mostrar en carpeta"],
  "Show password": ["Pokaż hasło", "Mostrar contraseña"],
  "Hide password": ["Ukryj hasło", "Ocultar contraseña"],
  "Copy password": ["Kopiuj hasło", "Copiar contraseña"],
  "Open website": ["Otwórz stronę", "Abrir sitio web"],
  "Delete": ["Usuń", "Eliminar"],
  "Site permissions": ["Uprawnienia witryn", "Permisos de sitios"],
  "Review remembered Allow and Deny choices for location, notifications and other supported permissions.": ["Sprawdź zapamiętane zgody i odmowy dotyczące lokalizacji, komunikatów i innych uprawnień.", "Revisa las decisiones guardadas de permitir y denegar ubicación, notificaciones y otros permisos."],
  "No remembered site permission choices.": ["Brak zapamiętanych uprawnień witryn.", "No hay decisiones de permisos guardadas."],
  "Remembered site permissions. Remove a choice to make NeoFind ask again.": ["Zapamiętane uprawnienia witryn. Usuń decyzję, aby NeoFind zapytał ponownie.", "Permisos de sitios guardados. Elimina una decisión para que NeoFind vuelva a preguntar."],
  "Forget": ["Zapomnij", "Olvidar"],
  "Always allow": ["Zawsze zezwalaj", "Permitir siempre"],
  "Always deny": ["Zawsze odmawiaj", "Denegar siempre"],
  "Always allow this site for this permission": ["Zawsze zezwalaj tej stronie na to uprawnienie", "Permitir siempre este permiso a este sitio"],
  "Website permission": ["Uprawnienie witryny", "Permiso del sitio"],
  "Deny": ["Odmów", "Denegar"],
  "Allow": ["Zezwól", "Permitir"],
  "Open page !HIGH RISK!": ["Otwórz stronę !WYSOKIE RYZYKO!", "Abrir página ¡ALTO RIESGO!"],
  "This site is blocked": ["Ta strona jest zablokowana", "Este sitio está bloqueado"],
  "Neo cannot find this page": ["Neo nie może odnaleźć tej strony", "Neo no puede encontrar esta página"],
  "Check whether there is a mistake in this address:": ["Sprawdź, czy w tym adresie nie ma błędu:", "Comprueba si hay un error en esta dirección:"],
  "Go back": ["Wróć", "Volver"],
  "Try again": ["Spróbuj ponownie", "Intentar de nuevo"]
};
const languageAttributeRecords = new WeakMap();
const languageTextRecords = new WeakMap();
function getBrowserLanguage() {
  const saved = localStorage.getItem(browserLanguageKey);
  return ["en", "pl", "es", "fr"].includes(saved) ? saved : "en";
}
const frenchUiText = {
"Open NeoFind home":"Ouvrir l’accueil NeoFind","New tab":"Nouvel onglet","Back":"Précédent","Forward":"Suivant","Reload":"Actualiser","NeoFind home":"Accueil NeoFind","Search NeoFind or enter an address":"Rechercher avec NeoFind ou saisir une adresse","Go":"Aller","History":"Historique","Account":"Compte","Settings":"Paramètres","General":"Général","Downloads":"Téléchargements","Password Manager":"Gestionnaire de mots de passe","Import":"Importer","Sidebar apps":"Applications latérales","Privacy & security":"Confidentialité et sécurité","Interface language":"Langue de l’interface","Browser theme":"Thème du navigateur","Update ready":"Mise à jour prête","A new update is available.":"Une nouvelle mise à jour est disponible.","Not now":"Plus tard","Update":"Mettre à jour","Open":"Ouvrir","Show in folder":"Afficher dans le dossier","Show password":"Afficher le mot de passe","Hide password":"Masquer le mot de passe","Copy password":"Copier le mot de passe","Delete":"Supprimer","Allow":"Autoriser","Deny":"Refuser","Blocked notifications":"Notifications bloquées","Site permissions":"Autorisations des sites","This site is blocked":"Ce site est bloqué","Neo cannot find this page":"Neo ne trouve pas cette page","Check whether there is a mistake in this address:":"Vérifiez si cette adresse contient une erreur :","Go back":"Retour"
};
function translateUiText(value, language) {
  if (language === "en") return value;
  if (language === "fr") { const trimmed = value.trim(); return frenchUiText[trimmed] ? value.replace(trimmed, frenchUiText[trimmed]) : value; }
  const trimmed = value.trim();
  if (languageText[trimmed]) {
    const translated = languageText[trimmed][language === "pl" ? 0 : 1];
    return value.replace(trimmed, translated);
  }
  if (trimmed.startsWith("Imported bookmarks (") && trimmed.endsWith(")")) return value.replace(trimmed, (language === "pl" ? "Zaimportowane zakładki (" : "Marcadores importados (") + trimmed.slice(20));
  if (trimmed.startsWith("Imported browsing history (") && trimmed.endsWith(")")) return value.replace(trimmed, (language === "pl" ? "Zaimportowana historia przeglądania (" : "Historial de navegación importado (") + trimmed.slice(27));
  if (trimmed.startsWith("Could not clear all data: ")) return value.replace("Could not clear all data: ", language === "pl" ? "Nie udało się wyczyścić wszystkich danych: " : "No se pudieron borrar todos los datos: ");
  if (trimmed.startsWith("Could not clear browsing data: ")) return value.replace("Could not clear browsing data: ", language === "pl" ? "Nie udało się wyczyścić danych przeglądania: " : "No se pudieron borrar los datos de navegación: ");
  return value;
}
function applyBrowserLanguage(language) {
  const chosen = ["en", "pl", "es", "fr"].includes(language) ? language : "en";
  document.documentElement.lang = chosen;
  document.querySelectorAll("body *").forEach((element) => {
    for (const attribute of ["title", "placeholder", "aria-label"]) {
      if (!element.hasAttribute(attribute)) continue;
      let record = languageAttributeRecords.get(element);
      if (!record) { record = {}; languageAttributeRecords.set(element, record); }
      if (!(attribute in record) || element.getAttribute(attribute) !== record[attribute].last) {
        record[attribute] = { original: element.getAttribute(attribute), last: element.getAttribute(attribute) };
      }
      const entry = record[attribute];
      const translated = translateUiText(entry.original, chosen);
      element.setAttribute(attribute, translated);
      entry.last = translated;
    }
  });
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.parentElement || ["SCRIPT", "STYLE"].includes(node.parentElement.tagName)) return NodeFilter.FILTER_REJECT;
      return node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    let record = languageTextRecords.get(node);
    if (!record || node.nodeValue !== record.last) {
      record = { original: node.nodeValue, last: node.nodeValue };
      languageTextRecords.set(node, record);
    }
    const translated = translateUiText(record.original, chosen);
    node.nodeValue = translated;
    record.last = translated;
  });
  if (languageSelect) languageSelect.value = chosen;
}
if (languageSelect) {
  languageSelect.value = getBrowserLanguage();
  window.neoBrowser.setBrowserLanguage(getBrowserLanguage()).catch(() => {});
  languageSelect.addEventListener("change", () => {
    localStorage.setItem(browserLanguageKey, languageSelect.value);
    window.neoBrowser.setBrowserLanguage(languageSelect.value).catch(() => {});
    applyBrowserLanguage(languageSelect.value);
  });
}
applyBrowserLanguage(getBrowserLanguage());
const languageObserver = new MutationObserver(() => {
  if (languageObserver._scheduled) return;
  languageObserver._scheduled = true;
  requestAnimationFrame(() => {
    languageObserver._scheduled = false;
    applyBrowserLanguage(getBrowserLanguage());
  });
});
languageObserver.observe(document.body, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ["title", "placeholder", "aria-label"] });

