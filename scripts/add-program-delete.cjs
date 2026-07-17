const fs = require("fs");

const apiPath = "src/lib/api.ts";
let api = fs.readFileSync(apiPath, "utf8");

if (!api.includes("export async function deleteProgram")) {
  api += `

export async function deleteProgram(programId: string) {
  const { error } = await (supabase as any).rpc("delete_unused_program", {
    p_program_id: programId,
  });

  if (error) throw error;

  return true;
}
`;
  fs.writeFileSync(apiPath, api, "utf8");
}

const pagePath = "src/pages/admin/Courses.tsx";
let text = fs.readFileSync(pagePath, "utf8");

// Add deleteProgram to api import
text = text.replace(
  /import\s*\{([^}]+)\}\s*from\s*["']\.\.\/\.\.\/lib\/api["'];/,
  (match, names) => {
    if (names.includes("deleteProgram")) return match;
    return `import {${names}, deleteProgram } from "../../lib/api";`;
  }
);

// Add helper functions before component return
if (!text.includes("async function handleDeleteProgram")) {
  text = text.replace(
    /\n\s*return\s*\(/,
    `
  function programDisplayName(program: any) {
    return program.name || program.title || program.program_name || "Untitled program";
  }

  function isProgramUsed(programId: string) {
    const groups = data?.groups ?? [];
    const users = data?.users ?? [];

    const hasGroup = groups.some((g: any) => g.levelId === programId || g.level_id === programId);
    const hasUser = users.some((u: any) => u.levelId === programId || u.level_id === programId);

    return hasGroup || hasUser;
  }

  async function handleDeleteProgram(program: any) {
    const name = programDisplayName(program);

    if (isProgramUsed(program.id)) {
      alert("This program already has groups or users. Move/delete those records first before deleting the program.");
      return;
    }

    const ok = confirm(
      "Are you sure you want to delete " + name + "? Its course assignments will also be removed."
    );

    if (!ok) return;

    try {
      await deleteProgram(program.id);

      setData((d: any) => ({
        ...d,
        levels: (d.levels ?? []).filter((p: any) => p.id !== program.id),
        levelCourses: (d.levelCourses ?? []).filter(
          (lc: any) => lc.level_id !== program.id && lc.levelId !== program.id
        ),
      }));

      alert("Program deleted successfully.");
    } catch (err: any) {
      alert(err?.message || "Could not delete program.");
    }
  }

  return (`
  );
}

// Add Delete unused programs UI
if (!text.includes("Delete unused programs")) {
  const programCard = `
        <Card>
          <h2 style={{ marginTop: 0 }}>Delete unused programs</h2>
          <p style={{ color: C.muted, marginTop: 0 }}>
            Main Admin can delete duplicate or unused programs. Programs with groups or users are blocked.
          </p>

          <div style={{ display: "grid", gap: 10 }}>
            {levels.map((program: any) => {
              const used = isProgramUsed(program.id);

              return (
                <div
                  key={"delete-program-" + program.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    border: "1px solid #e5e7eb",
                    borderRadius: 12,
                    padding: 12,
                    background: "#ffffff",
                  }}
                >
                  <div>
                    <strong>{programDisplayName(program)}</strong>
                    <div style={{ color: C.muted, fontSize: 13 }}>
                      {used ? "Used by groups/users. Cannot delete here." : "Unused program. Safe to delete if duplicate."}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={used}
                    onClick={() => handleDeleteProgram(program)}
                    style={{
                      border: 0,
                      borderRadius: 10,
                      padding: "8px 12px",
                      fontWeight: 800,
                      cursor: used ? "not-allowed" : "pointer",
                      background: used ? "#e5e7eb" : "#dc2626",
                      color: used ? "#64748b" : "#ffffff",
                    }}
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        </Card>

`;

  if (text.includes("<h2 style={{ marginTop: 0 }}>Delete unused courses</h2>")) {
    text = text.replace(
      "        <Card>\n          <h2 style={{ marginTop: 0 }}>Delete unused courses</h2>",
      programCard + "        <Card>\n          <h2 style={{ marginTop: 0 }}>Delete unused courses</h2>"
    );
  } else {
    text = text.replace(
      /\n\s*\{filteredCourses\.length === 0/,
      "\n" + programCard + "      {filteredCourses.length === 0"
    );
  }
}

fs.writeFileSync(pagePath, text, "utf8");

console.log("Program delete UI patched.");
