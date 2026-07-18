const fs = require("fs");

const path = "src/pages/admin/Certificates.tsx";
let text = fs.readFileSync(path, "utf8");

// 1. Make new certificates use DB auto-check data, not weak legacy fields.
text = text.replace(
`    const certificateNo = makeCertificateNo({
      regNo: e.regNo,
      programName: e.programName,
    });

    try {`,
`    const dbStudent = dbEligibility?.student || {};
    const dbProgram = dbEligibility?.program || {};
    const dbGroup = dbEligibility?.group || {};

    const certificateProgramName = dbProgram?.name || e.programName;
    const certificateRegNo = dbStudent?.reg_no || e.regNo || null;
    const certificateBranch = dbStudent?.branch || e.branch || null;
    const certificateZone = dbStudent?.zone || e.zone || null;

    const certificateNo = makeCertificateNo({
      regNo: certificateRegNo,
      programName: certificateProgramName,
    });

    try {`
);

text = text.replaceAll("programId: e.programId,", "programId: dbProgram?.id || e.programId,");
text = text.replaceAll("groupId: e.group?.id || null,", "groupId: dbGroup?.id || e.group?.id || null,");
text = text.replaceAll("regNo: e.regNo,", "regNo: certificateRegNo,");
text = text.replaceAll("programName: e.programName,", "programName: certificateProgramName,");
text = text.replaceAll("branch: e.branch,", "branch: certificateBranch,");
text = text.replaceAll("zone: e.zone,", "zone: certificateZone,");

// 2. Add academic values for certificate print.
const qrBlock = `  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 150,
    margin: 1,
  });

  doc.open();`;

const academicBlock = `  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 150,
    margin: 1,
  });

  const autoCheck = cert.eligibilitySnapshot?.autoCheck || {};
  const legacyCheck = cert.eligibilitySnapshot?.legacyCheck || {};

  const completedProgram = autoCheck?.program?.name || cert.programName || "-";
  const regNoText = autoCheck?.student?.reg_no || cert.regNo || "-";
  const branchText = autoCheck?.student?.branch || cert.branch || "-";
  const zoneText = autoCheck?.student?.zone || cert.zone || "-";

  const overallAverageValue = autoCheck?.overall_average ?? legacyCheck?.average ?? null;
  const overallAverageNumber = Number(overallAverageValue || 0);

  const overallAverageText =
    overallAverageValue === null || overallAverageValue === undefined || Number.isNaN(Number(overallAverageValue))
      ? "-"
      : Number(overallAverageValue).toFixed(2) + "%";

  const cgpaValue =
    autoCheck?.cgpa ??
    (
      overallAverageValue !== null &&
      overallAverageValue !== undefined &&
      !Number.isNaN(Number(overallAverageValue))
        ? (Number(overallAverageValue) / 100) * 5
        : null
    );

  const cgpaText =
    cgpaValue === null || cgpaValue === undefined || Number.isNaN(Number(cgpaValue))
      ? "-"
      : Number(cgpaValue).toFixed(2);

  const classText =
    autoCheck?.class_of_completion ||
    (
      overallAverageNumber >= 90 ? "First Class" :
      overallAverageNumber >= 80 ? "Second Class" :
      overallAverageNumber >= 70 ? "Third Class" :
      "Not eligible"
    );

  doc.open();`;

if (!text.includes("const autoCheck = cert.eligibilitySnapshot?.autoCheck")) {
  if (!text.includes(qrBlock)) throw new Error("QR block not found.");
  text = text.replace(qrBlock, academicBlock);
}

// 3. Improve certificate CSS to fit academic details properly.
text = text.replace(
`.page { width: 297mm; height: 210mm; margin: 0 auto; background: #fff; position: relative; overflow: hidden; box-sizing: border-box; padding: 18mm; }`,
`.page { width: 297mm; height: 210mm; margin: 0 auto; background: #fff; position: relative; overflow: hidden; box-sizing: border-box; padding: 12mm; }`
);

text = text.replace(
`.border { border: 5px double #166534; height: 100%; box-sizing: border-box; padding: 12mm; position: relative; }`,
`.border { border: 5px double #166534; height: 100%; box-sizing: border-box; padding: 9mm 11mm; position: relative; }`
);

text = text.replace(
`.logo { width: 86px; height: 86px; object-fit: contain; margin-bottom: 8px; }`,
`.logo { width: 70px; height: 70px; object-fit: contain; margin-bottom: 6px; }`
);

text = text.replace(
`.cert-title { margin-top: 18px; font-size: 42px; font-weight: 900; color: #166534; letter-spacing: 3px; text-transform: uppercase; }`,
`.cert-title { margin-top: 12px; font-size: 38px; font-weight: 900; color: #166534; letter-spacing: 3px; text-transform: uppercase; }`
);

