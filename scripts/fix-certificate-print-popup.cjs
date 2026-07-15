const fs = require("fs");
const path = "src/pages/admin/Certificates.tsx";

let text = fs.readFileSync(path, "utf8");

const target = `const win = window.open("", "_blank", "noopener,noreferrer");`;

if (!text.includes("Popup blocked. Please allow popups to print the certificate")) {
  console.error("Could not find certificate popup alert.");
  process.exit(1);
}

if (!text.includes("window.open")) {
  console.log("No window.open found. Certificate may already be fixed.");
  process.exit(0);
}

text = text.replace(
  /const win = window\.open\("", "_blank"(?:, "noopener,noreferrer")?\);\s*if \(!win\) \{\s*alert\("Popup blocked\. Please allow popups to print the certificate\."\);\s*return;\s*\}/,
  `const iframe = document.createElement("iframe");

  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;

  if (!win || !doc) {
    alert("Could not open print dialog. Please try again.");
    iframe.remove();
    return;
  }`
);

text = text.replace(/win\.document\.open\(\);/g, "doc.open();");
text = text.replace(/win\.document\.write\(/g, "doc.write(");
text = text.replace(/win\.document\.close\(\);/g, "doc.close();");

text = text.replace(
  /setTimeout\(\(\) => \{\s*win\.focus\(\);\s*win\.print\(\);\s*\},\s*300\);/g,
  `setTimeout(() => {
    win.focus();
    win.print();

    setTimeout(() => {
      iframe.remove();
    }, 1000);
  }, 300);`
);

fs.writeFileSync(path, text, "utf8");
console.log("Certificate print popup fixed.");
