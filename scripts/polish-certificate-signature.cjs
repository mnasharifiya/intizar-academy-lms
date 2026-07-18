const fs = require("fs");

const path = "src/pages/admin/Certificates.tsx";
let text = fs.readFileSync(path, "utf8");

// Add clean override CSS before @media print
const cssPatch = `
          .signature-row {
            display: flex;
            justify-content: flex-end;
            align-items: flex-end;
            margin-top: 18px;
            padding-right: 14mm;
          }

          .signature.signature-single {
            width: 250px;
            margin-left: auto;
            text-align: center;
            transform: translateX(8mm);
          }

          .secretary-signature-img {
            height: 44px;
            max-width: 185px;
            object-fit: contain;
            display: block;
            margin: 0 auto 4px;
            background: transparent;
          }

          .sig-line {
            width: 220px;
            margin: 0 auto 4px;
            border-top: 3px solid #c62828;
            padding-top: 0;
          }

          .signature-name {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 14px;
            font-weight: 700;
            line-height: 1.05;
            color: #111827;
          }

          .signature-alias {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            font-style: italic;
            font-weight: 600;
            line-height: 1.05;
            color: #111827;
            margin-top: 1px;
          }

          .signature-role {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 12px;
            font-weight: 700;
            line-height: 1.05;
            color: #111827;
            margin-top: 6px;
          }
`;

if (!text.includes('.signature-alias')) {
  text = text.replace(/@media print \{/m, cssPatch + '\n          @media print {');
}

// Replace the current signature block
text = text.replace(
  /<div class="signature-row">[\s\S]*?<\/div>\s*<\/div>\s*<div class="footer">/,
  `<div class="signature-row">
                <div class="signature signature-single">
                  <img class="secretary-signature-img" src="/certificates/intizar-secretary-signature-transparent.png" onerror="this.style.display='none'" />
                  <div class="sig-line"></div>
                  <div class="signature-name">Ali A Muhammad</div>
                  <div class="signature-alias">Al-Ameen</div>
                  <div class="signature-role">INTIZAR Secretary</div>
                </div>
              </div>

              <div class="footer">`
);

fs.writeFileSync(path, text, "utf8");
console.log("Certificate signature polished.");
