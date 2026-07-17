import { useMemo, useState, type CSSProperties } from "react";
import { PageHeader, Card, Button, Input } from "../../components/common/ui";
import { C } from "../../lib/theme";
import { createCourse, addLevelCourse, removeLevelCourse , deleteCourse , deleteProgram , mergeDuplicatePrograms } from "../../lib/api";

export default function CoursesPage({ data, setData }: { data: any; setData: any }) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });

  const courses = data?.courses ?? [];
  const levels = data?.levels ?? [];
  const levelCourses = data?.levelCourses ?? [];
  const users = data?.users ?? [];
  const groups = data?.groups ?? [];

  const filteredCourses = useMemo(() => {
    const s = search.toLowerCase();
    return courses.filter((c: any) =>
      c.name?.toLowerCase().includes(s) ||
      c.description?.toLowerCase().includes(s)
    );
  }, [courses, search]);

  async function saveCourse() {
    if (!form.name.trim()) {
      alert("Course name is required.");
      return;
    }

    const newCourse = await createCourse({
      name: form.name.trim(),
      description: form.description.trim(),
    });

    setData((d: any) => ({
      ...d,
      courses: [...d.courses, newCourse],
    }));

    setShowAdd(false);
    setForm({ name: "", description: "" });
  }

  async function toggleLevel(courseId: string, levelId: string, checked: boolean) {
    if (checked) {
      await addLevelCourse(levelId, courseId);
      setData((d: any) => ({
        ...d,
        levelCourses: [...d.levelCourses, { levelId, courseId }],
      }));
    } else {
      await removeLevelCourse(levelId, courseId);
      setData((d: any) => ({
        ...d,
        levelCourses: d.levelCourses.filter(
          (lc: any) => !(lc.levelId === levelId && lc.courseId === courseId)
        ),
      }));
    }
  }

  function getCourseStats(courseId: string) {
    const assignedLevelIds = levelCourses
      .filter((lc: any) => lc.courseId === courseId)
      .map((lc: any) => lc.levelId);

    const students = users.filter(
      (u: any) => u.role === "student" && assignedLevelIds.includes(u.levelId)
    );

    const instructorIds = new Set(
      groups
        .filter((g: any) => assignedLevelIds.includes(g.levelId) && g.instructorId)
        .map((g: any) => g.instructorId)
    );

    return {
      levelCount: assignedLevelIds.length,
      studentCount: students.length,
      instructorCount: instructorIds.size,
    };
  }
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

  async function handleMergeDuplicatePrograms() {
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

  return (
    <div>
      <PageHeader
        title="Courses"
        sub={courses.length + " courses in the system"}
        action={<Button onClick={() => setShowAdd(true)}>+ Add Course</Button>}
      />

      <Card>
        <div style={{display:"grid",gridTemplateColumns:"1fr 180px",gap:12}}>
          <Input
            value={search}
            onChange={setSearch}
            placeholder="Search courses by name or description"
          />
          <Button variant="secondary" onClick={() => setSearch("")}>Clear</Button>
        </div>
      </Card>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:18,marginTop:18}}>
        {filteredCourses.map((course: any) => {
          const stats = getCourseStats(course.id);

          return (
            <Card key={course.id}>
              <div style={{display:"flex",justifyContent:"space-between",gap:12,marginBottom:12}}>
                <div>
                  <h3 style={{margin:"0 0 6px",fontSize:19,color:C.text}}>{course.name}</h3>
                  <p style={{margin:0,color:C.muted,fontSize:14,lineHeight:1.6}}>
                    {course.description || "No course description yet."}
                  </p>
                </div>

                <div style={{
                  width:48,
                  height:48,
                  borderRadius:14,
                  background:C.surface,
                  color:C.primary,
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  fontWeight:900,
                  flexShrink:0,
                }}>
                  {course.name?.slice(0,2).toUpperCase()}
                </div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,margin:"16px 0"}}>
                <MiniStat label="Programs" value={stats.levelCount} />
                <MiniStat label="Students" value={stats.studentCount} />
                <MiniStat label="Instructors" value={stats.instructorCount} />
              </div>

              <div style={{fontWeight:800,fontSize:13,color:C.text,marginBottom:10}}>
                Assign to Levels
              </div>

              <div style={{display:"grid",gap:8}}>
                {levels.map((level: any) => {
                  const checked = levelCourses.some(
                    (lc: any) => lc.courseId === course.id && lc.levelId === level.id
                  );

                  return (
                    <label key={level.id} style={levelRow}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={e => toggleLevel(course.id, level.id, e.target.checked)}
                      />
                      <span style={{fontWeight:700}}>{level.name}</span>
                      <span style={{fontSize:12,color:C.muted}}>{level.category}</span>
                    </label>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

        <Card>
          <h2 style={{ marginTop: 0 }}>Delete unused programs</h2>
          <p style={{ color: C.muted, marginTop: 0 }}>
            Main Admin can delete duplicate or unused programs. Programs with groups or users are blocked.
          </p>

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
          </div>

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

        <Card>
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

      {filteredCourses.length === 0 && (
        <Card>
          <p style={{color:C.muted,margin:0}}>No courses found.</p>
        </Card>
      )}

      {showAdd && (
        <div style={overlay}>
          <div style={modal}>
            <h2 style={{marginTop:0}}>Add Course</h2>

            <div style={{display:"grid",gap:12}}>
              <Input
                value={form.name}
                onChange={v => setForm(f => ({...f,name:v}))}
                placeholder="Course name e.g. Fiqh"
              />

              <textarea
                value={form.description}
                onChange={e => setForm(f => ({...f,description:e.target.value}))}
                placeholder="Course description or syllabus summary"
                style={textareaStyle}
              />
            </div>

            <div style={{display:"flex",gap:10,marginTop:18}}>
              <Button onClick={saveCourse}>Save Course</Button>
              <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{background:"#f8fafc",border:"1px solid "+C.border,borderRadius:12,padding:10,textAlign:"center"}}>
      <div style={{fontSize:20,fontWeight:900,color:C.primary}}>{value}</div>
      <div style={{fontSize:11,color:C.muted,fontWeight:700}}>{label}</div>
    </div>
  );
}

const levelRow: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"24px 1fr auto",
  alignItems:"center",
  gap:8,
  padding:"9px 10px",
  border:"1px solid "+C.border,
  borderRadius:10,
  background:"#fff",
};

const textareaStyle: CSSProperties = {
  width:"100%",
  minHeight:110,
  padding:"12px 14px",
  border:"1px solid "+C.border,
  borderRadius:10,
  resize:"vertical",
};

const overlay: CSSProperties = {
  position:"fixed",
  inset:0,
  background:"rgba(0,0,0,.35)",
  display:"flex",
  alignItems:"center",
  justifyContent:"center",
  zIndex:50,
};

const modal: CSSProperties = {
  width:520,
  background:"#fff",
  borderRadius:18,
  padding:24,
  boxShadow:"0 20px 60px rgba(0,0,0,.25)",
};

