const fs = require("fs");
const path = require("path");

const viRegex =
  /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ]/;
const dirs = ["components", "app", "lib", "hooks"];
const strings = new Set();

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      walk(p);
    } else if (/\.(tsx?|jsx?)$/.test(ent.name)) {
      const content = fs.readFileSync(p, "utf8");
      const re = /(['"`])([^'"`\n]{2,300}?)\1/g;
      let m;
      while ((m = re.exec(content))) {
        if (viRegex.test(m[2])) strings.add(m[2]);
      }
    }
  }
}

dirs.forEach((d) => {
  if (fs.existsSync(d)) walk(d);
});

const arr = [...strings].sort();
fs.writeFileSync("_extracted_vi_strings.json", JSON.stringify(arr, null, 2));
console.log("Total strings:", arr.length);
