import { useState, type CSSProperties } from "react";
import { Card, Button } from "../../components/common/ui";
import { C } from "../../lib/theme";
import { createSubmission } from "../../lib/api";
import { notifyUsers } from "../../lib/notify";

export default function StudentAssignments({
  user,
  data,
  setData,
}: {
  user: any;
  data: any;
  setData: any;
}) {
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);

  const groups = data?.groups ?? [];
  const groupStudents = data?.groupStudents ?? [];
  const assignments = data?.assignments ?? [];
  const submissions = data?.submissions ?? [];
  const grades = data?.grades ?? [];
  const courses = data?.courses ?? [];

  const myMembership = groupStudents.find((gs: any) => gs.studentId === user.id);
  const myGroup = groups.find((g: any) => g.id === myMembership?.groupId);

  const myAssignments = myGroup
    ? assignments
        .filter((a: any) => a.groupId === myGroup.id)
        .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    : [];

  function courseName(id: string) {
    return courses.find((c: any) => c.id === id)?.name || "-";
  }

  function mySubmission(assignmentId: string) {
    return submissions.find(
      (s: any) => s.assignmentId === assignmentId && s.studentId === user.id
    );
  }

  function myGrade(assignmentId: string) {
    return grades.find(
      (g: any) => g.assignmentId === assignmentId && g.studentId === user.id
    );
  }

  async function submitAssignment() {
    if (!selectedAssignment || !file) {
      alert("Please select a file.");
      return;
    }

    const newSubmission = await createSubmission({
      assignmentId: selectedAssignment.id,
      studentId: user.id,
      fileName: file.name,
      fileSize: formatSize(file.size),
    });

    setData((d: any) => ({
      ...d,
      submissions: [...d.submissions, newSubmission],
    }));

    setSelectedAssignment(null);
    setFile(null);
    if (myGroup?.instructorId) {
      await notifyUsers(
        [myGroup.instructorId],
        "assignment",
        "New Assignment Submission",
        `${user.name} submitted: ${selectedAssignment.title}`
      );
    }

    alert("Assignment submitted.");
  }

  return (
    <div>
      <div style={hero}>
        <div>
          <div style={eyebrow}>Student Assignments</div>
          <h1 style={heroTitle}>My Assignments</h1>
          <p style={heroSub}>
            View assigned work, submit your answer file, and see grades and feedback.
          </p>
        </div>
      </div>

      {!myGroup && (
        <Card>
          <div style={emptyState}>
            <strong>No group assigned</strong>
            <p>Your assignments will appear after admin assigns you to a group.</p>
          </div>
        </Card>
      )}

      <div style={{display:"grid",gap:16}}>
        {myAssignments.length === 0 && myGroup && (
          <Card>
            <div style={emptyState}>
              <strong>No assignments yet</strong>
              <p>Your instructor has not created assignments for this group yet.</p>
            </div>
          </Card>
        )}

        {myAssignments.map((assignment: any) => {
          const submission = mySubmission(assignment.id);
          const grade = myGrade(assignment.id);
          const overdue = new Date(assignment.dueDate).getTime() < Date.now();

          return (
            <Card key={assignment.id}>
              <div style={{display:"flex",justifyContent:"space-between",gap:14}}>
                <div>
                  <h2 style={{margin:"0 0 6px",color:C.text}}>
                    {assignment.title}
                  </h2>
                  <div style={meta}>{courseName(assignment.courseId)}</div>
                  <div style={meta}>Due: {formatDate(assignment.dueDate)}</div>
                </div>

                <div style={{textAlign:"right"}}>
                  {grade ? (
                    <span style={scoreBadge}>{grade.score}%</span>
                  ) : submission ? (
                    <span style={statusBadge}>Submitted</span>
                  ) : overdue ? (
                    <span style={dangerBadge}>Overdue</span>
                  ) : (
                    <span style={statusBadge}>Open</span>
                  )}
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

              {submission && (
                <div style={submissionBox}>
                  <strong>Your submission</strong>
                  <div style={meta}>
                    {submission.fileName} — {submission.fileSize} — {formatDate(submission.submittedAt)}
                  </div>
                </div>
              )}

              {grade && (
                <div style={gradeBox}>
                  <strong>Instructor feedback</strong>
                  <div style={{marginTop:6,color:C.text}}>
                    {grade.feedback || "No feedback added."}
                  </div>
                </div>
              )}

              {!submission && (
                <div style={{marginTop:16}}>
                  <Button onClick={() => setSelectedAssignment(assignment)}>
                    Submit Assignment
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {selectedAssignment && (
        <div style={overlay}>
          <div style={modal}>
            <h2 style={{marginTop:0}}>Submit Assignment</h2>
            <p style={{color:C.muted}}>
              {selectedAssignment.title}
            </p>

            <input
              type="file"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
              style={fileInputStyle}
            />

            <div style={{display:"flex",gap:10,marginTop:18}}>
              <Button onClick={submitAssignment}>Submit</Button>
              <Button variant="secondary" onClick={() => setSelectedAssignment(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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

const emptyState: CSSProperties = {
  minHeight:150,
  display:"flex",
  flexDirection:"column",
  alignItems:"center",
  justifyContent:"center",
  textAlign:"center",
  color:C.muted,
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

const scoreBadge: CSSProperties = {
  display:"inline-flex",
  padding:"7px 11px",
  borderRadius:999,
  background:"#dcfce7",
  color:"#166534",
  fontSize:13,
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

const submissionBox: CSSProperties = {
  marginTop:14,
  background:"#f8fafc",
  border:"1px solid #e2e8f0",
  borderRadius:14,
  padding:12,
};

const gradeBox: CSSProperties = {
  marginTop:14,
  background:"#f0fdf4",
  border:"1px solid #bbf7d0",
  borderRadius:14,
  padding:12,
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

const fileInputStyle: CSSProperties = {
  width:"100%",
  padding:"12px 14px",
  border:"1px solid #e2e8f0",
  borderRadius:10,
  background:"#fff",
};


