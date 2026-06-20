const fs = require("fs");
const path = require("path");

const vi = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ]/;
const dirs = ["components/hire", "components/findwork", "components/orders"];

function walk(d, files = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, files);
    else if (e.name.endsWith(".tsx")) files.push(p);
  }
  return files;
}

function unwrapped(content) {
  const stripped = content
    .replace(/t\("[^"]*"\)/g, "")
    .replace(/t\('[^']*'\)/g, "")
    .replace(/t\(`[^`$]*`/g, "");
  const hits = [];
  const re = /"([^"\\$\n]{0,200})"/g;
  let m;
  while ((m = re.exec(stripped))) {
    const s = m[1];
    if (vi.test(s) && !s.includes("${")) hits.push(s.slice(0, 100));
  }
  const jsx = stripped.match(/>([^<{]{1,120})</g) || [];
  for (const j of jsx) {
    const t = j.slice(1, -1).trim();
    if (vi.test(t) && !t.startsWith("{")) hits.push("JSX:" + t.slice(0, 100));
  }
  return [...new Set(hits)];
}

for (const dir of dirs) {
  for (const f of walk(dir)) {
    const rel = f.replace(/\\/g, "/");
    if (rel.endsWith("HireSubNav.tsx")) continue;
    const c = fs.readFileSync(f, "utf8");
    const u = unwrapped(c);
    if (u.length) {
      console.log(rel + " (" + u.length + "):");
      u.slice(0, 12).forEach((h) => console.log("  - " + h));
    }
  }
}
