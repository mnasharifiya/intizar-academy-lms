const fs = require("fs");
const path = require("path");

const roots = [
  path.join(process.cwd(), "src", "pages"),
  path.join(process.cwd(), "src", "components"),
];

const exts = new Set([".tsx", ".ts"]);

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];

  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    const stat = fs.statSync(full);

    if (stat.isDirectory()) out.push(...walk(full));
    else if (exts.has(path.extname(full))) out.push(full);
  }

  return out;
}

function replaceVisibleText(s) {
  return s
    .replace(/\bLevels\b/g, "Programs")
    .replace(/\bLevel\b/g, "Program")
    .replace(/\blevels\b/g, "programs")
    .replace(/\blevel\b/g, "program");
}

function safeStringReplace(match, quote, content) {
  // Do not touch import paths, file paths, database/table names, ids, or pure lower-case technical keys.
  if (
    content.includes("/") ||
    content.includes("\\") ||
    content.includes("_") ||
    content === "levels" ||
    content === "level" ||
    content === "levelId" ||
    content === "level_id" ||
    content === "levelCourses" ||
    content === "level_courses"
  ) {
    return match;
  }

  // Only change strings that look user-facing.
  const looksUserFacing =
    /Level|Levels/.test(content) ||
    /\b(level|levels)\b/.test(content) && /\s/.test(content);

  if (!looksUserFacing) return match;

  return quote + replaceVisibleText(content) + quote;
}

function transformFile(file) {
  let text = fs.readFileSync(file, "utf8");
  const original = text;

  const lines = text.split(/\r?\n/).map(line => {
    const trimmed = line.trim();

    // Do not modify imports or export-from paths.
    if (trimmed.startsWith("import ") || /^export .* from /.test(trimmed)) {
      return line;
    }

    // Replace user-facing quoted strings only.
    line = line.replace(/(["'`])([^"'`]*?(?:Level|Levels|level\s|levels\s)[^"'`]*)\1/g, safeStringReplace);

    // Replace JSX visible text between tags.
    line = line.replace(/>([^<]*?(?:Level|Levels|level\s|levels\s)[^<]*?)</g, (_, inner) => {
      return ">" + replaceVisibleText(inner) + "<";
    });

    return line;
  });

  text = lines.join("\n");

  if (text !== original) {
    fs.writeFileSync(file, text, "utf8");
    console.log("updated", path.relative(process.cwd(), file));
  }
}

for (const root of roots) {
  for (const file of walk(root)) {
    transformFile(file);
  }
}
