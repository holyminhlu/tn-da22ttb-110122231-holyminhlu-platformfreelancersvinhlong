/**
 * Fixes double-closing-paren from wrap-i18n: setError(t("..."))) -> setError(t("..."))
 */
const fs = require("fs");
const path = require("path");

const TARGETS = [
  "components/services",
  "components/payments",
  "components/admin",
  "components/profile",
  "components/jobs",
  "components/chat",
  "components/notifications",
  "components/support",
  "components/help",
  "components/about",
  "components/how-vlc-works",
  "components/why-vlc",
  "components/enterprise",
];

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name.endsWith(".tsx")) files.push(p);
  }
  return files;
}

const re =
  /\b(setError|setMessage|setFeedback|setSuccess|setWarning|setInfo|setDownloadFeedback|setNotifFeedback|showNotifFeedback|setToast|setResolveError|alert|confirm|window\.alert|window\.confirm|window\.prompt)\(t\(("(?:[^"\\]|\\.)*")\)\)\)/g;

let count = 0;
for (const target of TARGETS) {
  if (!fs.existsSync(target)) continue;
  const files = target.endsWith(".tsx") ? [path.resolve(target)] : walk(target);
  for (const file of files) {
    let content = fs.readFileSync(file, "utf8");
    const next = content.replace(re, '$1(t($2))');
    if (next !== content) {
      fs.writeFileSync(file, next, "utf8");
      count++;
      console.log("Fixed:", path.relative(process.cwd(), file));
    }
  }
}
console.log("Fixed", count, "files");
