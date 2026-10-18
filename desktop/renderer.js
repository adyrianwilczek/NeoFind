const tabsElement = document.getElementById("tabs");
const addressInput = document.getElementById("address");
const viewport = document.getElementById("pageViewport");

function renderTabs(state) {
  tabsElement.replaceChildren();
  for (const tab of state.tabs) {
    const item = document.createElement("div");
    item.className = "tab" + (tab.id === state.activeTabId ? " active" : "") + (tab.pinned ? " pinned" : "") + (tab.isPrivate ? " private-tab" : "");
    item.title = (tab.isPrivate ? "Private tab · " : "") + (tab.isHomeTab ? "about:home" : (tab.url || "about:blank"));
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
document.getElementById("go").addEventListener("click", () => window.neoBrowser.navigate(addressInput.value));
document.getElementById("newTab").addEventListener("click", () => { const opensNeoFind = localStorage.getItem("neofind.newTabOpensNeoFind") === "true"; window.neoBrowser.createTab(opensNeoFind ? "https://neofind.pl/" : "about:home"); });
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
  const allowed = ["midnight","ocean","purple","light","aurora","nord","lavender","rose","sunset","ember","forest","sakura","paper","cyber","space","matrix"];
  const value = allowed.includes(theme) ? theme : "midnight";
  document.body.dataset.theme = value;
  themeSelect.value = value;
  try { localStorage.setItem(browserThemeKey, value); } catch {}
}
applyBrowserTheme(localStorage.getItem(browserThemeKey) || "midnight");
themeSelect.addEventListener("change", () => applyBrowserTheme(themeSelect.value));

function setSettingsTab(tab) {
  document.querySelectorAll(".settings-tab").forEach((button) => button.classList.toggle("selected", button.dataset.settingsTab === tab));
  document.getElementById("settingsGeneral").classList.toggle("hidden", tab !== "general");
  document.getElementById("settingsImport").classList.toggle("hidden", tab !== "import");
  document.getElementById("settingsIntegrations").classList.toggle("hidden", tab !== "integrations");
  document.getElementById("settingsHistory").classList.toggle("hidden", tab !== "history");
  document.getElementById("settingsPrivacy").classList.toggle("hidden", tab !== "privacy");
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
const newTabDestination = document.getElementById("newTabDestination");
if (newTabDestination) {
  newTabDestination.value = localStorage.getItem("neofind.newTabOpensNeoFind") === "true" ? "neofind" : "blank";
  newTabDestination.addEventListener("change", () => localStorage.setItem("neofind.newTabOpensNeoFind", newTabDestination.value === "neofind" ? "true" : "false"));
}
  });
});
renderSidebarApps();
document.getElementById("sideNeoAI").addEventListener("click",()=>window.neoBrowser.openNeoAI());
document.getElementById("sideHistory").addEventListener("click",()=>{ renderBrowserHistory(); window.neoBrowser.hideContent(); settingsPanel.classList.remove("hidden"); setSettingsTab("history"); });
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
document.getElementById("sideSettings").addEventListener("click", () => { window.neoBrowser.hideContent(); settingsPanel.classList.remove("hidden"); setSettingsTab("general"); });
function closeSettingsPanel() { settingsPanel.classList.add("hidden"); window.neoBrowser.showContent(); }
document.getElementById("closeSettings").addEventListener("click", closeSettingsPanel);
settingsPanel.addEventListener("click", (event) => { if (event.target === settingsPanel) closeSettingsPanel(); });
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !settingsPanel.classList.contains("hidden")) { closeSettingsPanel(); return; }
  if (!(event.ctrlKey || event.metaKey)) return;
  const key = event.key.toLowerCase();
  if (key === "t" && !event.shiftKey) { event.preventDefault(); document.getElementById("newTab").click(); }
  else if (key === "w") { event.preventDefault(); window.neoBrowser.closeActiveTab(); }
  else if (key === "l") { event.preventDefault(); addressInput.focus(); addressInput.select(); }
  else if (key === "d") { event.preventDefault(); const active = lastTabsState && lastTabsState.tabs.find(tab => tab.id === lastTabsState.activeTabId); if (active) window.neoBrowser.duplicateTab(active.id); }
});
window.neoBrowser.onFocusAddress(() => { addressInput.focus(); addressInput.select(); });
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
  updateStatusElement.textContent = state.message || "Update status changed.";
  if (state.status === "current" && state.version) updateStatusElement.textContent = "Version " + state.version + " is already installed.";
  checkUpdatesButton.disabled = ["checking", "downloading"].includes(state.status);
  checkUpdatesButton.textContent = state.status === "downloading" ? "Downloading..." : state.status === "checking" ? "Checking..." : "Check for updates";
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
