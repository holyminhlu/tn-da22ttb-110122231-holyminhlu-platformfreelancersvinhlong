/**
 * Restore technical "client" tokens broken by lowercase rename pass.
 * Keeps user-facing Vietnamese "khách hàng" in strings.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);
const EXT = new Set([".tsx", ".ts", ".js", ".jsx", ".json", ".css", ".sql", ".txt"]);

const STRING_FIXES = [
  ['socket.io-khách hàng', 'socket.io-client'],
  ['your-google-khách hàng-id', 'your-google-client-id'],
  ['your-google-khách hàng-secret', 'your-google-client-secret'],
  ['your-payos-khách hàng-id', 'your-payos-client-id'],
  ['x-khách hàng-id', 'x-client-id'],
  ['ff-khách hàng-banner__text', 'ff-client-banner__text'],
  ['ff-khách hàng-banner', 'ff-client-banner'],
  ['wd-khách hàng-stats__code', 'wd-client-stats__code'],
  ['wd-khách hàng-stats__row', 'wd-client-stats__row'],
  ['wd-khách hàng-stats', 'wd-client-stats'],
  ['wd-khách hàng', 'wd-client'],
  ['payments-table--khách hàng', 'payments-table--client'],
  ['resolution-thread__legend-item--khách hàng', 'resolution-thread__legend-item--client'],
  ['resolution-thread__bubble--khách hàng', 'resolution-thread__bubble--client'],
  ['resolution-thread__msg-role--khách hàng', 'resolution-thread__msg-role--client'],
  ['refund-settlement__row--khách hàng', 'refund-settlement__row--client'],
  ['admin-dispute-resolve__amount-field--khách hàng', 'admin-dispute-resolve__amount-field--client'],
  ['admin-dispute-resolve__split-bar-khách hàng', 'admin-dispute-resolve__split-bar-client'],
  ['fw-leads__card-khách hàng', 'fw-leads__card-client'],
  ['WHY_VLC_CTA.khách hàng', 'WHY_VLC_CTA.client'],
  ['auth.khách hàng', 'auth.client'],
  ['t("khách hàng")', 't("auth.client")'],
  ['khách hàng-only', 'client-only'],
  ["server components' khách hàng children", "server components' client children"],
  ['menu Hire (khách hàng)', 'menu Hire (client)'],
  ['Verify khách hàng before', 'Verify client before'],
];

const IDENTIFIER_FIXES = [
  ['const khách hàng =', 'const client ='],
  ['let khách hàng =', 'let client ='],
  ['await khách hàng.', 'await client.'],
  ['khách hàng.release()', 'client.release()'],
  ['(khách hàng,', '(client,'],
  ['(khách hàng)', '(client)'],
  ['async function persistRefreshToken(khách hàng,', 'async function persistRefreshToken(client,'],
  ['async function syncGoogleUserProfile(khách hàng,', 'async function syncGoogleUserProfile(client,'],
  ['async function logLoginAttempt(khách hàng,', 'async function logLoginAttempt(client,'],
  ['async function maybeAlertNewLogin(khách hàng,', 'async function maybeAlertNewLogin(client,'],
  ['async function findOrCreateGoogleUser(khách hàng,', 'async function findOrCreateGoogleUser(client,'],
  ['function persistRefreshToken(khách hàng,', 'function persistRefreshToken(client,'],
  ['function syncGoogleUserProfile(khách hàng,', 'function syncGoogleUserProfile(client,'],
  ['function logLoginAttempt(khách hàng,', 'function logLoginAttempt(client,'],
  ['function maybeAlertNewLogin(khách hàng,', 'function maybeAlertNewLogin(client,'],
  ['function findOrCreateGoogleUser(khách hàng,', 'function findOrCreateGoogleUser(client,'],
  ['notifyNewLogin(khách hàng,', 'notifyNewLogin(client,'],
  ['persistRefreshToken(khách hàng,', 'persistRefreshToken(client,'],
  ['syncGoogleUserProfile(khách hàng,', 'syncGoogleUserProfile(client,'],
  ['logLoginAttempt(khách hàng,', 'logLoginAttempt(client,'],
  ['maybeAlertNewLogin(khách hàng,', 'maybeAlertNewLogin(client,'],
  ['findOrCreateGoogleUser(khách hàng,', 'findOrCreateGoogleUser(client,'],
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

function applyFixes(text) {
  for (const [from, to] of STRING_FIXES) {
    if (text.includes(from)) text = text.split(from).join(to);
  }
  for (const [from, to] of IDENTIFIER_FIXES) {
    if (text.includes(from)) text = text.split(from).join(to);
  }
  // Object keys: `  khách hàng:` at line start (indent)
  text = text.replace(/^(\s+)khách hàng:/gm, '$1client:');
  return text;
}

let changed = 0;
for (const file of walk(ROOT)) {
  const base = path.basename(file);
  if (base.startsWith('rename-') || base.startsWith('fix-client')) continue;
  let text = fs.readFileSync(file, 'utf8');
  const orig = text;
  text = applyFixes(text);
  if (text !== orig) {
    fs.writeFileSync(file, text, 'utf8');
    changed += 1;
  }
}
console.log(`Fixed ${changed} files.`);
