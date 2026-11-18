const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

// NEOFIND XP SYSTEM v2: all rewards are calculated and written server-side.
const XP_REWARDS = Object.freeze({
  browser_new_domain: 2,
  browser_daily_open: 5,
  browser_install_extension: 3,
  browser_slot_spin: 2,
  browser_chest_normal: 10,
  browser_chest_rare: 25,
  browser_chest_epic: 50,
  browser_chest_neofind: 100,
  browser_premium_purchase: 5000,
  browser_gold_purchase: 5000,
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
});

const XP_ONCE = new Set([
  "browser_first_sync", "arcade_first_game", "neoai_first_open",
  "browser_premium_purchase", "browser_gold_purchase", "browser_theme_create", "web_theme_create"
]);

const XP_DAILY_LIMITS = Object.freeze({
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
});

function calculateLevel(totalXp) {
  const safeTotal = Math.max(0, Math.floor(Number(totalXp) || 0));
  let level = 0;
  let xpIntoLevel = safeTotal;
  let xpForNextLevel = 25;

  while (xpIntoLevel >= xpForNextLevel && level < 100001) {
    xpIntoLevel -= xpForNextLevel;
    level += 1;
    xpForNextLevel *= 2;
  }

  const rank =
    level >= 100001 ? "Infinity" :
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

  return {
    level,
    xp: xpIntoLevel,
    nextLevelXp: xpForNextLevel,
    totalXp: safeTotal,
    rank
  };
}

exports.awardXp = onRequest(
  { region: "us-central1", cors: true, maxInstances: 20 },
  async (req, res) => {
    if (req.method !== "POST") {
      return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
    }

    try {
      const authorization = String(req.headers.authorization || "");
      if (!authorization.startsWith("Bearer ")) {
        return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
      }

      const decoded = await getAuth().verifyIdToken(authorization.slice(7));
      const uid = decoded.uid;
      const event = String(req.body?.event || "");
      const eventId = String(req.body?.eventId || "");

      if (!Object.prototype.hasOwnProperty.call(XP_REWARDS, event)) {
        return res.status(400).json({ ok: false, error: "UNKNOWN_XP_EVENT" });
      }
      if (!/^[a-zA-Z0-9_-]{8,120}$/.test(eventId)) {
        return res.status(400).json({ ok: false, error: "INVALID_EVENT_ID" });
      }

      const reward = XP_REWARDS[event];
      const userRef = db.collection("users").doc(uid);
      const eventRef = userRef.collection("xpEvents").doc(eventId);
      const dayKey = new Date().toISOString().slice(0, 10);
      const dailyRef = userRef.collection("xpDaily").doc(dayKey);

      const result = await db.runTransaction(async (tx) => {
        const [userSnap, eventSnap, dailySnap] = await Promise.all([
          tx.get(userRef),
          tx.get(eventRef),
          tx.get(dailyRef)
        ]);

        const currentTotal = Math.max(
          0,
          Math.floor(Number(userSnap.exists ? userSnap.get("totalXp") : 0) || 0)
        );
        const currentLevel = calculateLevel(currentTotal);

        if (eventSnap.exists) {
          return { ok: true, awarded: false, reason: "ALREADY_CLAIMED", ...currentLevel };
        }

        const claimedOnce = userSnap.exists ? (userSnap.get("xpOneTime") || {}) : {};
        if (XP_ONCE.has(event) && claimedOnce[event] === true) {
          return { ok: true, awarded: false, reason: "ALREADY_CLAIMED", ...currentLevel };
        }

        const counts = dailySnap.exists ? (dailySnap.get("counts") || {}) : {};
        const dailyLimit = XP_DAILY_LIMITS[event] || 0;
        const usedToday = Math.max(0, Number(counts[event]) || 0);

        if (dailyLimit > 0 && usedToday >= dailyLimit) {
          return { ok: true, awarded: false, reason: "DAILY_LIMIT", ...currentLevel };
        }

        const updated = calculateLevel(currentTotal + reward);
        const userUpdate = {
          totalXp: updated.totalXp,
          level: updated.level,
          levelXp: updated.xp,
          levelNextXp: updated.nextLevelXp,
          levelRank: updated.rank,
          xpUpdatedAt: FieldValue.serverTimestamp()
        };

        if (XP_ONCE.has(event)) userUpdate[`xpOneTime.${event}`] = true;

        tx.set(userRef, userUpdate, { merge: true });
        tx.create(eventRef, {
          event,
          reward,
          eventId,
          createdAt: FieldValue.serverTimestamp()
        });

        if (dailyLimit > 0) {
          tx.set(dailyRef, {
            counts: { ...counts, [event]: usedToday + 1 },
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });
        }

        return { ok: true, awarded: true, gained: reward, ...updated };
      });

      return res.status(200).json(result);
    } catch (error) {
      console.error("awardXp failed:", error);
      return res.status(500).json({ ok: false, error: "XP_AWARD_FAILED" });
    }
  }
);


