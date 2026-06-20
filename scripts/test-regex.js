const { execSync } = require("child_process");
const d = execSync("git show HEAD:components/hire/ClientHireFavoritesPage.tsx", { encoding: "utf8" });
const inner = d.match(/label: "([^"]+)"/)[1];
const line = `, label: "${inner}"`;
const re = /([,{\[]\s*)(label|title)\s*:\s*"((?:[^"\\]|\\.)*)"/g;
console.log(line.replace(re, (_, pre, key, val) => `${pre}${key}: t("${val}")`));
