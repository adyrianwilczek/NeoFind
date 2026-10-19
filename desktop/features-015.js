(() => {
"use strict";
const $ = id => document.getElementById(id);
const permissionModal = $("sitePermissionModal");
const permissionQueue = [];
let currentPermission = null;
function permissionLabel(value) {
  const labels = { geolocation: "access to geolocation", notifications: "show notifications", media: "use your camera or microphone", "clipboard-read": "read clipboard contents", midi: "access MIDI devices", fullscreen: "enter fullscreen mode", pointerLock: "lock the pointer" };
  return labels[value] || ("permission: " + value);
}
function showNextPermission() {
  if (currentPermission || !permissionQueue.length) return;
  currentPermission = permissionQueue.shift();
  $("sitePermissionMessage").textContent = currentPermission.origin + " wants " + permissionLabel(currentPermission.permission) + ".";
  $("sitePermissionDetail").textContent = currentPermission.detail || "Allow only if you trust this website.";
  $("sitePermissionAlways").checked = false;
  permissionModal.classList.remove("hidden");
}
async function answerPermission(decision) {
  if (!currentPermission) return;
  const request = currentPermission;
  const always = $("sitePermissionAlways").checked;
  currentPermission = null;
  permissionModal.classList.add("hidden");
  await window.neoBrowser.respondSitePermission(request.id, decision, always);
  showNextPermission();
}
$("sitePermissionDeny").addEventListener("click", () => answerPermission("deny"));
$("sitePermissionAllow").addEventListener("click", () => answerPermission("allow"));
window.neoBrowser.onSitePermissionRequest(request => { permissionQueue.push(request); showNextPermission(); });
function renderSitePermissions() {
  const host = $("sitePermissionsList"), status = $("sitePermissionsStatus");
  if (!host) return;
  host.replaceChildren();
  window.neoBrowser.getSitePermissions().then(entries => {
    const pairs = Object.entries(entries || {});
    status.textContent = pairs.length ? "Remembered site permissions. Remove a choice to make NeoFind ask again." : "No remembered site permission choices.";
    pairs.forEach(([key, decision]) => {
      const [origin, permission] = key.split("|");
      const row = document.createElement("div"); row.className = "site-permission-row";
      const label = document.createElement("span");
      const title = document.createElement("strong"); title.textContent = origin || "Website";
      const detail = document.createElement("small"); detail.textContent = permissionLabel(permission) + " · " + (decision === "allow" ? "Always allow" : "Always deny");
      label.append(title, detail);
      const button = document.createElement("button"); button.className = "secondary-button"; button.type = "button"; button.textContent = "Forget";
      button.addEventListener("click", async () => { button.disabled = true; const result = await window.neoBrowser.clearSitePermission(key); if (result.ok) renderSitePermissions(); else { button.disabled = false; status.textContent = "Could not remove this permission."; } });
      row.append(label, button); host.append(row);
    });
  }).catch(() => { status.textContent = "Could not load site permissions."; });
}
const baseSetSettingsTab = window.setSettingsTab;
if (typeof baseSetSettingsTab === "function") {
  window.setSettingsTab = function(tab) {
    baseSetSettingsTab(tab);
    if (tab === "general") renderSitePermissions();
  };
}
document.querySelectorAll(".settings-tab").forEach(button => button.addEventListener("click", () => {
  if (button.dataset.settingsTab === "general") renderSitePermissions();
}));
window.neoBrowser.onSitePermissionsChanged(renderSitePermissions);
renderSitePermissions();
})();