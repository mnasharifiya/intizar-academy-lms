const fs = require("fs");

const path = "src/pages/admin/Certificates.tsx";
let text = fs.readFileSync(path, "utf8");

// 1. Force official Arabic/Hausa name into certificate HTML.
const orgPattern = /<img class="logo" src="\/intizar-logo\.jpg" \/>\s*<div class="org">\$\{CERTIFICATE_SETTINGS\.organizationName\}<\/div>/;

if (orgPattern.test(text)) {
  text = text.replace(orgPattern, () => `
              <img class="logo" src="/intizar-logo.jpg" />
              <img class="official-name-img" src="/certificates/intizar-official-name.png" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
              <div class="official-name-fallback" style="display:none">انتظار الامام المنتظر<br/><span>(تربین روح د غنغن حكي)</span></div>
              <div class="org-en">\${escapeHtml(CERTIFICATE_SETTINGS.organizationName)}</div>`);
} else if (!text.includes("intizar-official-name.png")) {
  throw new Error("Could not find organization-name HTML block.");
}

// 2. Force CSS for official name.
if (!text.includes(".official-name-img")) {
  text = text.replace(
    /\.org\s*\{[^}]*\}/,
    `.org { font-size: 26px; font-weight: 900; color: #052e16; letter-spacing: 1px; }
          .official-name-img { width: 280px; max-height: 74px; object-fit: contain; display: block; margin: 0 auto 2px; }
          .official-name-fallback { font-size: 24px; font-weight: 900; color: #059669; line-height: 1.15; }
          .official-name-fallback span { color: #1e3a8a; font-size: 16px; }
          .org-en { font-size: 14px; font-weight: 800; color: #052e16; margin-top: 2px; }`
  );
}

// 3. Force QR inside the certificate page.
text = text.replace(
  /\.qr-section\s*\{[^}]*\}/,
  `.qr-section { position: absolute; left: 10mm; bottom: 8mm; width: 42%; display: flex; align-items: center; justify-content: flex-start; gap: 10px; margin-top: 0; font-family: Arial, sans-serif; text-align: left; }`
);

text = text.replace(
  /\.qr-section img\s*\{[^}]*\}/,
  `.qr-section img { width: 72px; height: 72px; border: 1px solid #bbf7d0; padding: 4px; border-radius: 8px; background: #fff; }`
);

text = text.replace(
  /\.qr-text\s*\{[^}]*\}/,
  `.qr-text { text-align: left; max-width: 300px; font-size: 10px; color: #475569; line-height: 1.3; }`
);

// 4. Force signature area inside the certificate page.
text = text.replace(
  /\.signature-row\s*\{[^}]*\}/,
  `.signature-row { position: absolute; right: 10mm; bottom: 8mm; width: 50%; display: grid; grid-template-columns: 1fr 78px 1fr; gap: 12px; align-items: end; margin-top: 0; }`
);

text = text.replace(
  /\.signature img\s*\{[^}]*\}/,
  `.signature img { height: 56px; max-width: 170px; object-fit: contain; margin-bottom: 2px; }`
);

text = text.replace(
  /\.seal img\s*\{[^}]*\}/,
  `.seal img { width: 70px; height: 70px; object-fit: contain; }`
);

// 5. Force real secretary signature image.
text = text.replace(
  /<img src="\$\{CERTIFICATE_SETTINGS\.secretarySignatureUrl\}" onerror="this\.style\.display='none'" \/>/g,
  `<img src="/certificates/intizar-secretary-signature.png" onerror="this.style.display='none'" />`
);

text = text.replaceAll(
  `<div class="sig-line">INTIZAR Secretary Signature</div>`,
  `<div class="sig-line">INTIZAR Secretary</div>`
);

text = text.replaceAll(
  `<div class="sig-line">Secretary Signature</div>`,
  `<div class="sig-line">INTIZAR Secretary</div>`
);

fs.writeFileSync(path, text, "utf8");

if (!text.includes("intizar-official-name.png")) {
  throw new Error("Official name image was not added.");
}

if (!text.includes("intizar-secretary-signature.png")) {
  throw new Error("Secretary signature image was not added.");
}

if (!text.includes(".qr-section { position: absolute")) {
  throw new Error("QR section is not absolute.");
}

if (!text.includes(".signature-row { position: absolute")) {
  throw new Error("Signature row is not absolute.");
}

console.log("Certificate official assets and QR layout forced successfully.");
