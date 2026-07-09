import { useState, type CSSProperties } from "react";
import { Card, Button, Input } from "../../components/common/ui";
import { C } from "../../lib/theme";
import { createAssignment, createGrade } from "../../lib/api";
import { notifyUsers } from "../../lib/notify";

const emptyForm = {
  groupId: "",
  courseId: "",
  title: "",
  description: "",
  dueDate: "",
};

export default function InstructorAssignments({
  user,
  data,
  setData,
}: {
  user: any;
  data: any;
  setData: any;
}) {
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState<File[]>([]);
  const [gradeModal, setGradeModal] = useState<any>(null);
  const [gradeForm, setGradeForm] = useState({ score: "", feedback: "" });

  const groups = data?.groups ?? [];
  const courses = data?.courses ?? [];
  const levelCourses = data?.levelCourses ?? [];
  const assignments = data?.assignments ?? [];
  const groupStudents = data?.groupStudents ?? [];
  const users = data?.users ?? [];
  const submissions = data?.submissions ?? [];
  const grades = data?.grades ?? [];

  const myGroups = groups.filter((g: any) => g.instructorId === user.id);

  const myAssignments = assignments
    .filter((a: any) => myGroups.some((g: any) => g.id === a.groupId))
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  function coursesForGroup(groupId: string) {
    const group = myGroups.find((g: any) => g.id === groupId);
    if (!group) return [];

    const courseIds = levelCourses
      .filter((lc: any) => lc.levelId === group.levelId)
      .map((lc: any) => lc.courseId);

    return courses.filter((c: any) => courseIds.includes(c.id));
  }

  function groupName(id: string) {
    return groups.find((g: any) => g.id === id)?.name || "-";
  }

  function courseName(id: string) {
    return courses.find((c: any) => c.id === id)?.name || "-";
  }

  function studentsInGroup(groupId: string) {
    return groupStudents
      .filter((gs: any) => gs.groupId === groupId)
      .map((gs: any) => users.find((u: any) => u.id === gs.studentId))
      .filter(Boolean);
  }

  function assignmentSubmissions(assignmentId: string) {
    return submissions.filter((s: any) => s.assignmentId === assignmentId);
  }

  function studentName(id: string) {
    return users.find((u: any) => u.id === id)?.name || "-";
  }

  function gradeForSubmission(assignmentId: string, studentId: string) {
    return grades.find((g: any) => g.assignmentId === assignmentId && g.studentId === studentId);
  }

  async function saveAssignment() {
    if (!form.groupId || !form.courseId || !form.title || !form.dueDate) {
      alert("Group, course, title, and due date are required.");
      return;
    }

    const newAssignment = await createAssignment({
      groupId: form.groupId,
      courseId: form.courseId,
      title: form.title,
      description: form.description,
      dueDate: new Date(form.dueDate).toISOString(),
      createdBy: user.id,
      files: files.map((file) => ({
        name: file.name,
        type: getFileExt(file.name),
        size: formatSize(file.size),
      })),
    });

    setData((d: any) => ({
      ...d,
      assignments: [...d.assignments, newAssignment],
    }));

    setForm(emptyForm);
    setFiles([]);
    await notifyUsers(
      studentsInGroup(form.groupId).map((s: any) => s.id),
      "assignment",
      "New Assignment Posted",
      form.title
    );

    alert("Assignment created.");
  }

  async function submitGrade() {
    if (!gradeModal || !gradeForm.score) {
      alert("Score is required.");
      return;
    }

    const score = Number(gradeForm.score);

    if (Number.isNaN(score) || score < 0 || score > 100) {
      alert("Score must be between 0 and 100.");
      return;
    }

    const newGrade = await createGrade({
      studentId: gradeModal.studentId,
      lectureId: null,
      assignmentId: gradeModal.assignmentId,
      type: "assignment",
      score,
      feedback: gradeForm.feedback,
      gradedBy: user.id,
    });

    setData((d: any) => ({
      ...d,
      grades: [...d.grades, newGrade],
    }));

    setGradeModal(null);
    setGradeForm({ score: "", feedback: "" });
    await notifyUsers(
      [gradeModal.studentId],
      "grade",
      "Assignment Graded",
      `Your assignment has been graded: ${score}%`
    );

    alert("Assignment graded.");
  }

  return (
    <div>
      <div style={hero}>
        <div>
          <div style={eyebrow}>Instructor Assignments</div>
          <h1 style={heroTitle}>Create & Grade Assignments</h1>
          <p style={heroSub}>
            Create assignments for your groups, review submissions, and grade student work.
          </p>
        </div>
      </div>

      <div style={grid}>
        <Card>
          <h2 style={sectionTitle}>Create Assignment</h2>
          <p style={sectionSub}>Assign work to a group and course</p>

          <div style={{display:"grid",gap:12,marginTop:18}}>
            <select
              value={form.groupId}
              onChange={e => setForm(f => ({...f,groupId:e.target.value,courseId:""}))}
              style={selectStyle}
            >
              <option value="">Select group</option>
              {myGroups.map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>

            <select
              value={form.courseId}
              onChange={e => setForm(f => ({...f,courseId:e.target.value}))}
              style={selectStyle}
              disabled={!form.groupId}
            >
              <option value="">Select course</option>
              {coursesForGroup(form.groupId).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <Input
              value={form.title}
              onChange={v => setForm(f => ({...f,title:v}))}
              placeholder="Assignment title"
            />

            <textarea
              value={form.description}
              onChange={e => setForm(f => ({...f,description:e.target.value}))}
              placeholder="Assignment instructions"
              style={textareaStyle}
            />

            <Input
              value={form.dueDate}
              onChange={v => setForm(f => ({...f,dueDate:v}))}
              type="datetime-local"
            />

            <input
              type="file"
              multiple
              onChange={e => setFiles(Array.from(e.target.files ?? []))}
              style={fileInputStyle}
            />

            {files.length > 0 && (
              <div style={{display:"grid",gap:8}}>
                {files.map((file) => (
                  <div key={file.name} style={filePill}>
                    {file.name} — {formatSize(file.size)}
                  </div>
                ))}
              </div>
            )}

            <Button onClick={saveAssignment}>Create Assignment</Button>
          </div>
        </Card>

        <Card>
          <h2 style={sectionTitle}>Assignment Overview</h2>
          <p style={sectionSub}>Your assignment activity summary</p>

          <div style={statsGrid}>
            <Stat label="Assignments" value={String(myAssignments.length)} />
            <Stat label="Groups" value={String(myGroups.length)} />
            <Stat label="Submissions" value={String(submissions.length)} />
          </div>
        </Card>
      </div>

      <Card>
        <h2 style={sectionTitle}>My Assignments</h2>
        <p style={sectionSub}>Review submissions and grade student work</p>

        {myAssignments.length === 0 && (
          <div style={emptyState}>
            <strong>No assignments yet</strong>
            <p>Create your first assignment using the form above.</p>
          </div>
        )}

        <div style={{display:"grid",gap:16,marginTop:18}}>
          {myAssignments.map((assignment: any) => {
            const members = studentsInGroup(assignment.groupId);
            const subs = assignmentSubmissions(assignment.id);
            const overdue = new Date(assignment.dueDate).getTime() < Date.now();

            return (
              <div key={assignment.id} style={assignmentCard}>
                <div style={{display:"flex",justifyContent:"space-between",gap:14}}>
                  <div>
                    <h3 style={{margin:"0 0 6px",color:C.text,fontSize:18}}>
                      {assignment.title}
                    </h3>
                    <div style={meta}>
                      {groupName(assignment.groupId)} — {courseName(assignment.courseId)}
                    </div>
                    <div style={meta}>
                      Due: {formatDate(assignment.dueDate)}
                    </div>
                  </div>

                  <div style={{textAlign:"right"}}>
                    <span style={overdue ? dangerBadge : statusBadge}>
                      {overdue ? "Overdue" : "Open"}
                    </span>
                    <div style={{fontSize:12,color:C.muted,marginTop:8}}>
                      {subs.length}/{members.length} submitted
                    </div>
                  </div>
                </div>

                {assignment.description && (
                  <p style={{color:C.muted,lineHeight:1.7,fontSize:14}}>
                    {assignment.description}
                  </p>
                )}

                {assignment.files?.length > 0 && (
                  <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
                    {assignment.files.map((f: any, i: number) => (
                      <span key={i} style={filePill}>
                        {f.name} — {f.size}
                      </span>
                    ))}
                  </div>
                )}

                <h4 style={smallTitle}>Submissions</h4>

                {subs.length === 0 && (
                  <p style={{color:C.muted,fontSize:13}}>No submissions yet.</p>
                )}

                <div style={{display:"grid",gap:10}}>
                  {subs.map((sub: any) => {
                    const grade = gradeForSubmission(assignment.id, sub.studentId);

                    return (
                      <div key={sub.id} style={submissionRow}>
                        <div>
                          <strong>{studentName(sub.studentId)}</strong>
                          <div style={meta}>
                            {sub.fileName} — {sub.fileSize} — {formatDate(sub.submittedAt)}
                          </div>
                          {grade && (
                            <div style={{marginTop:5,color:C.primary,fontWeight:900,fontSize:13}}>
                              Graded: {grade.score}%
                            </div>
                          )}
                        </div>

                        {!grade && (
                          <button
                            style={miniButton}
                            onClick={() => {
                              setGradeModal({
                                assignmentId: assignment.id,
                                studentId: sub.studentId,
                              });
                              setGradeForm({ score: "", feedback: "" });
                            }}
                          >
                            Grade
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {gradeModal && (
        <div style={overlay}>
          <div style={modal}>
            <h2 style={{marginTop:0}}>Grade Submission</h2>

            <div style={{display:"grid",gap:12}}>
              <Input
                value={gradeForm.score}
                onChange={v => setGradeForm(f => ({...f,score:v}))}
                placeholder="Score 0-100"
                type="number"
              />

              <textarea
                value={gradeForm.feedback}
                onChange={e => setGradeForm(f => ({...f,feedback:e.target.value}))}
                placeholder="Feedback"
                style={textareaStyle}
              />
            </div>

            <div style={{display:"flex",gap:10,marginTop:18}}>
              <Button onClick={submitGrade}>Save Grade</Button>
              <Button variant="secondary" onClick={() => setGradeModal(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={statCard}>
      <div style={statLabel}>{label}</div>
      <div style={statValue}>{value}</div>
    </div>
  );
}

function getFileExt(name: string) {
  return name.split(".").pop()?.toLowerCase() || "file";
}

function formatSize(size: number) {
  if (size < 1024 * 1024) return Math.round(size / 1024) + " KB";
  return (size / (1024 * 1024)).toFixed(1) + " MB";
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
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
  gridTemplateColumns:"minmax(0,1fr) minmax(0,.8fr)",
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
  minHeight:96,
  padding:"12px 14px",
  border:"1px solid #e2e8f0",
  borderRadius:10,
  resize:"vertical",
};

const fileInputStyle: CSSProperties = {
  padding:"12px 14px",
  border:"1px solid #e2e8f0",
  borderRadius:10,
  background:"#fff",
};

const statsGrid: CSSProperties = {
  display:"grid",
  gap:12,
  marginTop:18,
};

const statCard: CSSProperties = {
  background:"#f8fafc",
  border:"1px solid #e2e8f0",
  borderRadius:14,
  padding:14,
};

const statLabel: CSSProperties = {
  color:C.muted,
  fontSize:13,
  fontWeight:900,
};

const statValue: CSSProperties = {
  color:C.text,
  fontSize:24,
  fontWeight:900,
  marginTop:4,
};

const emptyState: CSSProperties = {
  minHeight:140,
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
  marginTop:18,
};

const assignmentCard: CSSProperties = {
  border:"1px solid #e2e8f0",
  borderRadius:18,
  padding:16,
  background:"#fff",
};

const meta: CSSProperties = {
  fontSize:13,
  color:C.muted,
  marginTop:3,
};

const statusBadge: CSSProperties = {
  display:"inline-flex",
  padding:"7px 11px",
  borderRadius:999,
  background:C.surface,
  color:C.primary,
  fontSize:12,
  fontWeight:900,
};

const dangerBadge: CSSProperties = {
  display:"inline-flex",
  padding:"7px 11px",
  borderRadius:999,
  background:"#fee2e2",
  color:"#991b1b",
  fontSize:12,
  fontWeight:900,
};

const filePill: CSSProperties = {
  background:"#f8fafc",
  border:"1px solid #e2e8f0",
  color:C.text,
  borderRadius:999,
  padding:"7px 11px",
  fontSize:12,
  fontWeight:800,
};

const smallTitle: CSSProperties = {
  margin:"14px 0 10px",
  fontSize:15,
  color:C.text,
  fontWeight:900,
};

const submissionRow: CSSProperties = {
  display:"flex",
  justifyContent:"space-between",
  alignItems:"center",
  gap:12,
  padding:12,
  border:"1px solid #e2e8f0",
  borderRadius:14,
};

const miniButton: CSSProperties = {
  border:"none",
  background:C.primary,
  color:"#fff",
  borderRadius:10,
  padding:"8px 12px",
  fontWeight:900,
  cursor:"pointer",
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
  width:460,
  background:"#fff",
  borderRadius:18,
  padding:24,
  boxShadow:"0 20px 60px rgba(0,0,0,.25)",
};


