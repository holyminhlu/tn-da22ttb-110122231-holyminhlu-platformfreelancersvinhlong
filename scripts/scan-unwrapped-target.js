const fs = require("fs");
const path = require("path");

const vi =
  /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ]/;

const TARGETS = [
  "components/services",
  "components/payments",
  "components/admin",
  "components/profile",
  "components/jobs",
  "components/chat",
  "components/notifications",
  "components/support/VlcAiSupportWidget.tsx",
  "components/help",
  "components/about/AboutPageContent.tsx",
  "components/how-vlc-works/HowVlcWorksContent.tsx",
  "components/why-vlc/WhyVlcContent.tsx",
  "components/enterprise/EnterpriseContent.tsx",
];

function collect(target) {
  const abs = path.resolve(target);
  if (!fs.existsSync(abs)) return [];
  if (abs.endsWith(".tsx")) return [abs];
  const files = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) walk(p);
      else if (ent.name.endsWith(".tsx")) files.push(p);
    }
  }
  walk(abs);
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

const all = new Set();
for (const t of TARGETS) for (const f of collect(t)) all.add(f);

let total = 0;
for (const f of [...all].sort()) {
  const c = fs.readFileSync(f, "utf8");
  const u = unwrapped(c);
  const hasHook = /useTranslation/.test(c);
  if (u.length || (!hasHook && vi.test(c))) {
    total++;
    console.log(
      path.relative(".", f) + (hasHook ? "" : " [NO HOOK]") + " (" + u.length + " unwrapped):",
    );
    u.slice(0, 10).forEach((h) => console.log("  - " + h));
  }
}
console.log("Files needing work:", total);
