const fs = require("fs");

const path = "src/pages/admin/Certificates.tsx";
let text = fs.readFileSync(path, "utf8");

// 1. Improve application matching: by createdStudentId OR student email.
text = text.replace(
`  function studentApplication(studentId: string) {
    return applications.find(app => app.createdStudentId === studentId) || null;
  }`,
`  function studentApplication(studentId: string) {
    const student = users.find((u: any) => u.id === studentId) || null;
    const email = String(student?.email || "").toLowerCase();

    return (
      applications.find(app => app.createdStudentId === studentId) ||
      applications.find(app => String(app.email || "").toLowerCase() === email) ||
      null
    );
  }`
);

// 2. Make eligibility use profile fallback and application fallback.
text = text.replace(
`      regNo: app?.finalRegNo || app?.suggestedRegNo || (student as any).regNo || null,
      branch: app?.branch || null,
      zone: app?.zone || null,`,
`      regNo: app?.finalRegNo || app?.suggestedRegNo || (student as any).regNo || null,
      branch: app?.branch || (student as any).office || (student as any).branch || null,
      zone: app?.zone || (student as any).rank || (student as any).zone || null,`
);

// 3. Force official name image with text fallback.
text = text.replace(
`              <img class="logo" src="/intizar-logo.jpg" />
              <div class="org">${CERTIFICATE_SETTINGS.organizationName}</div>`,
`              <img class="logo" src="/intizar-logo.jpg" />
              <img class="official-name-img" src="/certificates/intizar-official-name.png" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
              <div class="official-name-fallback" style="display:none">انتظار الامام المنتظر<br/><span>(تربین روح د غنغن حكي)</span></div>
              <div class="org-en">${escapeHtml(CERTIFICATE_SETTINGS.organizationName)}</div>`
);

text = text.replace(
`              <img class="logo" src="/intizar-logo.jpg" />
              <img class="official-name-img" src="/certificates/intizar-official-name.png" onerror="this.style.display=\\'none\\'" /><div class="org-en">${escapeHtml(CERTIFICATE_SETTINGS.organizationName)}</div>`,
`              <img class="logo" src="/intizar-logo.jpg" />
              <img class="official-name-img" src="/certificates/intizar-official-name.png" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
              <div class="official-name-fallback" style="display:none">انتظار الامام المنتظر<br/><span>(تربین روح د غنغن حكي)</span></div>
              <div class="org-en">${escapeHtml(CERTIFICATE_SETTINGS.organizationName)}</div>`
);

// 4. Add/force CSS for official name, QR, and signatures.
if (!text.includes(".official-name-fallback")) {
  text = text.replace(
`.official-name-img { width: 270px; max-height: 76px; object-fit: contain; display: block; margin: 0 auto 2px; }`,
`.official-name-img { width: 270px; max-height: 76px; object-fit: contain; display: block; margin: 0 auto 2px; }
          .official-name-fallback { font-size: 24px; font-weight: 900; color: #059669; line-height: 1.15; }
          .official-name-fallback span { color: #1e3a8a; font-size: 16px; }`
  );
}

text = text.replace(
`.qr-section { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 14px; font-family: Arial, sans-serif; }`,
`.qr-section { position: absolute; left: 10mm; bottom: 8mm; width: 42%; display: flex; align-items: center; justify-content: flex-start; gap: 10px; margin-top: 0; font-family: Arial, sans-serif; text-align: left; }`
);

text = text.replace(
`.qr-section { position: absolute; left: 0; bottom: 9mm; width: 43%; display: flex; align-items: center; justify-content: flex-start; gap: 10px; margin-top: 0; font-family: Arial, sans-serif; text-align: left; }`,
`.qr-section { position: absolute; left: 10mm; bottom: 8mm; width: 42%; display: flex; align-items: center; justify-content: flex-start; gap: 10px; margin-top: 0; font-family: Arial, sans-serif; text-align: left; }`
);

text = text.replace(
`.qr-section img { width: 84px; height: 84px; border: 1px solid #bbf7d0; padding: 5px; border-radius: 10px; background: #fff; }`,
`.qr-section img { width: 72px; height: 72px; border: 1px solid #bbf7d0; padding: 4px; border-radius: 8px; background: #fff; }`
);

text = text.replace(
`.qr-section img { width: 74px; height: 74px; border: 1px solid #bbf7d0; padding: 4px; border-radius: 8px; background: #fff; }`,
`.qr-section img { width: 72px; height: 72px; border: 1px solid #bbf7d0; padding: 4px; border-radius: 8px; background: #fff; }`
);

text = text.replace(
`.qr-text { text-align: left; max-width: 360px; font-size: 12px; color: #475569; line-height: 1.5; }`,
`.qr-text { text-align: left; max-width: 300px; font-size: 10px; color: #475569; line-height: 1.3; }`
);

text = text.replace(
`.qr-text { text-align: left; max-width: 310px; font-size: 10px; color: #475569; line-height: 1.35; }`,
`.qr-text { text-align: left; max-width: 300px; font-size: 10px; color: #475569; line-height: 1.3; }`
);

text = text.replace(
`.signature-row { display: grid; grid-template-columns: 1fr 110px 1fr; gap: 24px; align-items: end; margin-top: 14px; }`,
`.signature-row { position: absolute; right: 10mm; bottom: 8mm; width: 50%; display: grid; grid-template-columns: 1fr 78px 1fr; gap: 12px; align-items: end; margin-top: 0; }`
);

text = text.replace(
`.signature-row { position: absolute; right: 0; bottom: 9mm; width: 54%; display: grid; grid-template-columns: 1fr 82px 1fr; gap: 16px; align-items: end; margin-top: 0; }`,
`.signature-row { position: absolute; right: 10mm; bottom: 8mm; width: 50%; display: grid; grid-template-columns: 1fr 78px 1fr; gap: 12px; align-items: end; margin-top: 0; }`
);

text = text.replace(
`.signature img { height: 46px; object-fit: contain; margin-bottom: 4px; }`,
`.signature img { height: 56px; max-width: 170px; object-fit: contain; margin-bottom: 2px; }`
);

text = text.replace(
`.signature img { height: 58px; max-width: 170px; object-fit: contain; margin-bottom: 2px; }`,
`.signature img { height: 56px; max-width: 170px; object-fit: contain; margin-bottom: 2px; }`
);

// 5. Use real secretary image.
text = text.replace(
`<img src="${CERTIFICATE_SETTINGS.secretarySignatureUrl}" onerror="this.style.display='none'" />`,
`<img src="/certificates/intizar-secretary-signature.png" onerror="this.style.display='none'" />`
);

text = text.replaceAll(
`<div class="sig-line">Secretary Signature</div>`,
`<div class="sig-line">INTIZAR Secretary</div>`
);

text = text.replaceAll(
`<div class="sig-line">INTIZAR Secretary Signature</div>`,
`<div class="sig-line">INTIZAR Secretary</div>`
);

fs.writeFileSync(path, text, "utf8");

console.log("Certificate assets, branch/zone fallback, QR and signature layout patched.");
