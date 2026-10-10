/* NeoFind global update notice */
(function () {
  "use strict";

  const ADMIN_EMAILS = [
    "adrian.wilczek@hotmail.com",
    "michal.szyszynski@outlook.com",
    "account.neofind@gmail.com",
    "support.neofind@gmail.com",
    "michal.wilkowski@outlook.com",
    "michal.wilkowski@gmail.com",
    "j.e.wilkowska@gmail.com"
  ];
  const SETTINGS_PATH = ["system", "updateAnnouncement"];
  const STYLE_ID = "neo-update-notice-style";
  let activeReleaseId = null;
  let announcementEnabled = false;
  let dbRef = null;
  let authRef = null;
  let initialized = false;

  const isAdmin = user => !!user && ADMIN_EMAILS.includes(String(user.email || "").toLowerCase());
  const getDb = () => {
    try {
      if (typeof db !== "undefined" && db) return db;
      if (window.firebase && window.firebase.firestore) return window.firebase.firestore();
    } catch (e) { console.warn("NeoFind update notice: Firestore unavailable", e); }
    return null;
  };
  const getAuth = () => {
    try {
      if (typeof auth !== "undefined" && auth) return auth;
      if (window.firebase && window.firebase.auth) return window.firebase.auth();
    } catch (e) { console.warn("NeoFind update notice: Auth unavailable", e); }
    return null;
  };

  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #neoUpdateNotice{display:flex;align-items:center;gap:9px;flex-wrap:wrap;margin:10px 0 0;padding:10px 12px;border:1px solid rgba(0,242,254,.35);border-radius:12px;background:linear-gradient(120deg,rgba(0,242,254,.10),rgba(79,172,254,.08));color:#eafcff;font:500 13px/1.4 'Oxanium',sans-serif;box-shadow:0 0 18px rgba(0,242,254,.08)}
      #neoUpdateNotice .neo-update-title{font-weight:700;color:#00f2fe}
      #neoUpdateNotice button,#neoUpdateAdminPanel button{border:1px solid rgba(0,242,254,.5);border-radius:8px;padding:7px 11px;background:rgba(0,242,254,.12);color:#fff;cursor:pointer;font:600 12px 'Oxanium',sans-serif}
      #neoUpdateNotice button:hover,#neoUpdateAdminPanel button:hover{background:rgba(0,242,254,.23)}
      #neoUpdateAdminPanel{margin:16px 0;padding:14px;border:1px solid rgba(0,242,254,.28);border-radius:12px;background:rgba(0,20,30,.65);color:#fff;font:13px/1.5 'Oxanium',sans-serif}
      #neoUpdateAdminPanel label{display:flex;align-items:center;gap:10px;cursor:pointer}
      #neoUpdateAdminPanel input[type=checkbox]{width:17px;height:17px;accent-color:#00f2fe}
      #neoUpdateAdminStatus{display:block;margin-top:8px;color:#9ccbd2}
    `;
    document.head.appendChild(style);
  }

  function findNeoSocialAnchor() {
    const candidates = Array.from(document.querySelectorAll("a,button,[role=button]"));
    return candidates.find(el => /neosocial/i.test((el.innerText || el.textContent || "").trim()) && el.children.length < 5) || null;
  }

  function placeNotice() {
    const user = authRef && authRef.currentUser;
    if (!user || !announcementEnabled || !activeReleaseId) {
      document.getElementById("neoUpdateNotice")?.remove();
      return;
    }
    dbRef.collection("users").doc(user.uid).get().then(snap => {
      const data = snap.exists ? snap.data() || {} : {};
      if (data.completedUpdateVersion === activeReleaseId) {
        document.getElementById("neoUpdateNotice")?.remove();
        return;
      }
      let notice = document.getElementById("neoUpdateNotice");
      if (!notice) {
        notice = document.createElement("div");
        notice.id = "neoUpdateNotice";
        notice.innerHTML = '<span class="neo-update-title">Update available</span><span>A new NeoFind update is ready.</span><button type="button" id="neoUpdateResetButton">Reset &amp; update</button>';
        const anchor = findNeoSocialAnchor();
        if (anchor && anchor.parentElement) {
          anchor.insertAdjacentElement("afterend", notice);
        } else {
          const host = document.querySelector("header, nav, #topbar, .topbar, #bottomNav, .bottom-nav") || document.body;
          host.appendChild(notice);
        }
        notice.querySelector("#neoUpdateResetButton").addEventListener("click", async function () {
          const button = this;
          button.disabled = true;
          button.textContent = "Updating…";
          try {
            await dbRef.collection("users").doc(user.uid).set({
              completedUpdateVersion: activeReleaseId,
              completedUpdateAt: Date.now()
            }, { merge: true });
            window.location.reload();
          } catch (error) {
            console.error("NeoFind update confirmation failed:", error);
            button.disabled = false;
            button.textContent = "Retry update";
            const detail = document.createElement("span");
            detail.textContent = "Could not save update status. Please try again.";
            notice.appendChild(detail);
          }
        });
      }
    }).catch(error => console.warn("NeoFind update notice: could not read account status", error));
  }

  function findAdminHost() {
    return document.getElementById("adminContent") ||
      document.getElementById("adminBox") ||
      document.querySelector("#adminPanel, .admin-panel");
  }

  function renderAdminPanel(user) {
    const host = findAdminHost();
    if (!host || !isAdmin(user)) {
      document.getElementById("neoUpdateAdminPanel")?.remove();
      return;
    }
    let panel = document.getElementById("neoUpdateAdminPanel");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "neoUpdateAdminPanel";
      panel.innerHTML = '<strong>Global update announcement</strong><p>Turn this on to show an “Update available” notice to every account that has not completed this release.</p><label><input id="neoUpdateAnnouncementCheckbox" type="checkbox"><span>Show update available to everyone</span></label><span id="neoUpdateAdminStatus">Loading settings…</span>';
      host.appendChild(panel);
      panel.querySelector("#neoUpdateAnnouncementCheckbox").addEventListener("change", async event => {
        const checkbox = event.currentTarget;
        const status = panel.querySelector("#neoUpdateAdminStatus");
        checkbox.disabled = true;
        try {
          const nextEnabled = checkbox.checked;
          const nextReleaseId = nextEnabled ? String(Date.now()) : (activeReleaseId || String(Date.now()));
          await dbRef.collection(SETTINGS_PATH[0]).doc(SETTINGS_PATH[1]).set({
            enabled: nextEnabled,
            releaseId: nextReleaseId,
            updatedAt: Date.now(),
            updatedBy: (authRef.currentUser && authRef.currentUser.email) || ""
          }, { merge: true });
          announcementEnabled = nextEnabled;
          activeReleaseId = nextReleaseId;
          status.textContent = nextEnabled ? "Enabled for all accounts." : "Announcement turned off.";
          placeNotice();
        } catch (error) {
          console.error("NeoFind update announcement save failed:", error);
          status.textContent = "Could not save. Check Firestore permissions.";
          checkbox.checked = announcementEnabled;
        } finally {
          checkbox.disabled = false;
        }
      });
    }
    dbRef.collection(SETTINGS_PATH[0]).doc(SETTINGS_PATH[1]).get().then(snap => {
      const data = snap.exists ? snap.data() || {} : {};
      announcementEnabled = data.enabled === true;
      activeReleaseId = data.releaseId || null;
      const checkbox = panel.querySelector("#neoUpdateAnnouncementCheckbox");
      const status = panel.querySelector("#neoUpdateAdminStatus");
      if (checkbox) checkbox.checked = announcementEnabled;
      if (status) status.textContent = announcementEnabled ? "Enabled for all accounts." : "Currently off.";
      placeNotice();
    }).catch(error => {
      console.warn("NeoFind update announcement settings unavailable:", error);
      const status = panel.querySelector("#neoUpdateAdminStatus");
      if (status) status.textContent = "Could not load settings. Check Firestore permissions.";
    });
  }

  function init() {
    if (initialized) return;
    dbRef = getDb();
    authRef = getAuth();
    if (!dbRef || !authRef || !document.body) return;
    initialized = true;
    addStyles();
    authRef.onAuthStateChanged(user => {
      renderAdminPanel(user);
      if (!user) {
        document.getElementById("neoUpdateNotice")?.remove();
        return;
      }
      dbRef.collection(SETTINGS_PATH[0]).doc(SETTINGS_PATH[1]).get().then(snap => {
        const data = snap.exists ? snap.data() || {} : {};
        announcementEnabled = data.enabled === true;
        activeReleaseId = data.releaseId || null;
        placeNotice();
      }).catch(error => console.warn("NeoFind update settings load failed:", error));
    });
    const observer = new MutationObserver(() => {
      if (authRef.currentUser && isAdmin(authRef.currentUser)) renderAdminPanel(authRef.currentUser);
      if (announcementEnabled && authRef.currentUser && !document.getElementById("neoUpdateNotice")) placeNotice();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
  window.addEventListener("load", () => { if (!initialized) init(); });
})();