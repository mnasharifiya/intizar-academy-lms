const fs = require("fs");

const path = "src/pages/admin/Certificates.tsx";
let text = fs.readFileSync(path, "utf8");

// Remove subtitle under INTIZAR name
text = text.replace(
  /\s*<div class="subtitle">Official Learning Management System Certificate<\/div>/g,
  ""
);

// Force clean academic certificate layout
text = text.replace(
  /\.page\s*\{[^}]*\}/,
  `.page { width: 297mm; height: 210mm; margin: 0 auto; background: #fff; position: relative; overflow: hidden; box-sizing: border-box; padding: 13mm; }`
);

text = text.replace(
  /\.border\s*\{[^}]*\}/,
  `.border { border: 4px double #166534; height: 100%; box-sizing: border-box; padding: 8mm 10mm; position: relative; }`
);

text = text.replace(
  /\.content\s*\{[^}]*\}/,
  `.content { position: relative; z-index: 2; text-align: center; height: 100%; display: flex; flex-direction: column; }`
);

text = text.replace(
  /\.logo\s*\{[^}]*\}/,
  `.logo { width: 46px; height: 46px; object-fit: contain; margin: 0 auto 3px; }`
);

text = text.replace(
  /\.official-name-img\s*\{[^}]*\}/,
  `.official-name-img { width: 255px; max-height: 62px; object-fit: contain; display: block; margin: 0 auto 2px; }`
);

text = text.replace(
  /\.org-en\s*\{[^}]*\}/,
  `.org-en { font-size: 13px; font-weight: 800; color: #052e16; margin-top: 1px; }`
);

text = text.replace(
  /\.cert-title\s*\{[^}]*\}/,
  `.cert-title { margin-top: 8px; font-size: 34px; font-weight: 900; color: #166534; letter-spacing: 3px; text-transform: uppercase; }`
);

text = text.replace(
  /\.small-title\s*\{[^}]*\}/,
  `.small-title { margin-top: 2px; font-size: 16px; color: #334155; }`
);

text = text.replace(
  /\.presented\s*\{[^}]*\}/,
  `.presented { margin-top: 12px; font-size: 15px; color: #475569; }`
);

text = text.replace(
  /\.student-name\s*\{[^}]*\}/,
  `.student-name { margin: 7px auto 5px; font-size: 32px; font-weight: 900; color: #111827; border-bottom: 2px solid #166534; display: inline-block; padding: 0 26px 5px; }`
);

text = text.replace(
  /\.body-text\s*\{[^}]*\}/,
  `.body-text { margin: 8px auto 0; max-width: 930px; font-size: 14px; line-height: 1.45; color: #334155; }`
);

text = text.replace(
  /\.meta-grid\s*\{[^}]*\}/,
  `.meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; margin-top: 10px; font-family: Arial, sans-serif; text-align: left; }`
);

text = text.replace(
  /\.meta-card\s*\{[^}]*\}/,
  `.meta-card { border: 1px solid #bbf7d0; background: #f0fdf4; border-radius: 9px; padding: 6px 8px; font-size: 10px; min-height: 45px; box-sizing: border-box; }`
);

text = text.replace(
  /\.meta-label\s*\{[^}]*\}/,
  `.meta-label { color: #64748b; font-weight: bold; text-transform: uppercase; font-size: 9px; }`
);

text = text.replace(
  /\.meta-value\s*\{[^}]*\}/,
  `.meta-value { margin-top: 3px; color: #052e16; font-weight: bold; word-break: break-word; font-size: 11px; }`
);

// Wrap QR and signature together in one bottom row
const qrStart = text.indexOf('              <div class="qr-section">');
const footerStart = text.indexOf('              <div class="footer">', qrStart);

if (qrStart === -1 || footerStart === -1) {
  throw new Error("QR section or footer not found.");
}

const existingBottomBlock = text.slice(qrStart, footerStart);

if (!existingBottomBlock.includes('class="bottom-row"')) {
  text =
    text.slice(0, qrStart) +
    '              <div class="bottom-row">\n' +
    existingBottomBlock +
    '              </div>\n\n' +
    text.slice(footerStart);
}

// Add bottom-row CSS
if (!text.includes(".bottom-row")) {
  text = text.replace(
    `          .qr-section {`,
    `          .bottom-row { display: grid; grid-template-columns: 1.05fr 1fr; gap: 12px; align-items: end; margin-top: auto; padding-top: 10px; }
          .qr-section {`
  );
}

// Force QR and signature to be part of paper flow, not floating over fields
text = text.replace(
  /\.qr-section\s*\{[^}]*\}/,
  `.qr-section { display: flex; align-items: center; justify-content: flex-start; gap: 9px; font-family: Arial, sans-serif; text-align: left; border: 1px solid #bbf7d0; background: #f8fffb; border-radius: 10px; padding: 8px; }`
);

text = text.replace(
  /\.qr-section img\s*\{[^}]*\}/,
  `.qr-section img { width: 72px; height: 72px; border: 1px solid #bbf7d0; padding: 4px; border-radius: 8px; background: #fff; flex-shrink: 0; }`
);

text = text.replace(
  /\.qr-text\s*\{[^}]*\}/,
  `.qr-text { text-align: left; max-width: 300px; font-size: 9px; color: #475569; line-height: 1.25; }`
);

text = text.replace(
  /\.signature-row\s*\{[^}]*\}/,
  `.signature-row { display: grid; grid-template-columns: 1fr 70px 1fr; gap: 10px; align-items: end; margin-top: 0; }`
);

text = text.replace(
  /\.signature img\s*\{[^}]*\}/,
  `.signature img { height: 46px; max-width: 150px; object-fit: contain; margin-bottom: 2px; }`
);

text = text.replace(
  /\.seal img\s*\{[^}]*\}/,
  `.seal img { width: 62px; height: 62px; object-fit: contain; }`
);

text = text.replace(
  /\.sig-line\s*\{[^}]*\}/,
  `.sig-line { border-top: 2px solid #111827; padding-top: 4px; font-size: 11px; font-weight: bold; }`
);

text = text.replace(
  /\.footer\s*\{[^}]*\}/,
  `.footer { margin-top: 6px; display: flex; justify-content: space-between; gap: 14px; font-size: 9px; color: #64748b; font-family: Arial, sans-serif; }`
);

// Force real transparent secretary image
text = text.replace(
  /<img src="\/certificates\/intizar-secretary-signature\.png" onerror="this\.style\.display='none'" \/>/g,
  `<img src="/certificates/intizar-secretary-signature.png" onerror="this.style.display='none'" />`
);

text = text.replace(
  /<img src="\$\{CERTIFICATE_SETTINGS\.secretarySignatureUrl\}" onerror="this\.style\.display='none'" \/>/g,
  `<img src="/certificates/intizar-secretary-signature.png" onerror="this.style.display='none'" />`
);

fs.writeFileSync(path, text, "utf8");

console.log("Certificate layout cleaned: subtitle removed, QR/signature fixed, transparent assets ready.");
