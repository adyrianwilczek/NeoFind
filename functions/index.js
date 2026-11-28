const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const crypto = require("crypto");

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
      const action = String(req.body?.action || "");
      // Public storefronts can be viewed without signing in. All management,
      // purchase and account actions still require a verified Firebase token.
      if (action === "shop_public_view") {
        const shopId = String(req.body?.shopId || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
        if (!/^[A-Z0-9]{6}$/.test(shopId)) return res.status(400).json({ ok: false, error: "INVALID_SHOP_ID" });
        const shopSnap = await db.collection("shops").doc(shopId).get();
        if (!shopSnap.exists) return res.status(404).json({ ok: false, error: "SHOP_NOT_FOUND" });
        const data = shopSnap.data() || {};
        return res.status(200).json({ ok: true, shop: { id: shopId, name: data.name || "NeoFind Shop", description: data.description || "", logoUrl: data.logoUrl || "", backgroundColor: data.backgroundColor || "#111827", layout: data.layout || "grid", products: (data.products || []).filter(p => Number(p.stock || 0) > 0).map(p => ({ id: p.id, name: p.name, icon: p.icon, price: p.price, stock: p.stock, type: p.type })) } });
      }
      const authorization = String(req.headers.authorization || "");
      if (!authorization.startsWith("Bearer ")) return res.status(401).json({ ok: false, error: "UNAUTHENTICATED" });
      const decoded = await getAuth().verifyIdToken(authorization.slice(7));
      const uid = decoded.uid;
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

      if (action === "create_shop") {
        const result = await db.runTransaction(async tx => {
          const snap = await tx.get(userRef);
          if (!snap.exists) throw new Error("USER_PROFILE_MISSING");
          const data = snap.data() || {};
          const now = Date.now();
          const plan = String(data.plan || "free").toLowerCase();
          const premiumActive = plan === "premium" && Number(data.premiumUntil || 0) > now;
          const goldActive = plan === "gold" && Number(data.goldUntil || 0) > now;
          const freeEligible = data.shopCreateEligible === true;
          if (!premiumActive && !goldActive && !freeEligible) throw new Error("SHOP_CREATE_NOT_ELIGIBLE");
          const limit = goldActive ? 150 : premiumActive ? 75 : 25;
          const shopId = crypto.randomBytes(3).toString("hex").toUpperCase();
          const shopRef = db.collection("shops").doc(shopId);
          const shopSnap = await tx.get(shopRef);
          if (shopSnap.exists) throw new Error("SHOP_ID_COLLISION");
          tx.create(shopRef, {
            id: shopId, ownerUid: uid, ownerEmail: String(decoded.email || ""),
            plan: goldActive ? "gold" : premiumActive ? "premium" : "free",
            productLimit: limit, productCount: 0, name: "My NeoFind Shop",
            description: "", logoUrl: "", backgroundColor: "#111827",
            layout: "grid", products: [], createdAt: FieldValue.serverTimestamp(),
            createdAtMs: now, updatedAt: FieldValue.serverTimestamp(),
            buyersCount: 0, earningsOrbs: 0
          });
          return { ok: true, shopId, url: "https://neofind.pl/?p=shop/id=" + shopId, productLimit: limit };
        });
        return res.status(200).json(result);
      }

      if (action === "shop_list_mine") {
        const snap = await db.collection("shops").where("ownerUid", "==", uid).get();
        const shops = snap.docs.map(doc => {
          const data = doc.data() || {};
          return { id: doc.id, name: String(data.name || "NeoFind Shop"), productCount: Number(data.productCount || (data.products || []).length || 0), productLimit: Number(data.productLimit || 25), earningsOrbs: Number(data.earningsOrbs || 0), buyersCount: Number(data.buyersCount || 0), createdAtMs: Number(data.createdAtMs || 0) };
        }).sort((a,b) => b.createdAtMs - a.createdAtMs);
        return res.status(200).json({ ok: true, shops });
      }

      if (action === "shop_manage") {
        const shopId = String(req.body?.shopId || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
        const operation = String(req.body?.operation || "");
        const shopRef = db.collection("shops").doc(shopId);
        if (!/^[A-Z0-9]{6}$/.test(shopId)) return res.status(400).json({ ok: false, error: "INVALID_SHOP_ID" });
        const result = await db.runTransaction(async tx => {
          const [shopSnap, userSnap] = await Promise.all([tx.get(shopRef), tx.get(userRef)]);
          if (!shopSnap.exists || !userSnap.exists) throw new Error("SHOP_NOT_FOUND");
          const shop = shopSnap.data() || {}, user = userSnap.data() || {};
          if (shop.ownerUid !== uid) throw new Error("SHOP_NOT_OWNER");
          const currentProducts = Array.isArray(shop.products) ? shop.products : [];
          const inventory = Object.assign({ normal: 0, rare: 0, epic: 0, neofind: 0 }, user.chestInventory || {});
          if (operation === "settings") {
            const settings = req.body?.settings || {};
            const name = String(settings.name || shop.name || "").trim().slice(0, 40);
            const description = String(settings.description || "").trim().slice(0, 240);
            const backgroundColor = /^#[0-9A-Fa-f]{6}$/.test(settings.backgroundColor || "") ? settings.backgroundColor : (shop.backgroundColor || "#111827");
            const layout = ["grid","list"].includes(settings.layout) ? settings.layout : "grid";
            const logoUrl = String(settings.logoUrl || "").trim().slice(0, 500);
            tx.update(shopRef, { name, description, backgroundColor, layout, logoUrl, updatedAt: FieldValue.serverTimestamp() });
            return { ok: true, settings: { name, description, backgroundColor, layout, logoUrl } };
          }
          if (operation === "add_product") {
            const p = req.body?.product || {};
            const name = String(p.name || "").trim().slice(0, 40);
            const type = String(p.type || "");
            const icon = String(p.icon || "").trim().slice(0, 12);
            const price = Math.max(1, Math.min(1000000, Math.floor(Number(p.price) || 0)));
            const stock = Math.max(1, Math.min(100000, Math.floor(Number(p.stock) || 0)));
            if (!name || !["normal","rare","epic","neofind"].includes(type) || !icon || !price) throw new Error("INVALID_PRODUCT");
            if (currentProducts.length >= Number(shop.productLimit || 25)) throw new Error("SHOP_PRODUCT_LIMIT");
            if (Number(inventory[type] || 0) < stock) throw new Error("NOT_ENOUGH_INVENTORY");
            const id = crypto.randomBytes(5).toString("hex");
            const products = [...currentProducts, { id, name, type, icon, price, stock, createdAtMs: Date.now() }];
            inventory[type] -= stock;
            tx.update(shopRef, { products, productCount: products.length, updatedAt: FieldValue.serverTimestamp() });
            tx.set(userRef, { chestInventory: inventory }, { merge: true });
            return { ok: true, product: products[products.length - 1], inventory };
          }
          if (operation === "withdraw_product") {
            const productId = String(req.body?.productId || "");
            const product = currentProducts.find(p => p.id === productId);
            if (!product) throw new Error("PRODUCT_NOT_FOUND");
            inventory[product.type] = Math.max(0, Number(inventory[product.type] || 0)) + Math.max(0, Number(product.stock || 0));
            const products = currentProducts.filter(p => p.id !== productId);
            tx.update(shopRef, { products, productCount: products.length, updatedAt: FieldValue.serverTimestamp() });
            tx.set(userRef, { chestInventory: inventory }, { merge: true });
            return { ok: true, inventory, products };
          }
          if (operation === "get_console") return { ok: true, shop: { ...shop, products: currentProducts }, inventory };
          throw new Error("UNKNOWN_SHOP_OPERATION");
        });
        return res.status(200).json(result);
      }

      if (action === "shop_purchase") {
        const shopId = String(req.body?.shopId || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
        const productId = String(req.body?.productId || "");
        const shopRef = db.collection("shops").doc(shopId);
        const buyerReceiptRef = userRef.collection("shopReceipts").doc();
        const result = await db.runTransaction(async tx => {
          const [shopSnap, buyerSnap] = await Promise.all([tx.get(shopRef), tx.get(userRef)]);
          if (!shopSnap.exists || !buyerSnap.exists) throw new Error("SHOP_NOT_FOUND");
          const shop = shopSnap.data() || {}, buyer = buyerSnap.data() || {};
          const products = Array.isArray(shop.products) ? shop.products : [];
          const product = products.find(p => p.id === productId);
          if (!product || Number(product.stock || 0) <= 0) throw new Error("PRODUCT_OUT_OF_STOCK");
          const cost = Math.max(1, Math.floor(Number(product.price) || 0));
          const balance = Math.max(0, Math.floor(Number(buyer.orbs || 0)));
          if (balance < cost) throw new Error("NOT_ENOUGH_ORBS");
          const updatedProducts = products.map(p => p.id === productId ? { ...p, stock: Number(p.stock || 0) - 1 } : p);
          const sellerRef = db.collection("users").doc(String(shop.ownerUid));
          const sellerSnap = await tx.get(sellerRef);
          if (!sellerSnap.exists) throw new Error("SHOP_OWNER_MISSING");
          const seller = sellerSnap.data() || {};
          tx.update(userRef, { orbs: balance - cost, chestInventory: { ...(buyer.chestInventory || {}), [product.type]: Math.max(0, Number((buyer.chestInventory || {})[product.type] || 0)) + 1 } });
          tx.update(sellerRef, { orbs: Math.max(0, Number(seller.orbs || 0)) + cost });
          tx.update(shopRef, { products: updatedProducts, buyersCount: Number(shop.buyersCount || 0) + 1, earningsOrbs: Number(shop.earningsOrbs || 0) + cost, updatedAt: FieldValue.serverTimestamp() });
          tx.create(buyerReceiptRef, { shopId, productId, productName: product.name, itemType: product.type, price: cost, buyerUid: uid, sellerUid: shop.ownerUid, purchasedAt: FieldValue.serverTimestamp() });
          return { ok: true, productName: product.name, cost, orbsRemaining: balance - cost };
        });
        return res.status(200).json(result);
      }

      if (action === "gift_chest") {
        const type = String(req.body?.type || "");
        const email = String(req.body?.recipientEmail || "").trim().toLowerCase().slice(0, 254);
        const message = String(req.body?.message || "").trim().slice(0, 200);
        const purchase = req.body?.purchase === true;
        const allowed = new Set(["normal","rare","epic","neofind"]);
        const prices = {normal:25,rare:50,epic:100,neofind:200};
        if (!allowed.has(type) || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ok:false,error:"INVALID_GIFT"});
        if (email === String(decoded.email || "").toLowerCase()) return res.status(400).json({ok:false,error:"CANNOT_GIFT_SELF"});
        const recipientQuery = await db.collection("users").where("email","==",email).limit(2).get();
        if (recipientQuery.empty) return res.status(404).json({ok:false,error:"RECIPIENT_NOT_FOUND"});
        if (recipientQuery.size !== 1) return res.status(409).json({ok:false,error:"RECIPIENT_AMBIGUOUS"});
        const recipientUid = recipientQuery.docs[0].id;
        const giftRef = db.collection("chestGifts").doc();
        const receiptRef = userRef.collection("purchaseReceipts").doc();
        const result = await db.runTransaction(async tx => {
          const senderSnap = await tx.get(userRef);
          if (!senderSnap.exists) throw new Error("USER_PROFILE_MISSING");
          const sender = senderSnap.data() || {};
          const inventory = Object.assign({normal:0,rare:0,epic:0,neofind:0},sender.chestInventory || {});
          let costOrbs=0,discountPercent=0,source="inventory";
          if(purchase){
            const now=Date.now();
            const premiumActive=sender.plan==="premium"?Number(sender.premiumUntil||0)>now:sender.plan==="gold"?Number(sender.goldUntil||0)>now:(sender.premium===true||Number(sender.premiumUntil||0)>now||Number(sender.goldUntil||0)>now);
            const blackFriday=(now>=Date.UTC(2026,10,27)&&now<Date.UTC(2026,11,1))?20:0;
            discountPercent=Math.max(premiumActive?50:0,blackFriday);
            costOrbs=Math.ceil(prices[type]*(100-discountPercent)/100);
            const balance=Math.max(0,Math.floor(Number(sender.orbs||0)));
            if(balance<costOrbs)throw new Error("NOT_ENOUGH_ORBS");
            tx.update(userRef,{orbs:balance-costOrbs});
            source="purchase";
            tx.create(receiptRef,{purchaseId:receiptRef.id,uid,email:String(decoded.email||""),item:({normal:'Normal Chest Gift',rare:'Rare Chest Gift',epic:'Epic Chest Gift',neofind:'NeoFind Chest Gift'})[type],itemType:"chest_gift",costOrbs,originalCostOrbs:prices[type],discountPercent,recipientEmail:email,purchasedAt:FieldValue.serverTimestamp(),purchasedAtMs:now});
          }else{
            if(Number(inventory[type]||0)<1)throw new Error("GIFT_CHEST_NOT_OWNED");
            inventory[type]=Math.max(0,Math.floor(Number(inventory[type]||0)))-1;
            tx.update(userRef,{chestInventory:inventory});
          }
          tx.create(giftRef,{
            giftId:giftRef.id,senderUid:uid,senderEmail:String(decoded.email||""),
            recipientUid,recipientEmail:email,type,message,status:"pending",source,costOrbs,discountPercent,
            createdAt:FieldValue.serverTimestamp(),createdAtMs:Date.now()
          });
          return {ok:true,giftId:giftRef.id,costOrbs,discountPercent,source,inventory};
        });
        return res.status(200).json(result);
      }

      if (action === "gift_inbox") {
        const snap = await db.collection("chestGifts").where("recipientUid","==",uid).where("status","==","pending").limit(50).get();
        const gifts = snap.docs.map(doc => {
          const d=doc.data()||{};
          return {giftId:doc.id,type:String(d.type||""),message:String(d.message||""),senderEmail:String(d.senderEmail||"").replace(/^(.).+(@.+)$/,"$1***$2"),createdAtMs:Number(d.createdAtMs||0)};
        }).sort((a,b)=>b.createdAtMs-a.createdAtMs);
        return res.status(200).json({ok:true,gifts});
      }

      if (action === "claim_chest_gift") {
        const giftId=String(req.body?.giftId||"").trim().slice(0,128);
        if(!giftId) return res.status(400).json({ok:false,error:"INVALID_GIFT"});
        const giftRef=db.collection("chestGifts").doc(giftId);
        const result=await db.runTransaction(async tx=>{
          const [giftSnap,userSnap]=await Promise.all([tx.get(giftRef),tx.get(userRef)]);
          if(!giftSnap.exists||!userSnap.exists)throw new Error("GIFT_NOT_FOUND");
          const gift=giftSnap.data()||{},user=userSnap.data()||{};
          if(gift.recipientUid!==uid)throw new Error("GIFT_NOT_YOURS");
          if(gift.status!=="pending")throw new Error("GIFT_ALREADY_CLAIMED");
          const type=String(gift.type||"");
          if(!["normal","rare","epic","neofind"].includes(type))throw new Error("INVALID_GIFT");
          const inventory=Object.assign({normal:0,rare:0,epic:0,neofind:0},user.chestInventory||{});
          inventory[type]=Math.max(0,Math.floor(Number(inventory[type]||0)))+1;
          tx.update(userRef,{chestInventory:inventory});
          tx.update(giftRef,{status:"claimed",claimedAt:FieldValue.serverTimestamp(),claimedBy:uid});
          return {ok:true,type,message:String(gift.message||""),inventory};
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
          // Black Friday promotion: 20% off from Nov 27 through Nov 30, 2026 (UTC).
          const promoNow = new Date();
          const promoStart = Date.UTC(2026, 10, 27, 0, 0, 0);
          const promoEnd = Date.UTC(2026, 11, 1, 0, 0, 0);
          const blackFridayDiscount = promoNow.getTime() >= promoStart && promoNow.getTime() < promoEnd ? 20 : 0;
          const premiumDiscount = premiumActive ? 50 : 0;
          const useGiftDiscount = discountUses > 0 && storedDiscount > Math.max(premiumDiscount, blackFridayDiscount);
          const usedTicket = tickets > 0;
          const discountPercent = usedTicket ? 0 : Math.max(premiumDiscount, blackFridayDiscount, useGiftDiscount ? storedDiscount : 0);
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
        : message === "USER_PROFILE_MISSING" ? "USER_PROFILE_MISSING" : message.startsWith("SHOP_") || ["INVALID_PRODUCT","NOT_ENOUGH_INVENTORY","PRODUCT_NOT_FOUND","PRODUCT_OUT_OF_STOCK","NOT_ENOUGH_ORBS","UNKNOWN_SHOP_OPERATION","SHOP_OWNER_MISSING"].includes(message) ? message : "SHOP_ACTION_FAILED";
      return res.status(400).json({ ok: false, error: known });
    }
  }
);
