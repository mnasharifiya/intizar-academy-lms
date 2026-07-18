const fs = require("fs");

const path = "src/pages/admin/Certificates.tsx";
let text = fs.readFileSync(path, "utf8");
const newFn = fs.readFileSync("scripts/printCertificate.final.txt", "utf8").trim();

const start = text.indexOf("async function printCertificate(cert: CertificateRecord)");
if (start === -1) throw new Error("printCertificate function not found.");

function findFunctionEnd(source, startIndex) {
  const firstBrace = source.indexOf("{", startIndex);
  if (firstBrace === -1) throw new Error("Opening brace not found.");

  let depth = 0;
  let state = "code";
  let escape = false;

  for (let i = firstBrace; i < source.length; i++) {
    const ch = source[i];
    const next = source[i + 1];

    if (state === "lineComment") {
      if (ch === "\n") state = "code";
      continue;
    }

    if (state === "blockComment") {
      if (ch === "*" && next === "/") {
        state = "code";
        i++;
      }
      continue;
    }

    if (state === "single") {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === "'") {
        state = "code";
      }
      continue;
    }

    if (state === "double") {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        state = "code";
      }
      continue;
    }

    if (state === "template") {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === "`") {
        state = "code";
      }
      continue;
    }

    if (ch === "/" && next === "/") {
      state = "lineComment";
      i++;
      continue;
    }

    if (ch === "/" && next === "*") {
      state = "blockComment";
      i++;
      continue;
    }

    if (ch === "'") {
      state = "single";
      continue;
    }

    if (ch === '"') {
      state = "double";
      continue;
    }

    if (ch === "`") {
      state = "template";
      continue;
    }

    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }

  throw new Error("Function end not found.");
}

const end = findFunctionEnd(text, start);
text = text.slice(0, start) + newFn + text.slice(end);

fs.writeFileSync(path, text, "utf8");

console.log("printCertificate fully replaced with clean final layout.");
