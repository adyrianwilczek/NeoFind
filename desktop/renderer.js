const tabsElement = document.getElementById("tabs");
const addressInput = document.getElementById("address");
const viewport = document.getElementById("pageViewport");

function renderTabs(state) {
  tabsElement.replaceChildren();
  for (const tab of state.tabs) {
    const item = document.createElement("div");
    item.className = "tab" + (tab.id === state.activeTabId ? " active" : "");
    item.title = tab.url || "about:blank";
    item.addEventListener("click", () => window.neoBrowser.switchTab(tab.id));

    const title = document.createElement("span");
    title.className = "tab-title";
    title.textContent = tab.loading ? (tab.title || "Loading") + " ·" : (tab.title || "New Tab");

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
document.getElementById("newTab").addEventListener("click", () => window.neoBrowser.createTab("https://neofind.pl/"));
document.getElementById("back").addEventListener("click", () => window.neoBrowser.back());
document.getElementById("forward").addEventListener("click", () => window.neoBrowser.forward());
document.getElementById("reload").addEventListener("click", () => window.neoBrowser.reload());
document.getElementById("home").addEventListener("click", () => window.neoBrowser.home());
window.neoBrowser.onTabsState(renderTabs);
window.addEventListener("resize", updateViewportBounds);
requestAnimationFrame(updateViewportBounds);
setTimeout(updateViewportBounds, 250);


const settingsPanel = document.getElementById("settingsPanel");
const importStatus = document.getElementById("importStatus");
const bookmarkStoreKey = "neofind.importedBookmarks";

function setSettingsTab(tab) {
  document.querySelectorAll(".settings-tab").forEach((button) => button.classList.toggle("selected", button.dataset.settingsTab === tab));
  document.getElementById("settingsGeneral").classList.toggle("hidden", tab !== "general");
  document.getElementById("settingsImport").classList.toggle("hidden", tab !== "import");
}
function setImportPreset(preset) {
  document.getElementById("importEverything").classList.toggle("selected", preset === "everything");
  document.getElementById("importNoCookies").classList.toggle("selected", preset === "no-cookies");
  document.querySelectorAll('input[name="importData"]').forEach((input) => {
    input.checked = preset === "everything" || (preset === "no-cookies" && input.value !== "cookies");
  });
  importStatus.textContent = preset === "everything"
    ? "All categories selected, including cookies. Only bookmarks can actually be imported in this version."
    : "All categories except cookies selected. Only bookmarks can actually be imported in this version.";
}
document.getElementById("settingsButton").addEventListener("click", () => { settingsPanel.classList.remove("hidden"); setSettingsTab("general"); });
document.getElementById("closeSettings").addEventListener("click", () => settingsPanel.classList.add("hidden"));
settingsPanel.addEventListener("click", (event) => { if (event.target === settingsPanel) settingsPanel.classList.add("hidden"); });
document.addEventListener("keydown", (event) => { if (event.key === "Escape") settingsPanel.classList.add("hidden"); });
document.querySelectorAll(".settings-tab").forEach((button) => button.addEventListener("click", () => setSettingsTab(button.dataset.settingsTab)));
document.getElementById("importEverything").addEventListener("click", () => setImportPreset("everything"));
document.getElementById("importNoCookies").addEventListener("click", () => setImportPreset("no-cookies"));
document.querySelectorAll('input[name="importData"]').forEach((input) => input.addEventListener("change", () => {
  document.getElementById("importEverything").classList.remove("selected");
  document.getElementById("importNoCookies").classList.remove("selected");
  importStatus.textContent = "Custom selection updated. This version currently imports bookmarks only.";
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
    link.addEventListener("click", (event) => { event.preventDefault(); window.neoBrowser.navigate(bookmark.url); settingsPanel.classList.add("hidden"); });
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
