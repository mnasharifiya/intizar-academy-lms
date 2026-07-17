const fs = require("fs");

const apiPath = "src/lib/api.ts";
let api = fs.readFileSync(apiPath, "utf8");

if (!api.includes("export async function deleteCourse")) {
  api += `

export async function deleteCourse(courseId: string) {
  const { error } = await (supabase as any).rpc("delete_unused_course", {
    p_course_id: courseId,
  });

  if (error) throw error;

  return true;
}
`;
  fs.writeFileSync(apiPath, api, "utf8");
}

const pagePath = "src/pages/admin/Courses.tsx";
let text = fs.readFileSync(pagePath, "utf8");

// Add deleteCourse to api import
text = text.replace(
  /import\s*\{([^}]+)\}\s*from\s*["']\.\.\/\.\.\/lib\/api["'];/,
  (match, names) => {
    if (names.includes("deleteCourse")) return match;
    return `import {${names}, deleteCourse } from "../../lib/api";`;
  }
);

// Add helper functions before return
if (!text.includes("async function handleDeleteCourse")) {
  text = text.replace(
    /\n\s*return\s*\(/,
    `
  function courseDisplayName(course: any) {
    return course.name || course.title || course.course_name || "Untitled course";
  }

  function isCourseUsed(courseId: string) {
    return levelCourses.some((lc: any) => lc.course_id === courseId || lc.courseId === courseId);
  }

  async function handleDeleteCourse(course: any) {
    const name = courseDisplayName(course);

    if (isCourseUsed(course.id)) {
      alert("This course is assigned to a program. Remove the program assignment first before deleting.");
      return;
    }

    const ok = confirm(
      "Are you sure you want to delete " + name + "? This should only be used for duplicate or unused courses."
    );

    if (!ok) return;

    try {
      await deleteCourse(course.id);

      setData((d: any) => ({
        ...d,
        courses: (d.courses ?? []).filter((c: any) => c.id !== course.id),
        levelCourses: (d.levelCourses ?? []).filter(
          (lc: any) => lc.course_id !== course.id && lc.courseId !== course.id
        ),
      }));

      alert("Course deleted successfully.");
    } catch (err: any) {
      alert(err?.message || "Could not delete course.");
    }
  }

  return (`
  );
}

// Add delete section before empty state
if (!text.includes("Delete unused courses")) {
  text = text.replace(
    /\n\s*\{filteredCourses\.length === 0/,
    `
        <Card style={{ marginTop: 16 }}>
          <h2 style={{ marginTop: 0 }}>Delete unused courses</h2>
          <p style={{ color: C.muted, marginTop: 0 }}>
            Main Admin can delete duplicate or unused courses. Courses assigned to programs are blocked.
          </p>

          <div style={{ display: "grid", gap: 10 }}>
            {filteredCourses.map((course: any) => {
              const used = isCourseUsed(course.id);

              return (
                <div
                  key={"delete-" + course.id}
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
                    <strong>{courseDisplayName(course)}</strong>
                    <div style={{ color: C.muted, fontSize: 13 }}>
                      {used ? "Assigned to a program. Cannot delete here." : "Unused course. Safe to delete if duplicate."}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={used}
                    onClick={() => handleDeleteCourse(course)}
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

      {filteredCourses.length === 0`
  );
}

fs.writeFileSync(pagePath, text, "utf8");

console.log("Course delete UI and API patched.");
