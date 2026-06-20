const fs = require("fs");
const path = require("path");

function walk(d, f = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, f);
    else if (p.endsWith(".tsx")) f.push(p);
  }
  return f;
}

let n = 0;
for (const file of walk("components")) {
  let c = fs.readFileSync(file, "utf8");
  const o = c;
  c = c.replace(
    /\s*const formatDate = formatDateUi;\s*\n(\s*const formatVnd = formatVndUi;\s*\n)?(\s*const \{ t[^}]+\} = useTranslation\(\);)/g,
    "$2",
  );
  c = c.replace(
    /\s*const formatVnd = formatVndUi;\s*\n(\s*const \{ t[^}]+\} = useTranslation\(\);)/g,
    "$1",
  );
  if (c !== o) {
    fs.writeFileSync(file, c);
    n++;
  }
}
console.log("cleaned", n);
