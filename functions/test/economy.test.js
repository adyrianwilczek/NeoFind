const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const s=fs.readFileSync(path.join(__dirname,"..","index.js"),"utf8");
const rules=fs.readFileSync(path.join(__dirname,"..","..","firestore.rules"),"utf8");
const economyUi=fs.readFileSync(path.join(__dirname,"..","..","neo-economy.js"),"utf8");
const social=fs.readFileSync(path.join(__dirname,"..","..","neo-social.js"),"utf8");
const html=fs.readFileSync(path.join(__dirname,"..","..","index.html"),"utf8");

test("chest prices and Lucky Boy reward are present",()=>{
 for(const x of ["price:25","price:50","price:100","price:200",'badge:"luckyBoy",label:"Lucky Boy",weight:1']) assert.ok(s.includes(x),x);
});
test("NeoFind Chest odds total 1000 parts so Lucky Boy is exactly 0.1%",()=>{
 const match=s.match(/neofind:\{label:"NeoFind Chest",price:200,rewards:\[([^\]]+)\]\}/);
 assert.ok(match,"NeoFind chest definition exists");
 const weights=[...match[1].matchAll(/weight:(\d+)/g)].map(x=>Number(x[1]));
 assert.equal(weights.reduce((a,b)=>a+b,0),1000);
 assert.equal(weights[weights.length-1],1);
});
test("economy mutations are server-side and idempotent",()=>{
 for(const x of ['collection("operationKeys")','collection("orbTransactions")','collection("chestHistory")',"crypto.randomInt",'if(a==="buyCosmetic")','if(a==="claimMission")','if(a==="transferOrbs")']) assert.ok(s.includes(x),x);
});
test("reports and AI feedback validate their input",()=>{
 assert.match(s,/const REASONS/);
 assert.match(s,/\["up","down"\]/);
 assert.ok(s.includes('if(a==="report")'));
 assert.ok(s.includes('if(a==="feedback")'));
});
test("advancement rewards require server-owned progress",()=>{
 assert.ok(s.includes('if(a==="trackAdvancement")'));
 assert.ok(s.includes("ADVANCEMENT_NOT_EARNED"));
 assert.ok(rules.includes("'advancementStats'"));
 assert.ok(rules.includes("'advancements'"));
});
test("Orb Shop, Report/Block, and NeoAI feedback controls are wired",()=>{
 assert.ok(economyUi.includes("function applyCosmetics(owned)"));
 assert.ok(economyUi.includes('call("feedback"'));
 assert.ok(economyUi.includes('call("blockUser"'));
 assert.ok(social.includes("data-report-content"));
 assert.ok(social.includes("data-block-author"));
});
test("legacy NeoFind chest inventory UI still exists and uses server calls",()=>{
 assert.ok(html.includes("function renderOrbChestInventory()"));
 assert.ok(html.includes("secureOpenChest"));
 assert.ok(html.includes('call("recordVisit")'));
});
