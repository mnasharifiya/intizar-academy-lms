const fs = require("fs");

const path = "src/pages/admin/Reports.tsx";
let text = fs.readFileSync(path, "utf8");

function replaceFunction(source, functionName, replacement) {
  const start = source.indexOf(`function ${functionName}(`);
  if (start === -1) return source;

  const braceStart = source.indexOf("{", start);
  if (braceStart === -1) return source;

  let depth = 0;
  let end = braceStart;

  for (; end < source.length; end++) {
    const ch = source[end];

    if (ch === "{") depth++;
    if (ch === "}") depth--;

    if (depth === 0) {
      end++;
      break;
    }
  }

  return source.slice(0, start) + replacement + source.slice(end);
}

const newPrintReport = `function printReport(title: string, sections: { title: string; sub?: string; rows: any[] }[]) {
  const html = \`
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>\${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 28px; color: #0f172a; }
          h1 { color: #052e16; margin-bottom: 4px; }
          h2 { color: #166534; margin-top: 28px; border-bottom: 2px solid #dcfce7; padding-bottom: 6px; }
          p { color: #475569; }
          table { border-collapse: collapse; width: 100%; margin-top: 12px; page-break-inside: auto; }
          th { background: #dcfce7; color: #052e16; text-align: left; font-weight: bold; }
          th, td { border: 1px solid #94a3b8; padding: 8px; font-size: 12px; }
          tr { page-break-inside: avoid; }
          @media print { body { padding: 16px; } }
        </style>
      </head>
      <body>
        <h1>\${escapeHtml(title)}</h1>
        <p>Generated: \${new Date().toLocaleString()}</p>
        \${sections.map(section => \`
          <h2>\${escapeHtml(section.title)}</h2>
          <p>\${escapeHtml(section.sub || "")}</p>
          \${tableHtml(section.rows)}
        \`).join("")}
      </body>
    </html>
  \`;

  const iframe = document.createElement("iframe");

  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;

  if (!win || !doc) {
    alert("Could not open print dialog. Please use Download Sheet.");
    iframe.remove();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    win.focus();
    win.print();

    setTimeout(() => {
      iframe.remove();
    }, 1000);
  }, 300);
}`;

text = replaceFunction(text, "downloadPrintableReport", "");
text = replaceFunction(text, "printReport", newPrintReport);

text = text.replace(/downloadPrintableReport\(title, sections\);/g, 'printReport(title, sections);');

fs.writeFileSync(path, text, "utf8");

console.log("Reports.tsx printReport fixed.");
