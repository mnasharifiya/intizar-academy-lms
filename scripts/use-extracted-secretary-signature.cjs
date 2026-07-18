const fs = require("fs");

const path = "src/pages/admin/Certificates.tsx";
let text = fs.readFileSync(path, "utf8");

// Add clean transparent signature CSS
if (!text.includes(".secretary-signature-img")) {
  text = text.replace(
    "@media print {",
    `
          .secretary-signature-img {
            height: 54px;
            max-width: 190px;
            object-fit: contain;
            display: block;
            margin: 0 auto -2px;
            background: transparent;
          }

          @media print {`
  );
}

// Replace SVG/text signature with extracted transparent real signature ink
text = text.replace(
/<div class="signature signature-single">[\s\S]*?<\/div>\s*<\/div>/,
`<div class="signature signature-single">
                    <img class="secretary-signature-img" src="/certificates/intizar-secretary-signature-transparent.png" onerror="this.style.display='none'" />
                    <div class="sig-line"></div>
                    <div class="signature-name">Ali A Muhammad</div>
                    <div class="signature-role">INTIZAR Secretary</div>
                  </div>`
);

fs.writeFileSync(path, text, "utf8");

console.log("Real extracted transparent secretary signature placed on certificate.");
