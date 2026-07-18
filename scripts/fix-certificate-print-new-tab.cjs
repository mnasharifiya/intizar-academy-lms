const fs = require("fs");

const path = "src/pages/admin/Certificates.tsx";
let text = fs.readFileSync(path, "utf8");

const fnStart = text.indexOf("async function printCertificate(cert: CertificateRecord) {");
if (fnStart === -1) {
  throw new Error("printCertificate function not found.");
}

const iframeStart = text.indexOf('  const iframe = document.createElement("iframe");', fnStart);
const issuedDateStart = text.indexOf("  const issuedDate = new Date(cert.issuedAt).toLocaleDateString();", fnStart);

if (iframeStart === -1 || issuedDateStart === -1) {
  throw new Error("Could not find iframe block or issuedDate line.");
}

const newOpenBlock = [
  '  const win = window.open("", "_blank", "width=1200,height=850");',
  "",
  "  if (!win) {",
  '    alert("Popup blocked. Please allow popups for this site, then try Print / Save PDF again.");',
  "    return;",
  "  }",
  "",
  "  const doc = win.document;",
  "",
  "  doc.open();",
  "  doc.write(`",
  "    <html>",
  '      <body style="font-family:Arial;padding:30px">',
  "        Preparing certificate QR code...",
  "      </body>",
  "    </html>",
  "  `);",
  "  doc.close();",
  "",
].join("\n");

text = text.slice(0, iframeStart) + newOpenBlock + text.slice(issuedDateStart);

// Remove old iframe cleanup if it exists later in the function.
text = text.replace(/setTimeout\\(\\(\\) =>\\s*iframe\\.remove\\(\\),\\s*\\d+\\s*\\);/g, "");
text = text.replaceAll("iframe.remove();", "");

// Make sure the printable tab has a clearer instruction.
text = text.replaceAll(
  '<button class="print-button" onclick="window.print()">Print / Save PDF</button>',
  '<button class="print-button" onclick="window.print()">Print / Save as PDF</button>'
);

fs.writeFileSync(path, text, "utf8");

console.log("Certificate print now opens in a printable new tab.");
