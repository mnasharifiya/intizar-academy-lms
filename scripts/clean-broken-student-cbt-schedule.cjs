const fs = require("fs");

const path = "src/pages/student/CbtExams.tsx";
let text = fs.readFileSync(path, "utf8");

// Remove the broken inline schedule block that uses exam outside the exam loop
const startText = '<div style={scheduleBox}>';
const titleText = '<strong>CBT Schedule</strong>';

let changed = false;

while (text.includes(titleText)) {
  const titleIndex = text.indexOf(titleText);
  const start = text.lastIndexOf(startText, titleIndex);

  if (start === -1) break;

  let end = text.indexOf('</div>\n\n', titleIndex);

  if (end === -1) {
    end = text.indexOf('</div>\r\n\r\n', titleIndex);
  }

  if (end === -1) {
    console.error("Could not safely find end of broken schedule block.");
    break;
  }

  end = text.indexOf('\n', end + 6);
  if (end === -1) end = text.length;

  text = text.slice(0, start) + text.slice(end);
  changed = true;
}

fs.writeFileSync(path, text, "utf8");

console.log(changed ? "Broken schedule block removed." : "No broken schedule block found.");