// Native Browser Shop actions are processed with Admin SDK so the balance,
// inventory and receipt are committed together and cannot partially succeed.
exports.shopAction = onRequest(
  { region: "us-central1", cors: true, maxInstances: 20 },
  async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
    try {
      const authorization = String(req.headers.authorization || "");
      if (!authorization.startsWith("Bearer ")) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
      const decoded = await getAuth().verifyIdToken(authorization.slice(7));
      const uid = decoded.uid;
      const action = String(req.body?.action || "");
      const userRef = db.collection("users").doc(uid);

      if (action === "redeem_coupon") {
        const code = String(req.body?.code || "").trim().toLowerCase();
        if (code !== "checkmate26") return res.status(400).json({ ok: false, error: "INVALID_COUPON" });
        const claimRef = userRef.collection("shopCouponClaims").doc("checkmate26");
        const result = await db.runTransaction(async tx => {
          const [userSnap, claimSnap] = await Promise.all([tx.get(userRef), tx.get(claimRef)]);
          if (!userSnap.exists) throw new Error("USER_PROFILE_MISSING");
          if (claimSnap.exists) return { ok: false, error: "COUPON_ALREADY_USED" };
          const data = userSnap.data() || {};
          const oldUses = Math.max(0, Math.floor(Number(data.shopDiscountUses || 0)));
          const oldPercent = Math.max(0, Math.min(90, Math.floor(Number(data.shopDiscountPercent || 0))));
          tx.set(userRef, {
            shopDiscountPercent: Math.max(oldPercent, 25),
            shopDiscountUses: oldUses + 1,
            lastShopCoupon: "checkmate26"
          }, { merge: true });
          tx.create(claimRef, {
            uid, code: "checkmate26", discountPercent: 25,
            redeemedAt: FieldValue.serverTimestamp()
          });
          return { ok: true, discountPercent: 25, discountUses: oldUses + 1 };
        });
        return res.status(200).json(result);
      }

      if (action === "buy_chest") {
        const type = String(req.body?.type || "");
        const prices = { normal: 25, rare: 50, epic: 100, neofind: 200 };
        const labels = { normal: "Normal Chest", rare: "Rare Chest", epic: "Epic Chest", neofind: "NeoFind Chest" };
        if (!Object.prototype.hasOwnProperty.call(prices, type)) return res.status(400).json({ ok: false, error: "INVALID_ITEM" });
        const receiptRef = userRef.collection("purchaseReceipts").doc();
        const purchasedAtMs = Date.now();
        const result = await db.runTransaction(async tx => {
          const snap = await tx.get(userRef);
          if (!snap.exists) throw new Error("USER_PROFILE_MISSING");
          const data = snap.data() || {};
          const current = Math.max(0, Math.floor(Number(data.orbs || 0)));
          const tickets = Math.max(0, Math.floor(Number(data.shopTicketUses || 0)));
          const discountUses = Math.max(0, Math.floor(Number(data.shopDiscountUses || 0)));
          const storedDiscount = Math.max(0, Math.min(90, Math.floor(Number(data.shopDiscountPercent || 0))));
          const now = Date.now();
          const premiumActive = data.plan === "premium"
            ? Number(data.premiumUntil || 0) > now
            : data.plan === "gold"
              ? Number(data.goldUntil || 0) > now
              : (data.premium === true || Number(data.premiumUntil || 0) > now || Number(data.goldUntil || 0) > now);
          const premiumDiscount = premiumActive ? 50 : 0;
          const useGiftDiscount = discountUses > 0 && storedDiscount > premiumDiscount;
          const usedTicket = tickets > 0;
          const discountPercent = usedTicket ? 0 : Math.max(premiumDiscount, useGiftDiscount ? storedDiscount : 0);
          const costOrbs = usedTicket ? 0 : Math.ceil(prices[type] * (100 - discountPercent) / 100);
          if (current < costOrbs) throw new Error("NOT_ENOUGH_ORBS");
          const inventory = Object.assign({ normal: 0, rare: 0, epic: 0, neofind: 0 }, data.chestInventory || {});
          inventory[type] = Math.max(0, Math.floor(Number(inventory[type] || 0))) + 1;
          tx.set(userRef, {
            orbs: current - costOrbs,
            chestInventory: inventory,
            lastShopPurchaseId: receiptRef.id,
            ...(usedTicket ? { shopTicketUses: tickets - 1 } : {}),
            ...(!usedTicket && useGiftDiscount ? { shopDiscountUses: discountUses - 1 } : {})
          }, { merge: true });
          tx.create(receiptRef, {
            purchaseId: receiptRef.id, uid,
            email: String(decoded.email || ""),
            item: labels[type], itemType: "chest",
            costOrbs, originalCostOrbs: prices[type],
            ticketUsed: usedTicket, discountPercent,
            purchasedAt: FieldValue.serverTimestamp(), purchasedAtMs
          });
          return {
            ok: true, item: labels[type], costOrbs,
            originalCostOrbs: prices[type], ticketUsed: usedTicket,
            discountPercent, purchaseId: receiptRef.id,
            orbs: current - costOrbs, inventory
          };
        });
        return res.status(200).json(result);
      }

      return res.status(400).json({ ok: false, error: "UNKNOWN_ACTION" });
    } catch (error) {
      console.error("shopAction failed:", error);
      const message = String(error && error.message || error);
      const known = message === "NOT_ENOUGH_ORBS" ? "NOT_ENOUGH_ORBS"
        : message === "USER_PROFILE_MISSING" ? "USER_PROFILE_MISSING" : "SHOP_ACTION_FAILED";
      return res.status(400).json({ ok: false, error: known });
    }
  }
);
