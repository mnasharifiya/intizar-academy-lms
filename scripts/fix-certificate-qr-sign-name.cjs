const fs = require("fs");

const path = "src/pages/admin/Certificates.tsx";
let text = fs.readFileSync(path, "utf8");

// Use official Arabic/Hausa organization-name image
text = text.replace(
  '<div class="org">${CERTIFICATE_SETTINGS.organizationName}</div>',
  '<img class="official-name-img" src="/certificates/intizar-official-name.png" onerror="this.style.display=\\'none\\'" /><div class="org-en">${escapeHtml(CERTIFICATE_SETTINGS.organizationName)}</div>'
);

// Add/adjust CSS
if (!text.includes(".official-name-img")) {
  text = text.replace(
    `.org { font-size: 26px; font-weight: 900; color: #052e16; letter-spacing: 1px; }`,
    `.org { font-size: 26px; font-weight: 900; color: #052e16; letter-spacing: 1px; }
          .official-name-img { width: 270px; max-height: 76px; object-fit: contain; display: block; margin: 0 auto 2px; }
          .org-en { font-size: 15px; font-weight: 800; color: #052e16; margin-top: 2px; }`
  );
}

text = text.replace(
  `.content { position: relative; z-index: 2; text-align: center; }`,
  `.content { position: relative; z-index: 2; text-align: center; height: 100%; }`
);

text = text.replace(
  `.logo { width: 70px; height: 70px; object-fit: contain; margin-bottom: 6px; }`,
  `.logo { width: 50px; height: 50px; object-fit: contain; margin-bottom: 3px; }`
);

text = text.replace(
  `.cert-title { margin-top: 12px; font-size: 38px; font-weight: 900; color: #166534; letter-spacing: 3px; text-transform: uppercase; }`,
  `.cert-title { margin-top: 8px; font-size: 34px; font-weight: 900; color: #166534; letter-spacing: 3px; text-transform: uppercase; }`
);

text = text.replace(
  `.student-name { margin: 10px auto 6px; font-size: 36px; font-weight: 900; color: #111827; border-bottom: 2px solid #166534; display: inline-block; padding: 0 28px 6px; }`,
  `.student-name { margin: 8px auto 5px; font-size: 32px; font-weight: 900; color: #111827; border-bottom: 2px solid #166534; display: inline-block; padding: 0 28px 5px; }`
);

text = text.replace(
  `.body-text { margin: 14px auto 0; max-width: 920px; font-size: 17px; line-height: 1.55; color: #334155; }`,
  `.body-text { margin: 10px auto 0; max-width: 930px; font-size: 15px; line-height: 1.45; color: #334155; }`
);

text = text.replace(
  `.meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 16px; font-family: Arial, sans-serif; text-align: left;}`,
  `.meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 12px; font-family: Arial, sans-serif; text-align: left;}`
);

text = text.replace(
  `.meta-card { border: 1px solid #bbf7d0; background: #f0fdf4; border-radius: 10px; padding: 8px 10px; font-size: 11px; }`,
  `.meta-card { border: 1px solid #bbf7d0; background: #f0fdf4; border-radius: 9px; padding: 6px 8px; font-size: 10px; }`
);

// Force QR inside certificate page
text = text.replace(
  `.qr-section { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 14px; font-family: Arial, sans-serif; }`,
  `.qr-section { position: absolute; left: 0; bottom: 9mm; width: 43%; display: flex; align-items: center; justify-content: flex-start; gap: 10px; margin-top: 0; font-family: Arial, sans-serif; text-align: left; }`
);

text = text.replace(
  `.qr-section img { width: 84px; height: 84px; border: 1px solid #bbf7d0; padding: 5px; border-radius: 10px; background: #fff; }`,
  `.qr-section img { width: 74px; height: 74px; border: 1px solid #bbf7d0; padding: 4px; border-radius: 8px; background: #fff; }`
);

text = text.replace(
  `.qr-text { text-align: left; max-width: 360px; font-size: 12px; color: #475569; line-height: 1.5; }`,
  `.qr-text { text-align: left; max-width: 310px; font-size: 10px; color: #475569; line-height: 1.35; }`
);

// Force signatures inside certificate page
text = text.replace(
  `.signature-row { display: grid; grid-template-columns: 1fr 110px 1fr; gap: 24px; align-items: end; margin-top: 14px; }`,
  `.signature-row { position: absolute; right: 0; bottom: 9mm; width: 54%; display: grid; grid-template-columns: 1fr 82px 1fr; gap: 16px; align-items: end; margin-top: 0; }`
);

text = text.replace(
  `.signature img { height: 46px; object-fit: contain; margin-bottom: 4px; }`,
  `.signature img { height: 58px; max-width: 170px; object-fit: contain; margin-bottom: 2px; }`
);

text = text.replace(
  `.seal img { width: 88px; height: 88px; object-fit: contain; }`,
  `.seal img { width: 70px; height: 70px; object-fit: contain; }`
);

// Use real secretary sign image
text = text.replace(
  `<img src="${CERTIFICATE_SETTINGS.secretarySignatureUrl}" onerror="this.style.display='none'" />`,
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

console.log("Certificate QR, official name, and secretary signature fixed.");