text = text.replace(
`.student-name { margin: 12px auto 8px; font-size: 40px; font-weight: 900; color: #111827; border-bottom: 2px solid #166534; display: inline-block; padding: 0 28px 8px; }`,
`.student-name { margin: 10px auto 6px; font-size: 36px; font-weight: 900; color: #111827; border-bottom: 2px solid #166534; display: inline-block; padding: 0 28px 6px; }`
);

text = text.replace(
`.body-text { margin: 18px auto 0; max-width: 840px; font-size: 18px; line-height: 1.75; color: #334155; }`,
`.body-text { margin: 14px auto 0; max-width: 920px; font-size: 17px; line-height: 1.55; color: #334155; }`
);

text = text.replace(
`.meta-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-top: 22px; font-family: Arial, sans-serif; text-align: left;}`,
`.meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 16px; font-family: Arial, sans-serif; text-align: left;}`
);

text = text.replace(
`.meta-card { border: 1px solid #bbf7d0; background: #f0fdf4; border-radius: 12px; padding: 10px 12px; font-size: 12px; }`,
`.meta-card { border: 1px solid #bbf7d0; background: #f0fdf4; border-radius: 10px; padding: 8px 10px; font-size: 11px; }`
);

text = text.replace(
`.qr-section { display: flex; align-items: center; justify-content: center; gap: 14px; margin-top: 20px; font-family: Arial, sans-serif; }`,
`.qr-section { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 14px; font-family: Arial, sans-serif; }`
);

text = text.replace(
`.qr-section img { width: 92px; height: 92px; border: 1px solid #bbf7d0; padding: 6px; border-radius: 10px; background: #fff; }`,
`.qr-section img { width: 84px; height: 84px; border: 1px solid #bbf7d0; padding: 5px; border-radius: 10px; background: #fff; }`
);

text = text.replace(
`.signature-row { display: grid; grid-template-columns: 1fr 120px 1fr; gap: 28px; align-items: end; margin-top: 24px; }`,
`.signature-row { display: grid; grid-template-columns: 1fr 110px 1fr; gap: 24px; align-items: end; margin-top: 14px; }`
);

text = text.replace(
`.signature img { height: 56px; object-fit: contain; margin-bottom: 4px; }`,
`.signature img { height: 46px; object-fit: contain; margin-bottom: 4px; }`
);

text = text.replace(
`.seal img { width: 110px; height: 110px; object-fit: contain; }`,
`.seal img { width: 88px; height: 88px; object-fit: contain; }`
);

// 4. Replace certificate wording: remove payment/admin language.
text = text.replace(
`              <div class="cert-title">Certificate</div>
              <div class="small-title">of Completion</div>`,
`              <div class="cert-title">Certificate</div>
              <div class="small-title">of Completion</div>`
);

text = text.replace(
`              <div class="body-text">
                for successfully completing the requirements of
                <span class="program">\${escapeHtml(cert.programName)}</span>
                under \${CERTIFICATE_SETTINGS.organizationName}, having satisfied the approved assessment,
                payment, and administrative conditions for certification.
              </div>`,
`              <div class="body-text">
                This is to certify that the above-named student has successfully completed the
                <span class="program">\${escapeHtml(completedProgram)}</span>
                under \${escapeHtml(CERTIFICATE_SETTINGS.organizationName)}, and has met the approved academic
                requirements for the award of this certificate.
              </div>`
);

// 5. Replace meta grid with academic details.
const metaStart = text.indexOf('              <div class="meta-grid">');
const qrStart = text.indexOf('              <div class="qr-section">', metaStart);

if (metaStart === -1 || qrStart === -1const qrStart = text.indexOf('              <div class="qr-section">', metaStart);

if (metaStart === -1 || qrStart === -1) {
  throw new Error("Could not find certificate meta grid.");
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

// 6. Improve QR/verification wording.
text = text.replace(
`                  <strong>Scan to verify this certificate</strong>
                  This QR code opens the official INTIZAR certificate verification page.
                  <div class="verify-url">\${escapeHtml(verifyUrl)}</div>`,
`                  <strong>Official Verification</strong>
                  Scan the QR code or verify using the certificate number and verification token below.
                  <div><strong>Token:</strong> \${escapeHtml(cert.verificationToken)}</div>
                  <div class="verify-url">\${escapeHtml(verifyUrl)}</div>`
);

// 7. Rename secretary line to official INTIZAR secretary.
text = text.replaceAll(
  `<div class="sig-line">Secretary Signature</div>`,
  `<div class="sig-line">INTIZAR Secretary Signature</div>`
);

fs.writeFileSync(path, text, "utf8");

console.log("Academic certificate design patched.");
