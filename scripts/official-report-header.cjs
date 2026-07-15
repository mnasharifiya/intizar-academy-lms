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

function officialReportHeader(reportTitle: string) {
  return "<div class='official-header'>" +
    "<img src='/intizar-logo.jpg' class='report-logo' />" +
    "<div>" +
    "<div class='org-name'>INTIZAR Academy</div>" +
    "<div class='report-title'>" + escapeHtml(reportTitle) + "</div>" +
    "<div class='generated'>Generated: " + new Date().toLocaleString() + "</div>" +
    "</div>" +
    "</div>";
}

function downloadWorkbook(filename: string, sections: { title: string; sub?: string; rows: any[] }[]) {
  const reportTitle = filename
    .replace(/\\.xls$/i, "")
    .replace(/^intizar-/i, "")
    .replace(/-/g, " ")
    .replace(/^./, c => c.toUpperCase());

  const html = "<html><head><meta charset=\\"UTF-8\\" />" +
    "<style>" +
    "body{font-family:Arial,sans-serif;color:#0f172a;}" +
    ".official-header{display:flex;align-items:center;gap:14px;border-bottom:3px solid #166534;padding-bottom:14px;margin-bottom:20px;}" +
    ".report-logo{width:72px;height:72px;object-fit:contain;}" +
    ".org-name{font-size:24px;font-weight:bold;color:#052e16;}" +
    ".report-title{font-size:18px;font-weight:bold;color:#166534;text-transform:capitalize;margin-top:4px;}" +
    ".generated{font-size:12px;color:#475569;margin-top:4px;}" +
    "h2{color:#166534;margin-top:24px;}" +
    "p{color:#475569;}" +
    "table{border-collapse:collapse;width:100%;margin-bottom:18px;}" +
    "th{background:#dcfce7;color:#052e16;font-weight:bold;}" +
    "th,td{border:1px solid #94a3b8;padding:8px;font-size:12px;}" +
    "</style></head><body>" +
    officialReportHeader(reportTitle) +
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
    ".official-header{display:flex;align-items:center;gap:16px;border-bottom:3px solid #166534;padding-bottom:16px;margin-bottom:24px;}" +
    ".report-logo{width:82px;height:82px;object-fit:contain;}" +
    ".org-name{font-size:28px;font-weight:bold;color:#052e16;}" +
    ".report-title{font-size:20px;font-weight:bold;color:#166534;text-transform:capitalize;margin-top:5px;}" +
    ".generated{font-size:13px;color:#475569;margin-top:5px;}" +
    "h2{color:#166534;margin-top:28px;border-bottom:2px solid #dcfce7;padding-bottom:6px;}" +
    "p{color:#475569;}" +
    "table{border-collapse:collapse;width:100%;margin-top:12px;page-break-inside:auto;}" +
    "th{background:#dcfce7;color:#052e16;text-align:left;font-weight:bold;}" +
    "th,td{border:1px solid #94a3b8;padding:8px;font-size:12px;}" +
    "tr{page-break-inside:avoid;}" +
    "@media print{body{padding:16px;}.official-header{break-inside:avoid;}}" +
    "</style></head><body>" +
    officialReportHeader(title) +
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

fs.writeFileSync(path, text, "utf8");

console.log("Official report header added.");
