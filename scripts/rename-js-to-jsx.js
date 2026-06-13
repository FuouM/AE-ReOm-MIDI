const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const compiledRoot = path.join(root, "dist", "compiled");

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      return;
    }
    if (entry.isFile() && entry.name.endsWith(".js")) {
      const jsxPath = fullPath.slice(0, -3) + ".jsx";
      fs.renameSync(fullPath, jsxPath);
    }
  });
}

if (!fs.existsSync(compiledRoot)) {
  console.error("Missing dist/compiled. Run tsc first.");
  process.exit(1);
}

walk(compiledRoot);
console.log("Renamed compiled .js files to .jsx");
