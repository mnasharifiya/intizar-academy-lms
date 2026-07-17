const fs = require("fs");

const apiPath = "src/lib/api.ts";
let api = fs.readFileSync(apiPath, "utf8");

if (!api.includes("export async function mergeDuplicatePrograms")) {
  api += `

export async function mergeDuplicatePrograms() {
  const { data, error } = await (supabase as any).rpc("merge_all_duplicate_programs");

  if (error) throw error;

  return data ?? [];
}
`;
  fs.writeFileSync(apiPath, api, "utf8");
}

const pagePath = "src/pages/admin/Courses.tsx";
let text = fs.readFileSync(pagePath, "utf8");

// Add mergeDuplicatePrograms to api import
text = text.replace(
  /import\s*\{([^}]+)\}\s*from\s*["']\.\.\/\.\.\/lib\/api["'];/,
  (match, names) => {
    if (names.includes("mergeDuplicatePrograms")) return match;
    return `import {${names}, mergeDuplicatePrograms } from "../../lib/api";`;
  }
);

// Add handler before handleDeleteProgram
if (!text.includes("async function handleMergeDuplicatePrograms")) {
  text = text.replace(
    "  async function handleDeleteProgram",
    `  async function handleMergeDuplicatePrograms() {
    const ok = confirm(
      "This will merge all duplicate programs with the same name, move their records to one program, and delete the duplicates. Continue?"
    );

    if (!ok) return;

    try {
      const result = await mergeDuplicatePrograms();
      const totalRemoved = result.reduce((sum: number, row: any) => sum + Number(row.removed_count || 0), 0);

      alert("Duplicate program merge completed. Removed duplicates: " + totalRemoved);

      window.location.reload();
    } catch (err: any) {
      alert(err?.message || "Could not merge duplicate programs.");
    }
  }

  async function handleDeleteProgram`
  );
}

// Add merge card before delete unused programs card
if (!text.includes("Merge duplicate programs")) {
  const marker = "        <Card>\\n          <h2 style={{ marginTop: 0 }}>Delete unused programs</h2>";
  const mergeCard = `        <Card>
          <h2 style={{ marginTop: 0 }}>Merge duplicate programs</h2>
          <p style={{ color: C.muted, marginTop: 0 }}>
            Use this to automatically merge all duplicate program names, move their records, and remove the duplicate rows.
          </p>

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
        </Card>

`;

  if (text.includes(marker)) {
    text = text.replace(marker, mergeCard + marker);
  } else {
    text = text.replace(
      /\\n\\s*\\{filteredCourses\\.length === 0/,
      "\\n" + mergeCard + "      {filteredCourses.length === 0"
    );
  }
}

fs.writeFileSync(pagePath, text, "utf8");

console.log("Merge duplicate programs UI added.");
