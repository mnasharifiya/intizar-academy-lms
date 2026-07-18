const fs = require("fs");

const path = "src/pages/admin/Certificates.tsx";
let text = fs.readFileSync(path, "utf8");

const fnStart = text.indexOf("async function printCertificate(cert: CertificateRecord) {");
if (fnStart === -1) throw new Error("printCertificate function not found.");

const bodyStart = text.indexOf("{", fnStart) + 1;
const issuedDateMarker = "  const issuedDate = new Date(cert.issuedAt).toLocaleDateString();";
const issuedDateIndex = text.indexOf(issuedDateMarker, fnStart);

if (issuedDateIndex === -1) {
  throw new Error("issuedDate marker not found.");
}

const overlayBlock = `
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.background = "rgba(15, 23, 42, 0.72)";
  overlay.style.zIndex = "99999";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";

  const toolbar = document.createElement("div");
  toolbar.style.background = "#ffffff";
  toolbar.style.padding = "10px 14px";
  toolbar.style.display = "flex";
  toolbar.style.justifyContent = "space-between";
  toolbar.style.alignItems = "center";
  toolbar.style.borderBottom = "1px solid #e2e8f0";
  toolbar.innerHTML = '<strong>Certificate Preview</strong><span style="color:#64748b;font-size:13px">Use the green Print / Save as PDF button inside the certificate.</span>';

  const closeButton = document.createElement("button");
  closeButton.textContent = "Close";
  closeButton.style.padding = "8px 14px";
  closeButton.style.border = "0";
  closeButton.style.borderRadius = "10px";
  closeButton.style.background = "#dc2626";
  closeButton.style.color = "#fff";
  closeButton.style.fontWeight = "800";
  closeButton.style.cursor = "pointer";
  closeButton.onclick = () => overlay.remove();

  toolbar.appendChild(closeButton);

  const iframe = document.createElement("iframe");
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "0";
  iframe.style.background = "#ffffff";

  overlay.appendChild(toolbar);
  overlay.appendChild(iframe);
  document.body.appendChild(overlay);

  const win = iframe.contentWindow;
  const doc = win?.document;

  if (!win || !doc) {
    alert("Could not open certificate preview. Please try again.");
    overlay.remove();
    return;
  }

  doc.open();
  doc.write(\`
    <html>
      <body style="font-family:Arial;padding:30px">
        Preparing certificate QR code...
      </body>
    </html>
  \`);
  doc.close();

`;

text = text.slice(0, bodyStart) + overlayBlock + text.slice(issuedDateIndex);

// Remove popup-blocking text and any old popup open call if still remaining
text = text.replace(/const win = window\.open[\s\S]*?const doc = win\.document;\s*/g, "");
text = text.replace(/if \(!win\) \{[\s\S]*?return;\s*\(/const win = window\.open[\s\S]*?const doc = win\.document;\s*/g, "");
text}\s*/g, "");
text = text.replaceAll("Popup blocked. Please allow popups for this site, then try Print / Save PDF again.", "");

// Remove automatic print call; user will click print button manually inside preview
text = text.replace(/setTimeout\(\(\) => \{\s*win\.focus\(\);\s*win\.print\(\);\s*\},\s*\d+\s*\);/g, "");

// Make button text clear
text = text.replaceAll(
  'Print / Save PDF</button>',
  'Print / Save as PDF</button>'
);

fs.writeFileSync(path, text, "utf8");

if (text.includes("window.open(") || text.includes("Popup blocked")) {
  throw new Error("Popup code still exists. Send me the output of Select-String.");
}

console.log("Strong no-popup certificate print fix applied.");
