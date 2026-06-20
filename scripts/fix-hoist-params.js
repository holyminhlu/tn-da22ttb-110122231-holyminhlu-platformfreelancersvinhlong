/** Fix hoist inserting hooks into destructured parameter lists. */
const fs = require("fs");
const path = require("path");

const TARGETS = ["components/hire", "components/findwork", "components/orders"];

function collectFiles(target) {
  const abs = path.resolve(target);
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

function fixFile(fp) {
  let c = fs.readFileSync(fp, "utf8");
  const orig = c;

  // Pattern: function Name({\n  const { t ... } = useTranslation();\n  ... useMemo ... \n props }: Type) {
  c = c.replace(
    /export default function (\w+)\(\{\s*\n((?:  const \{[^}]+\} = useTranslation\(\);\s*\n)?(?:  const [A-Z][A-Z0-9_]* = useMemo\(\(\) => [\s\S]*?\], \[t\]\);\s*\n)+)\s*([^}]+)\}: ([^)]+)\) \{/g,
    (match, name, hooks, params, typeName) => {
      return `export default function ${name}({ ${params.trim()} }: ${typeName}) {\n${hooks}`;
    },
  );

  // export function variant
  c = c.replace(
    /export function (\w+)\(\{\s*\n((?:  const \{[^}]+\} = useTranslation\(\);\s*\n)?(?:  const [A-Z][A-Z0-9_]* = useMemo\(\(\) => [\s\S]*?\], \[t\]\);\s*\n)+)\s*([^}]+)\}: ([^)]+)\) \{/g,
    (match, name, hooks, params, typeName) => {
      return `export function ${name}({ ${params.trim()} }: ${typeName}) {\n${hooks}`;
    },
  );

  if (c !== orig) {
    fs.writeFileSync(fp, c, "utf8");
    return true;
  }
  return false;
}

let n = 0;
for (const t of TARGETS) {
  for (const f of collectFiles(t)) {
    if (fixFile(f)) {
      n++;
      console.log("Fixed:", path.relative(process.cwd(), f).replace(/\\/g, "/"));
    }
  }
}
console.log("Fixed", n, "files");
