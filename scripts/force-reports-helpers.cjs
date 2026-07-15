const fs = require("fs");

const path = "src/pages/admin/Reports.tsx";
let text = fs.readFileSync(path, "utf8");

const start = text.indexOf("function tableHtml");
const end = text.indexOf("const hero:", start);

if (start === -1 || end === -1 || end <= start) {
  console.error("Could not find Reports helper section.");
  process.exit(1);
}

const replacement = `
function tableHtml(rows: any[]) {
  if (!rows.length) return "<p>No records found.</p>";

  const headers = Object.keys(rows[0]);

  return "<table>" +
    "<thead><tr>" +
    headers.map(h => "<th>" + escapeHtml(formatHeader(h)) + "</th>").join("") +
    "</tr></thead>" +
    "<tbody>" +
    rows.map(row =>
      "<tr>" + headers.map(h => "<td>" + escapeHtml(String(row[h] ?? "-")) + "</td>").join("") + "</tr>"
    ).join("") +
    "</tbody></table>";
}

function downloadWorkbook(filename: string, sections: { title: string; sub?: string; rows: any[] }[]) {
  const html = "<html><head><meta charset=\\"UTF-8\\" />" +
    "<style>" +
    "body{font-family:Arial,sans-serif;}" +
    "h1{color:#052e16;}" +
    "h2{color:#166534;margin-top:24px;}" +
    "table{border-collapse:collapse;width:100%;margin-bottom:18px;}" +
    "th{background:#dcfce7;color:#052e16;font-weight:bold;}" +
    "th,td{border:1px solid #94a3b8;padding:8px;font-size:12px;}" +
    "</style></head><body>" +
    "<h1>INTIZAR Academy Report</h1>" +
    "<p>Generated: " + new Date().toLocaleString() + "</p>" +
    sections.map(section =>
      "<h2>" + escapeHtml(section.title) + "</h2>" +
      "<p>" + escapeHtml(section.sub || "") + "</p>" +
      tableHtml(section.rows)
    ).join("") +
    "</body></html>";

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function printReport(title: string, sections: { title: string; sub?: string; rows: any[] }[]) {
  const html = "<html><head><meta charset=\\"UTF-8\\" />" +
    "<title>" + escapeHtml(title) + "</title>" +
    "<style>" +
    "body{font-family:Arial,sans-serif;padding:28px;color:#0f172a;}" +
    "h1{color:#052e16;margin-bottom:4px;}" +
    "h2{color:#166534;margin-top:28px;border-bottom:2px solid #dcfce7;padding-bottom:6px;}" +
    "p{color:#475569;}" +
    "table{border-collapse:collapse;width:100%;margin-top:12px;page-break-inside:auto;}" +
    "th{background:#dcfce7;color:#052e16;text-align:left;font-weight:bold;}" +
    "th,td{border:1px solid #94a3b8;padding:8px;font-size:12px;}" +
    "tr{page-break-inside:avoid;}" +
    "@media print{body{padding:16px;}}" +
    "</style></head><body>" +
    "<h1>" + escapeHtml(title) + "</h1>" +
    "<p>Generated: " + new Date().toLocaleString() + "</p>" +
    sections.map(section =>
      "<h2>" + escapeHtml(section.title) + "</h2>" +
      "<p>" + escapeHtml(section.sub || "") + "</p>" +
      tableHtml(section.rows)
    ).join("") +
    "</body></html>";

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
}

function escapeHtml(value: string) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

`;

text = text.slice(0, start) + replacement + text.slice(end);

text = text.replace(/downloadPrintableReport\\([^)]*\\);/g, "");
text = text.replace(/function downloadPrintableReport[\\s\\S]*?function printReport/, "function printReport");

fs.writeFileSync(path, text, "utf8");

console.log("Reports helpers force replaced.");
