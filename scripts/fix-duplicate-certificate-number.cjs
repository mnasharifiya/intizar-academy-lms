const fs = require("fs");

const path = "src/lib/certificateApi.ts";
let text = fs.readFileSync(path, "utf8");

const oldFn = `export function makeCertificateNo(input: {
  regNo?: string | null;
  programName?: string;
}) {
  const year = new Date().getFullYear();
  const reg = safeCode(input.regNo || "NO-REG");
  const program = safeCode(input.programName || "PROGRAM").slice(0, 4);
  return \`INT-CERT-\${year}-\${reg}-\${program}\`;
}`;

const newFn = `export function makeCertificateNo(input: {
  regNo?: string | null;
  programName?: string;
}) {
  const year = new Date().getFullYear();
  const reg = safeCode(input.regNo || "NO-REG");
  const program = safeCode(input.programName || "PROGRAM").slice(0, 4);

  // Certificate numbers must remain unique even if an old certificate was revoked.
  const timePart = Date.now().toString(36).slice(-5).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 5).toUpperCase();

  return \`INT-CERT-\${year}-\${reg}-\${program}-\${timePart}\${randomPart}\`;
}`;

if (!text.includes(oldFn)) {
  throw new Error("Old makeCertificateNo function not found.");
}

text = text.replace(oldFn, newFn);

fs.writeFileSync(path, text, "utf8");

console.log("Certificate number generation now includes unique suffix.");
