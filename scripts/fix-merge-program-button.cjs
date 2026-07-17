const fs = require("fs");

const path = "src/pages/admin/Courses.tsx";
let text = fs.readFileSync(path, "utf8");

if (!text.includes("handleMergeDuplicatePrograms")) {
  console.error("handleMergeDuplicatePrograms function not found.");
  process.exit(1);
}

if (!text.includes("Merge All Duplicate Programs")) {
  text = text.replace(
    /(<h2 style=\{\{ marginTop: 0 \}\}>Delete unused programs<\/h2>\s*<p[\s\S]*?<\/p>)/,
    `$1

          <div style={{ marginBottom: 14 }}>
            <button
              type="button"
              onClick={handleMergeDuplicatePrograms}
              style={{
                border: 0,
                borderRadius: 12,
                padding: "10px 14px",
                fontWeight: 900,
                cursor: "pointer",
                background: "#16a34a",
                color: "#ffffff",
              }}
            >
              Merge All Duplicate Programs
            </button>
          </div>`
  );
}

fs.writeFileSync(path, text, "utf8");

console.log("Merge duplicate programs button connected.");
