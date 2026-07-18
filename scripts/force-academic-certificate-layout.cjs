const fs = require("fs");

const path = "src/pages/admin/Certificates.tsx";
let text = fs.readFileSync(path, "utf8");

// Add academic variables after QR generation
const qrBlock = `  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 150,
    margin: 1,
  });
`;

const academicVars = `  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 150,
    margin: 1,
  });

  const autoCheck = cert.eligibilitySnapshot?.autoCheck || {};
  const legacyCheck = cert.eligibilitySnapshot?.legacyCheck || {};

  const completedProgram = autoCheck?.program?.name || cert.programName || "-";
  const regNoText = autoCheck?.student?.reg_no || cert.regNo || "-";
  const branchText = autoCheck?.student?.branch || cert.branch || "-";
  const zoneText = autoCheck?.student?.zone || cert.zone || "-";

  const averageValue = autoCheck?.overall_average ?? legacyCheck?.average ?? null;
  const averageNumber = Number(averageValue || 0);

  const cgpaValue = autoCheck?.cgpa ?? (
    averageValue !== null && averageValue !== undefined && !Number.isNaN(Number(averageValue))
      ? (Number(averageValue) / 100) * 5
      : null
  );

  const cgpaText =
    cgpaValue === null || cgpaValue === undefined || Number.isNaN(Number(cgpaValue))
      ? "-"
      : Number(cgpaValue).toFixed(2);

  const classText =
    autoCheck?.class_of_completion ||
    (
      averageNumber >= 90 ? "First Class" :
      averageNumber >= 80 ? "Second Class" :
      averageNumber >= 70 ? "Third Class" :
      "Not eligible"
    );
`;

if (!text.includes("const completedProgram = autoCheck?.program?.name")) {
  if (!text.includes(qrBlock)) throw new Error("QR block not found.");
  text = text.replace(qrBlock, academicVars);
}

// Compact certificate CSS
text = text.replace(
  `.page { width: 297mm; height: 210mm; margin: 0 auto; background: #fff; position: relative; overflow: hidden; box-sizing: border-box; padding: 18mm; }`,
  `.page { width: 297mm; height: 210mm; margin: 0 auto; background: #fff; position: relative; overflow: hidden; box-sizing: border-box; padding: 12mm; }`
);

text = text.replace(
  `.border { border: 5px double #166534; height: 100%; box-sizing: border-box; padding: 12mm; position: relative; }`,
  `.border { border: 5px double #166534; height: 100%; box-sizing: border-box; padding: 9mm 11mm; position: relative; }`
);

text = text.replace(
  `.meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 22px; font-family: Arial, sans-serif; text-align: left;}`,
  `.meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 16px; font-family: Arial, sans-serif; text-align: left;}`
);

text = text.replace(
  `.qr-section { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 20px; font-family: Arial, sans-serif; }`,
  `.qr-section { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 14px; font-family: Arial, sans-serif; }`
);

// Replace old payment/admin certificate wording
text = text.replace(
  /<div class="body-text">[\s\S]*?payment, and administrative conditions for certification\.[\s\S]*?<\/div>/,
  `<div class="body-text">
                This is to certify that the above-named student has successfully completed the
                <span class="program">\${escapeHtml(completedProgram)}</span>
                under \${escapeHtml(CERTIFICATE_SETTINGS.organizationName)}, and has met the approved academic
                requirements for the award of this certificate.
              </div>`
);

// Replace metadata grid
const metaStart = text.indexOf('              <div class="meta-grid">');
const qrStart = text.indexOf('              <div class="qr-section">', metaStart);

if (metaStart === -1 || qrStart === -1) {
  throw new Error("Meta grid or QR section not found.");
}

const newMeta = `              <div class="meta-grid">
                <div class="meta-card"><div class="meta-label">Registration No</div><div class="meta-value">\${escapeHtml(regNoText)}</div></div>
                <div class="meta-card"><div class="meta-label">Program Completed</div><div class="meta-value">\${escapeHtml(completedProgram)}</div></div>
                <div class="meta-card"><div class="meta-label">Branch</div><div class="meta-value">\${escapeHtml(branchText)}</div></div>
                <div class="meta-card"><div class="meta-label">Zone</div><div class="meta-value">\${escapeHtml(zoneText)}</div></div>
                <div class="meta-card"><div class="meta-label">CGPA</div><div class="meta-value">\${escapeHtml(cgpaText)} / 5.00</div></div>
                <div class="meta-card"><div class="meta-label">Class of Completion</div><div class="meta-value">\${escapeHtml(classText)}</div></div>
                <div class="meta-card"><div class="meta-label">Certificate No</div><div class="meta-value">\${escapeHtml(cert.certificateNo)}</div></div>
                <div class="meta-card"><div class="meta-label">Issued Date</div><div class="meta-value">\${escapeHtml(issuedDate)}</div></div>
              </div>

`;

text = text.slice(0, metaStart) + newMeta + text.slice(qrStart);

// Improve QR wording
text = text.replace(
  `                  <strong>Scan to verify this certificate</strong>
                  This QR code opens the official INTIZAR certificate verification page.
                  <div class="verify-url">\${escapeHtml(verifyUrl)}</div>`,
  `                  <strong>Official Verification</strong>
                  Scan the QR code or verify using the certificate number and verification token.
                  <div><strong>Token:</strong> \${escapeHtml(cert.verificationToken)}</div>
                  <div class="verify-url">\${escapeHtml(verifyUrl)}</div>`
);

// Secretary wording
text = text.replaceAll(
  `<div class="sig-line">Secretary Signature</div>`,
  `<div class="sig-line">INTIZAR Secretary Signature</div>`
);

fs.writeFileSync(path, text, "utf8");

if (text.includes("payment, and administrative conditions")) {
  throw new Error("Old payment/admin wording still exists.");
}

if (!text.includes("Program Completed") || !text.includes("Class of Completion") || !text.includes("CGPA")) {
  throw new Error("Academic fields were not added.");
}

console.log("Certificate academic layout forced successfully.");
