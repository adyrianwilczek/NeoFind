const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

const REWARDS = {
  browser_new_domain: 2,
  browser_daily_open: 5,
  browser_install_extension: 3,
  browser_slot_spin: 2,
  browser_chest_normal: 10,
  browser_chest_rare: 25,
  browser_chest_epic: 50,
  browser_chest_neofind: 100,
  browser_premium_purchase: 5000,
  browser_bookmark_add: 2,
  browser_theme_create: 15,
  browser_wallpaper_change: 2,
  browser_translator_use: 2,
  browser_calculator_use: 1,
  browser_new_tab: 1,
  browser_picture_in_picture: 3,
  browser_first_sync: 25,
  browser_update: 5,
  arcade_play: 3,
  arcade_first_game: 10,
  report_submit: 2,
  rating_submit: 10,
  friend_add: 5,
  message_send: 1,
  web_theme_create: 15,
  daily_mission_complete: 10,
  weekly_mission_complete: 50,
  neoai_first_open: 25
};

const ONCE = new Set([
  "browser_first_sync", "arcade_first_game", "neoai_first_open",
  "browser_premium_purchase", "browser_theme_create", "web_theme_create"
]);

const DAILY_LIMITS = {
  browser_daily_open: 1,
  browser_new_domain: 20,
  browser_install_extension: 5,
  browser_slot_spin: 5,
  browser_bookmark_add: 10,
  browser_wallpaper_change: 5,
  browser_translator_use: 20,
  browser_calculator_use: 30,
  browser_new_tab: 30,
  browser_picture_in_picture: 10,
  arcade_play: 20,
  report_submit: 3,
  rating_submit: 3,
  friend_add: 10,
  message_send: 50
};

function levelData(totalXp) {
  let level = 0;
  let spent = 0;
  let next = 25;
  while (totalXp >= spent + next && level < 100000) {
    spent += next;
    level++;
    next *= 2;
  }
  const rank = level >= 100001 ? "Infinity" :
    level >= 25001 ? "Impossible" :
    level >= 10001 ? "Multiverse" :
    level >= 5001 ? "Insane" :
    level >= 2001 ? "Godly" :
    level >= 1501 ? "Hyper" :
    level >= 1001 ? "Legendary" :
    level >= 751 ? "Super" :
    level >= 501 ? "Diamond" :
    level >= 251 ? "Obsidian" :
    level >= 101 ? "Platinum" :
    level >= 51 ? "Gold" :
    level >= 31 ? "Pearl" :
    level >= 21 ? "Amethyst" :
    level >= 16 ? "Ruby" :
    level >= 11 ? "Emerald" :
    level >= 7 ? "Silver" :
    level >= 4 ? "Bronze" : "Unranked";
  return { level, xp: totalXp - spent, nextLevelXp: next, totalXp, rank };
}

exports.awardXp = onRequest({ region: "us-central1", cors: true, maxInstances: 20 }, async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  try {
    const header = String(req.headers.authorization || "");
    if (!header.startsWith("Bearer ")) return res.status(401).json({ error: "UNAUTHENTICATED" });
    const decoded = await getAuth().verifyIdToken(header.slice(7));
    const uid = decoded.uid;
    const event = String(req.body && req.body.event || "");
    const eventId = String(req.body && req.body.eventId || "");
    if (!Object.prototype.hasOwnProperty.call(REWARDS, event) || !/^[a-zA-Z0-9_-]{8,120}$/.test(eventId)) {
      return res.status(400).json({ error: "INVALID_EVENT" });
    }

    const reward = REWARDS[event];
    const userRef = db.collection("users").doc(uid);
    const eventRef = userRef.collection("xpEvents").doc(eventId);
    const day = new Date().toISOString().slice(0, 10);
    const dailyRef = userRef.collection("xpDaily").doc(day);
    const result = await db.runTransaction(async tx => {
      const [userSnap, eventSnap, dailySnap] = await Promise.all([
        tx.get(userRef), tx.get(eventRef), tx.get(dailyRef)
      ]);
      if (eventSnap.exists) return { awarded: false, reason: "ALREADY_CLAIMED", ...(userSnap.exists ? levelData(Number(userSnap.get("totalXp") || 0)) : levelData(0)) };
      if (ONCE.has(event) && userSnap.exists && (userSnap.get("xpOneTime") || {})[event]) {
        return { awarded: false, reason: "ALREADY_CLAIMED", ...levelData(Number(userSnap.get("totalXp") || 0)) };
      }
      const counts = dailySnap.exists ? (dailySnap.data().counts || {}) : {};
      const limit = DAILY_LIMITS[event];
      if (limit && Number(counts[event] || 0) >= limit) {
        return { awarded: false, reason: "DAILY_LIMIT", ...levelData(Number(userSnap.get("totalXp") || 0)) };
      }
      const oldXp = Math.max(0, Math.floor(Number(userSnap.exists ? userSnap.get("totalXp") || 0 : 0)));
      const next = levelData(oldXp + reward);
      const updates = {
        totalXp: oldXp + reward,
        level: next.level,
        levelXp: next.xp,
        levelNextXp: next.nextLevelXp,
        levelRank: next.rank,
        xpUpdatedAt: FieldValue.serverTimestamp()
      };
      if (ONCE.has(event)) updates[`xpOneTime.${event}`] = true;
      tx.set(userRef, updates, { merge: true });
      tx.create(eventRef, { event, reward, createdAt: FieldValue.serverTimestamp() });
      if (limit) tx.set(dailyRef, { counts: { ...counts, [event]: Number(counts[event] || 0) + 1 } }, { merge: true });
      return { awarded: true, gained: reward, ...next };
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error("awardXp failed", error);
    return res.status(500).json({ error: "XP_AWARD_FAILED" });
  }
});
