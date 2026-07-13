import { useMemo, useState, type CSSProperties } from "react";
import { Card, Button, Input } from "../../components/common/ui";
import { C } from "../../lib/theme";
import { createGrade, loadAllData } from "../../lib/api";

const emptyForm = {
  groupId: "",
  studentId: "",
  courseId: "",
  type: "assignment",
  score: "",
  feedback: "",
};

export default function GradeManagement({
  user,
  data,
  setData,
}: {
  user: any;
  data: any;
  setData: any;
}) {
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  const users = data?.users ?? [];
  const groups = data?.groups ?? [];
  const groupStudents = data?.groupStudents ?? [];
  const courses = data?.courses ?? [];
  const levelCourses = data?.levelCourses ?? [];
  const grades = data?.grades ?? [];

  const visibleGroups =
    user.role === "admin"
      ? groups
      : groups.filter((g: any) => g.instructorId === user.id && g.isActive !== false);

  const visibleGroupIds = new Set(visibleGroups.map((g: any) => g.id));
  const visibleStudentIds = new Set(
    groupStudents
      .filter((gs: any) => visibleGroupIds.has(gs.groupId))
      .map((gs: any) => gs.studentId)
  );

  const visibleGrades =
    user.role === "admin"
      ? grades
      : grades.filter((g: any) => g.gradedBy === user.id && visibleStudentIds.has(g.studentId));

  async function refreshFromSupabase() {
    const fresh = await loadAllData();
    setData(fresh);
  }

  const selectedGroup = visibleGroups.find((g: any) => g.id === form.groupId);

  const studentsInGroup = selectedGroup
    ? groupStudents
        .filter((gs: any) => gs.groupId === selectedGroup.id)
        .map((gs: any) => users.find((u: any) => u.id === gs.studentId))
        .filter(Boolean)
    : [];

  const coursesForGroup = selectedGroup
    ? levelCourses
        .filter((lc: any) => lc.levelId === selectedGroup.levelId)
        .map((lc: any) => courses.find((c: any) => c.id === lc.courseId))
        .filter(Boolean)
    : [];

  const filteredGrades = useMemo(() => {
    const s = search.toLowerCase();

    return visibleGrades.filter((g: any) => {
      const student = users.find((u: any) => u.id === g.studentId);
      const grader = users.find((u: any) => u.id === g.gradedBy);

      return (
        student?.name?.toLowerCase().includes(s) ||
        student?.email?.toLowerCase().includes(s) ||
        grader?.name?.toLowerCase().includes(s) ||
        g.type?.toLowerCase().includes(s)
      );
    });
  }, [visibleGrades, users, search]);

  async function saveGrade() {
    if (!form.groupId || !form.studentId || !form.courseId || !form.score) {
      alert("Group, student, course, and score are required.");
      return;
    }

    const selectedGroupForSave = visibleGroups.find((g: any) => g.id === form.groupId);
    if (!selectedGroupForSave) {
      alert("You can only grade students from your own active assigned groups.");
      return;
    }

    const studentBelongsToGroup = groupStudents.some(
      (gs: any) => gs.groupId === form.groupId && gs.studentId === form.studentId
    );

    if (!studentBelongsToGroup) {
      alert("This student is not assigned to the selected group.");
      return;
    }

    const score = Number(form.score);

    if (Number.isNaN(score) || score < 0 || score > 100) {
      alert("Score must be between 0 and 100.");
      return;
    }

    try {
      setBusy(true);

      await createGrade({
        studentId: form.studentId,
        lectureId: null,
        assignmentId: null,
        type: form.type as any,
        score,
        feedback: form.feedback,
        gradedBy: user.id,
      });

      await refreshFromSupabase();

      setForm({
        ...emptyForm,
        groupId: form.groupId,
        courseId: form.courseId,
      });

      alert("Grade saved successfully.");
    } catch (err: any) {
      console.error("Save grade failed:", err);
      alert(err?.message || "Failed to save grade.");
    } finally {
      setBusy(false);
    }
  }

  function studentAverage(studentId: string) {
    const list = visibleGrades.filter((g: any) => g.studentId === studentId);
    if (!list.length) return "-";

    const avg = Math.round(
      list.reduce((sum: number, g: any) => sum + Number(g.score || 0), 0) / list.length
    );

    return avg + "%";
  }

  function getStudentName(id: string) {
    return users.find((u: any) => u.id === id)?.name || "-";
  }

  function getGraderName(id: string) {
    return users.find((u: any) => u.id === id)?.name || "-";
  }

  return (
    <div>
      <div style={hero}>
        <div>
          <div style={eyebrow}>Grade Management</div>
          <h1 style={heroTitle}>Record Student Grades</h1>
          <p style={heroSub}>
            Select a group, student, course, grade type, score, and feedback.
            Student averages update automatically.
          </p>
        </div>
      </div>

      <div style={grid}>
        <Card>
          <h2 style={sectionTitle}>Add Grade</h2>
          <p style={sectionSub}>Create a new grade record for a student</p>

          <div style={{display:"grid",gap:12,marginTop:18}}>
            <select
              value={form.groupId}
              onChange={e => setForm(f => ({
                ...f,
                groupId: e.target.value,
                studentId: "",
                courseId: "",
              }))}
              style={selectStyle}
            >
              <option value="">Select group</option>
              {visibleGroups.map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>

            <select
              value={form.studentId}
              onChange={e => setForm(f => ({...f,studentId:e.target.value}))}
              style={selectStyle}
              disabled={!form.groupId}
            >
              <option value="">Select student</option>
              {studentsInGroup.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.name} — Average: {studentAverage(s.id)}
                </option>
              ))}
            </select>

            <select
              value={form.courseId}
              onChange={e => setForm(f => ({...f,courseId:e.target.value}))}
              style={selectStyle}
              disabled={!form.groupId}
            >
              <option value="">Select course</option>
              {coursesForGroup.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={form.type}
              onChange={e => setForm(f => ({...f,type:e.target.value}))}
              style={selectStyle}
            >
              <option value="assignment">Assignment</option>
              <option value="participation">Participation</option>
              <option value="presentation">Presentation</option>
              <option value="communication">Communication</option>
              <option value="leadership">Leadership</option>
            </select>

            <Input
              value={form.score}
              onChange={v => setForm(f => ({...f,score:v}))}
              placeholder="Score from 0 to 100"
              type="number"
            />

            <textarea
              value={form.feedback}
              onChange={e => setForm(f => ({...f,feedback:e.target.value}))}
              placeholder="Feedback for the student"
              style={textareaStyle}
            />

            <Button onClick={saveGrade} disabled={busy}>{busy ? "Saving..." : "Save Grade"}</Button>
          </div>
        </Card>

        <Card>
          <h2 style={sectionTitle}>Group Summary</h2>
          <p style={sectionSub}>Students and averages in the selected group</p>

          {!selectedGroup && (
            <div style={emptyState}>
              <strong>Select a group</strong>
              <p>Student list and averages will appear here.</p>
            </div>
          )}

          {selectedGroup && (
            <div style={{display:"grid",gap:10,marginTop:18}}>
              {studentsInGroup.length === 0 && (
                <p style={{color:C.muted}}>No students in this group.</p>
              )}

              {studentsInGroup.map((student: any) => (
                <div key={student.id} style={studentRow}>
                  <div>
                    <strong>{student.name}</strong>
                    <div style={{fontSize:12,color:C.muted}}>{student.email}</div>
                  </div>
                  <div style={avgBadge}>{studentAverage(student.id)}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div style={{display:"flex",justifyContent:"space-between",gap:14,alignItems:"center",marginBottom:18}}>
          <div>
            <h2 style={sectionTitle}>Recent Grade Records</h2>
            <p style={sectionSub}>{user.role === "admin" ? "All saved grades in the system" : "Only grades you recorded for your assigned students"}</p>
          </div>

          <div style={{width:280}}>
            <Input value={search} onChange={setSearch} placeholder="Search grades" />
          </div>
        </div>

        {filteredGrades.length === 0 && (
          <div style={emptyState}>
            <strong>No grades found</strong>
            <p>Saved grade records will appear here.</p>
          </div>
        )}

        {filteredGrades.length > 0 && (
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"#f8fafc",textAlign:"left"}}>
                  <th style={th}>Student</th>
                  <th style={th}>Type</th>
                  <th style={th}>Score</th>
                  <th style={th}>Feedback</th>
                  <th style={th}>Graded By</th>
                </tr>
              </thead>

              <tbody>
                {filteredGrades.slice().reverse().map((grade: any) => (
                  <tr key={grade.id} style={{borderBottom:"1px solid #e2e8f0"}}>
                    <td style={td}><strong>{getStudentName(grade.studentId)}</strong></td>
                    <td style={td}><span style={typeBadge}>{grade.type}</span></td>
                    <td style={td}><span style={scoreBadge(Number(grade.score || 0))}>{grade.score}%</span></td>
                    <td style={td}>{grade.feedback || "-"}</td>
                    <td style={td}>{getGraderName(grade.gradedBy)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function scoreBadge(score: number): CSSProperties {
  return {
    display:"inline-flex",
    padding:"6px 10px",
    borderRadius:999,
    fontWeight:900,
    background: score >= 70 ? "#dcfce7" : score >= 50 ? "#fef3c7" : "#fee2e2",
    color: score >= 70 ? "#166534" : score >= 50 ? "#92400e" : "#991b1b",
  };
}

const hero: CSSProperties = {
  background:"linear-gradient(135deg,#052e16,#166534)",
  color:"#fff",
  borderRadius:24,
  padding:28,
  marginBottom:22,
  boxShadow:"0 18px 45px rgba(5,46,22,.22)",
};

const eyebrow: CSSProperties = {
  fontSize:12,
  fontWeight:900,
  textTransform:"uppercase",
  letterSpacing:1.8,
  color:"#bbf7d0",
  marginBottom:8,
};

const heroTitle: CSSProperties = {
  margin:0,
  fontSize:34,
  lineHeight:1.15,
  fontWeight:900,
  letterSpacing:"-0.04em",
};

const heroSub: CSSProperties = {
  margin:"10px 0 0",
  maxWidth:720,
  color:"rgba(255,255,255,.78)",
  fontSize:15,
  lineHeight:1.7,
};

const grid: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"minmax(0,.9fr) minmax(0,1.1fr)",
  gap:18,
  marginBottom:20,
};

const sectionTitle: CSSProperties = {
  margin:0,
  fontSize:20,
  color:C.text,
  fontWeight:900,
};

const sectionSub: CSSProperties = {
  margin:"5px 0 0",
  color:C.muted,
  fontSize:13,
};

const selectStyle: CSSProperties = {
  padding:"12px 14px",
  border:"1px solid #e2e8f0",
  borderRadius:10,
  background:"#fff",
};

const textareaStyle: CSSProperties = {
  width:"100%",
  minHeight:100,
  padding:"12px 14px",
  border:"1px solid #e2e8f0",
  borderRadius:10,
  resize:"vertical",
};

const emptyState: CSSProperties = {
  minHeight:150,
  display:"flex",
  flexDirection:"column",
  alignItems:"center",
  justifyContent:"center",
  textAlign:"center",
  color:C.muted,
  background:"#f8fafc",
  border:"1px dashed #cbd5e1",
  borderRadius:16,
  padding:20,
  marginTop:16,
};

const studentRow: CSSProperties = {
  display:"flex",
  justifyContent:"space-between",
  alignItems:"center",
  gap:12,
  padding:"12px",
  border:"1px solid #e2e8f0",
  borderRadius:14,
};

const avgBadge: CSSProperties = {
  background:C.surface,
  color:C.primary,
  borderRadius:999,
  padding:"7px 11px",
  fontWeight:900,
};

const th: CSSProperties = {
  padding:"13px",
  fontSize:12,
  color:C.muted,
  fontWeight:900,
  textTransform:"uppercase",
};

const td: CSSProperties = {
  padding:"14px 13px",
  fontSize:14,
  color:C.text,
};

const typeBadge: CSSProperties = {
  display:"inline-flex",
  padding:"5px 9px",
  borderRadius:999,
  background:"#f1f5f9",
  color:"#334155",
  fontSize:12,
  fontWeight:900,
};

