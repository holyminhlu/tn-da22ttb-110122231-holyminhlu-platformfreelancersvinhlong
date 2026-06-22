/**
 * Restore technical "client" tokens broken by lowercase rename.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);
const EXT = new Set([".tsx", ".ts", ".js", ".jsx", ".json", ".md", ".css", ".sql", ".txt"]);

const FIXES = [
  ['"use khách hàng"', '"use client"'],
  ["'use khách hàng'", "'use client'"],
  ["khách hàng-shell", "client-shell"],
  ["khách hàng-widget", "client-widget"],
  ["khách hàng-dashboard", "client-dashboard"],
  ["khách hàng-page", "client-page"],
  ["khách hàng-withdraw", "client-withdraw"],
  ["khách hàng-withdrawals", "client-withdrawals"],
  ["khách hàng-placeholder", "client-placeholder"],
  ["khách hàng-verify", "client-verify"],
  ["khách hàng-hire", "client-hire"],
  ["khách hàng-profile", "client-profile"],
  ["khách hàng-fav", "client-fav"],
  ["khách hàng-detail", "client-detail"],
  ["khách hàng-card", "client-card"],
  ["khách hàng-row", "client-row"],
  ["khách hàng-col", "client-col"],
  ["khách hàng-grid", "client-grid"],
  ["khách hàng-badge", "client-badge"],
  ["khách hàng-tag", "client-tag"],
  ["khách hàng-meta", "client-meta"],
  ["khách hàng-title", "client-title"],
  ["khách hàng-sub", "client-sub"],
  ["khách hàng-nav", "client-nav"],
  ["khách hàng-main", "client-main"],
  ["khách hàng-aside", "client-aside"],
  ["khách hàng-inbox", "client-inbox"],
  ["khách hàng-chat", "client-chat"],
  ["khách hàng-payos", "client-payos"],
  ["payosKhách hàng", "payosClient"],
  ["socketKhách hàng", "socketClient"],
  ["fetchKhách hàng", "fetchClient"],
  ["httpKhách hàng", "httpClient"],
  ["apiKhách hàng", "apiClient"],
  ["createKhách hàng", "createClient"],
  ["googleKhách hàng", "googleClient"],
  ["oauthKhách hàng", "oauthClient"],
  ["pgKhách hàng", "pgClient"],
  ["poolKhách hàng", "poolClient"],
  ["redisKhách hàng", "redisClient"],
  ["mqttKhách hàng", "mqttClient"],
  ["s3Khách hàng", "s3Client"],
  ["geminiKhách hàng", "geminiClient"],
  ["vlcKhách hàng", "vlcClient"],
  ["Khách hàngError", "ClientError"],
  ["Khách hàngOnly", "ClientOnly"],
  ["isKhách hàng", "isClient"],
  ["Khách hàngId", "ClientId"],
  ["khách hàngId", "clientId"],
  ["khách hàng_id", "client_id"],
  ["khách hàngName", "clientName"],
  ["khách hàngEmail", "clientEmail"],
  ["khách hàngPhone", "clientPhone"],
  ["khách hàngUrl", "clientUrl"],
  ["khách hàngSecret", "clientSecret"],
  ["khách hàngToken", "clientToken"],
  ["khách hàngSide", "clientSide"],
  ["khách hàngComponent", "clientComponent"],
  ["khách hàngModule", "clientModule"],
  ["khách hàngEntry", "clientEntry"],
  ["khách hàngHandler", "clientHandler"],
  ["khách hàngRequest", "clientRequest"],
  ["khách hàngResponse", "clientResponse"],
  ["khách hàngSession", "clientSession"],
  ["khách hàngState", "clientState"],
  ["khách hàngProps", "clientProps"],
  ["khách hàngRef", "clientRef"],
  ["khách hàngData", "clientData"],
  ["khách hàngList", "clientList"],
  ["khách hàngInfo", "clientInfo"],
  ["khách hàngType", "clientType"],
  ["khách hàngRole", "clientRole"],
  ["khách hàngUser", "clientUser"],
  ["khách hàngAccount", "clientAccount"],
  ["khách hàngProfile", "clientProfile"],
  ["khách hàngDashboard", "clientDashboard"],
  ["khách hàngPayments", "clientPayments"],
  ["khách hàngWithdrawals", "clientWithdrawals"],
  ["khách hàngManage", "clientManage"],
  ["khách hàngHire", "clientHire"],
  ["khách hàngFind", "clientFind"],
  ["khách hàngWork", "clientWork"],
  ["khách hàngJob", "clientJob"],
  ["khách hàngQuote", "clientQuote"],
  ["khách hàngOrder", "clientOrder"],
  ["khách hàngService", "clientService"],
  ["khách hàngContract", "clientContract"],
  ["khách hàngDispute", "clientDispute"],
  ["khách hàngRefund", "clientRefund"],
  ["khách hàngEscrow", "clientEscrow"],
  ["khách hàngWallet", "clientWallet"],
  ["khách hàngBalance", "clientBalance"],
  ["khách hàngPayout", "clientPayout"],
  ["khách hàngBank", "clientBank"],
  ["khách hàngPin", "clientPin"],
  ["khách hàngAuth", "clientAuth"],
  ["khách hàngLogin", "clientLogin"],
  ["khách hàngRegister", "clientRegister"],
  ["khách hàngNav", "clientNav"],
  ["khách hàngMenu", "clientMenu"],
  ["khách hàngLink", "clientLink"],
  ["khách hàngBtn", "clientBtn"],
  ["khách hàngForm", "clientForm"],
  ["khách hàngInput", "clientInput"],
  ["khách hàngLabel", "clientLabel"],
  ["khách hàngField", "clientField"],
  ["khách hàngSection", "clientSection"],
  ["khách hàngPanel", "clientPanel"],
  ["khách hàngCard", "clientCard"],
  ["khách hàngTable", "clientTable"],
  ["khách hàngRow", "clientRow"],
  ["khách hàngCell", "clientCell"],
  ["khách hàngHead", "clientHead"],
  ["khách hàngBody", "clientBody"],
  ["khách hàngFoot", "clientFoot"],
  ["khách hàngIcon", "clientIcon"],
  ["khách hàngAvatar", "clientAvatar"],
  ["khách hàngName", "clientName"],
  ["khách hàngDesc", "clientDesc"],
  ["khách hàngText", "clientText"],
  ["khách hàngHint", "clientHint"],
  ["khách hàngError", "clientError"],
  ["khách hàngSuccess", "clientSuccess"],
  ["khách hàngWarning", "clientWarning"],
  ["khách hàngLoading", "clientLoading"],
  ["khách hàngEmpty", "clientEmpty"],
  ["khách hàngSep", "clientSep"],
  ["khách hàngCash", "clientCash"],
  ["khách hàngBilling", "clientBilling"],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), files);
    } else if (EXT.has(path.extname(entry.name))) {
      files.push(path.join(dir, entry.name));
    }
  }
  return files;
}

let changed = 0;
for (const file of walk(ROOT)) {
  if (path.basename(file).startsWith("rename-") || path.basename(file).startsWith("fix-client")) continue;
  let text = fs.readFileSync(file, "utf8");
  const orig = text;
  for (const [from, to] of FIXES) {
    if (text.includes(from)) text = text.split(from).join(to);
  }
  if (text !== orig) {
    fs.writeFileSync(file, text, "utf8");
    changed += 1;
  }
}
console.log(`Fixed ${changed} files.`);
