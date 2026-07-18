const fs = require("fs");

const path = "src/pages/admin/Certificates.tsx";
let text = fs.readFileSync(path, "utf8");

// 1. Add/replace header CSS: bigger left/right logos and centered org name.
text = text.replace(
/\.logo\s*\{[^}]*\}/,
`.logo { width: 74px; height: 74px; object-fit: contain; }`
);

if (!text.includes(".cert-header")) {
  text = text.replace(
`.org-en { font-size: 12px; font-weight: 800; color: #052e16; margin-top: 1px; }`,
`.org-en { font-size: 14px; font-weight: 800; color: #052e16; margin-top: 4px; }
          .cert-header { display: grid; grid-template-columns: 90px 1fr 90px; align-items: center; column-gap: 12px; }
          .header-logo-left, .header-logo-right { display: flex; align-items: center; justify-content: center; }
          .header-logo-right img { transform: scaleX(-1); }
          .header-title { text-align: center; }
          .org-ar { font-size: 31px; font-weight: 900; color: #059669; line-height: 1.08; }
          .org-sub-ar { font-size: 18px; font-weight: 800; color: #1e3a8a; line-height: 1.1; margin-top: 2px; }`
  );
} else {
  text = text.replace(/\.cert-header\s*\{[^}]*\}/, `.cert-header { display: grid; grid-template-columns: 90px 1fr 90px; align-items: center; column-gap: 12px; }`);
  text = text.replace(/\.org-ar\s*\{[^}]*\}/, `.org-ar { font-size: 31px; font-weight: 900; color: #059669; line-height: 1.08; }`);
  text = text.replace(/\.org-sub-ar\s*\{[^}]*\}/, `.org-sub-ar { font-size: 18px; font-weight: 800; color: #1e3a8a; line-height: 1.1; margin-top: 2px; }`);
}

// 2. Replace header HTML with left-logo / center-name / right-logo.
text = text.replace(
/<div>\s*<img class="logo" src="\/intizar-logo\.jpg" \/>\s*<div class="org-ar">[\s\S]*?<\/div>\s*<div class="org-sub-ar">[\s\S]*?<\/div>\s*<div class="org-en">\$\{escapeHtml\(CERTIFICATE_SETTINGS\.organizationName\)\}<\/div>\s*<\/div>/,
`<div class="cert-header">
                <div class="header-logo-left">
                  <img class="logo" src="/intizar-logo.jpg" />
                </div>

                <div class="header-title">
                  <div class="org-ar">انتظار الامام المنتظر</div>
                  <div class="org-sub-ar">(تربین روح د غنغن حكي)</div>
                  <div class="org-en">\${escapeHtml(CERTIFICATE_SETTINGS.organizationName)}</div>
                </div>

                <div class="header-logo-right">
                  <img class="logo" src="/intizar-logo.jpg" />
                </div>
              </div>`
);

// 3. Make signature look like a real drawn certificate signature using inline SVG, not photo.
if (!text.includes(".signature-svg")) {
  text = text.replace(
/\.signature-name\s*\{[^}]*\}/,
`.signature-name { font-size: 12px; font-weight: 800; color: #111827; margin-top: 2px; }`
  );

  text = text.replace(
/\.signature-role\s*\{[^}]*\}/,
`.signature-role { font-size: 11px; font-weight: 800; color: #111827; margin-top: 2px; }`
  );

  text = text.replace(
/\.sig-line\s*\{[^}]*\}/,
`.sig-line { border-top: 2px solid #111827; width: 100%; margin-top: 2px; }
          .signature-svg { width: 210px; height: 54px; display: block; margin: 0 auto -4px; }
          .signature-svg text { font-family: "Segoe Script", "Brush Script MT", "Lucida Handwriting", cursive; font-size: 27px; font-style: italic; fill: #1d4ed8; font-weight: 700; }
          .signature-svg path { stroke: #1d4ed8; stroke-width: 2.2; fill: none; stroke-linecap: round; }`
  );
}

// 4. Replace signature block with inline SVG signature.
// This is not a photo; it is part of the certificate HTML.
text = text.replace(
/<div class="signature signature-single">[\s\S]*?<div class="sig-line"><\/div>\s*<\/div>/,
`<div class="signature signature-single">
                    <svg class="signature-svg" viewBox="0 0 260 70" aria-label="Secretary signature">
                      <path d="M18 45 C40 20, 62 55, 84 32 C102 16, 116 48, 134 30 C150 14, 164 48, 184 32 C202 18, 220 36, 242 24" />
                      <text x="34" y="43">Ali A Muhammad</text>
                    </svg>
                    <div class="sig-line"></div>
                    <div class="signature-name">Ali A Muhammad</div>
                    <div class="signature-role">INTIZAR Secretary</div>
                  </div>`
);

fs.writeFileSync(path, text, "utf8");

console.log("Final header logo and drawn secretary signature patched.");
