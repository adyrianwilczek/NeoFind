(() => {
"use strict";
const $ = (id) => document.getElementById(id);
const settingsPanel = $("settingsPanel");
const originalSetSettingsTab = window.setSettingsTab;
if (typeof originalSetSettingsTab === "function") {
  window.setSettingsTab = function(tab) {
    originalSetSettingsTab(tab);
    $("settingsDownloads").classList.toggle("hidden", tab !== "downloads");
    $("settingsPasswords").classList.toggle("hidden", tab !== "passwords");
    if (tab === "downloads") renderDownloads();
    if (tab === "passwords") openPasswordManager();
  };
}
document.querySelectorAll(".settings-tab").forEach(button => button.addEventListener("click", () => {
  if (button.dataset.settingsTab === "downloads") renderDownloads();
  if (button.dataset.settingsTab === "passwords") openPasswordManager();
}));
window.neoBrowser.onOpenPasswordSettings(() => {
  window.neoBrowser.hideContent(); settingsPanel.classList.remove("hidden"); window.setSettingsTab("passwords");
});
function formatDate(value) { try { return value ? new Date(value).toLocaleString() : ""; } catch { return ""; } }
async function renderDownloads(provided) {
  const host = $("downloadsList"), summary = $("downloadsSummary");
  if (!host) return;
  let items = provided;
  if (!Array.isArray(items)) { try { items = await window.neoBrowser.getDownloadHistory(); } catch { items = []; } }
  host.replaceChildren(); summary.textContent = items.length ? items.length + " downloads" : "No downloads yet.";
  items.forEach(entry => {
    const row = document.createElement("div"); row.className = "download-row";
    const main = document.createElement("div"); main.className = "download-row-main";
    const name = document.createElement("strong"); name.textContent = entry.filename || "Download";
    const source = document.createElement("small"); source.textContent = "From: " + (entry.url || "Unknown website");
    const state = document.createElement("small"); state.textContent = (entry.state || "unknown") + " · " + formatDate(entry.finishedAt || entry.startedAt);
    main.append(name, source, state); row.append(main);
    const actions = document.createElement("div"); actions.className = "download-row-actions";
    if (entry.state === "completed") {
      const open = document.createElement("button"); open.className = "secondary-button"; open.textContent = "Open"; open.addEventListener("click", () => window.neoBrowser.openDownloadedFile(entry.id)); actions.append(open);
      const folder = document.createElement("button"); folder.className = "secondary-button"; folder.textContent = "Show in folder"; folder.addEventListener("click", () => window.neoBrowser.showDownloadedFile(entry.id)); actions.append(folder);
    }
    row.append(actions); host.append(row);
  });
}
$("clearDownloadHistory").addEventListener("click", async () => { await window.neoBrowser.clearDownloadHistory(); renderDownloads([]); });
window.neoBrowser.onDownloadsChanged(items => { if (!$("settingsDownloads").classList.contains("hidden")) renderDownloads(items); });
let activePin = "";
async function openPasswordManager() {
  const hasPin = await window.neoBrowser.hasPasswordManagerPin().catch(() => false);
  $("passwordVaultSetup").classList.toggle("hidden", hasPin);
  $("passwordVaultUnlock").classList.toggle("hidden", !hasPin);
  $("passwordVaultList").replaceChildren(); $("passwordVaultList").classList.add("hidden"); activePin = "";
  $("passwordVaultStatus").textContent = hasPin ? "Enter your separate Password Manager PIN." : "Create a separate 4–12 digit PIN. Do not use your Windows sign-in PIN.";
}
$("createPasswordVaultPin").addEventListener("click", async () => {
  const pin = $("passwordVaultPin").value;
  const result = await window.neoBrowser.setPasswordManagerPin(pin);
  $("passwordVaultStatus").textContent = result.message || (result.ok ? "Password Manager created." : "Could not create Password Manager.");
  if (result.ok) openPasswordManager();
});
$("unlockPasswordVault").addEventListener("click", async () => {
  const pin = $("passwordVaultUnlockPin").value;
  const result = await window.neoBrowser.getSavedPasswords(pin);
  const host = $("passwordVaultList"), status = $("passwordVaultStatus"); host.replaceChildren();
  if (!result.ok) { status.textContent = result.message || "Could not unlock Password Manager."; return; }
  activePin = pin; host.classList.remove("hidden"); status.textContent = result.entries.length + " saved login(s).";
  result.entries.forEach(entry => {
    const card = document.createElement("article"); card.className = "password-entry";
    const main = document.createElement("div"); main.className = "password-entry-main";
    const title = document.createElement("strong"); title.textContent = entry.title || entry.origin;
    const site = document.createElement("small"); site.textContent = entry.origin;
    const username = document.createElement("small"); username.textContent = "Username: " + (entry.username || "(not detected)");
    const password = document.createElement("small"); password.className = "password-reveal hidden"; password.textContent = "Password: " + entry.password;
    main.append(title, site, username, password);
    const actions = document.createElement("div"); actions.className = "password-entry-actions";
    const reveal = document.createElement("button"); reveal.className = "secondary-button"; reveal.textContent = "Show password";
    reveal.addEventListener("click", () => { const hidden = password.classList.toggle("hidden"); reveal.textContent = hidden ? "Show password" : "Hide password"; });
    const copy = document.createElement("button"); copy.className = "secondary-button"; copy.textContent = "Copy password";
    copy.addEventListener("click", async () => { const result = await window.neoBrowser.copySavedPassword(activePin, entry.id); status.textContent = result.ok ? "Password copied to clipboard." : (result.message || "Could not copy password."); });
    const open = document.createElement("button"); open.className = "secondary-button"; open.textContent = "Open website"; open.addEventListener("click", () => window.neoBrowser.openPasswordSite(entry.url || entry.origin));
    const remove = document.createElement("button"); remove.className = "secondary-button"; remove.textContent = "Delete";
    remove.addEventListener("click", async () => { const result = await window.neoBrowser.deleteSavedPassword(activePin, entry.id); if (result.ok) openPasswordManager(); else status.textContent = result.message || "Could not delete password."; });
    actions.append(reveal, copy, open, remove); card.append(main, actions); host.append(card);
  });
});
window.neoBrowser.onPasswordsChanged(() => { if (activePin && !$("settingsPasswords").classList.contains("hidden")) $("unlockPasswordVault").click(); });
let downloadedVersion = "";
$("updateNotNow").addEventListener("click", () => $("updateReadyModal").classList.add("hidden"));
$("updateNow").addEventListener("click", async () => {
  $("updateReadyModal").classList.add("hidden");
  window.neoBrowser.hideContent(); settingsPanel.classList.remove("hidden"); window.setSettingsTab("general");
  $("updateStatus").textContent = downloadedVersion ? "Installing update " + downloadedVersion + "…" : "The update is downloading automatically in the background.";
  if (downloadedVersion) await window.neoBrowser.installUpdate();
});
/* Listen to state updates emitted by the existing updater listener. */
window.addEventListener("neo-updater-state", (event) => {
  const state = event.detail || {};
  if (state.status === "downloaded") downloadedVersion = state.version || "new version";
  if (state.status === "available" || state.status === "downloaded") {
    $("updateReadyMessage").textContent = state.status === "downloaded"
      ? "Version " + (state.version || "new version") + " has downloaded and is ready to install."
      : "Version " + (state.version || "new version") + " is available and downloading automatically.";
    $("updateReadyModal").classList.remove("hidden");
  }
});
})();