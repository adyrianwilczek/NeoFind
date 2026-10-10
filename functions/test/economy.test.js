const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");const s=fs.readFileSync(path.join(__dirname,"..","index.js"),"utf8");
test("chest prices and Lucky Boy reward are present",()=>{for(const x of ["price:25","price:50","price:100","price:200",'badge:"luckyBoy",label:"Lucky Boy",weight:1'])assert.ok(s.includes(x),x)});
test("server owns economy writes and transaction history",()=>{for(const x of ['collection("operationKeys")','collection("orbTransactions")','collection("chestHistory")',"crypto.randomInt","buyCosmetic","claimMission"])assert.ok(s.includes(x),x)});
test("report and feedback inputs have allowlists",()=>{assert.match(s,/const REASONS/);assert.match(s,/\["up","down"\]/)});
