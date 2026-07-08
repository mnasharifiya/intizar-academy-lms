import { useMemo, useState, type CSSProperties } from "react";
import { Card } from "../../components/common/ui";
import { C } from "../../lib/theme";
import { upsertAttendance } from "../../lib/api";

const statuses = ["present", "absent", "late", "excused"];

export default function InstructorAttendance({
  user,
  data,
  setData,
}: {
  user: any;
  data: any;
  setData: any;
}) {
  const [lectureId, setLectureId] = useState("");

  const groups = data?.groups ?? [];
  const users = data?.users ?? [];
  const groupStudents = data?.groupStudents ?? [];
  const lectures = data?.lectures ?? [];
  const attendance = data?.attendance ?? [];
  const courses = data?.courses ?? [];

  const myGroups = groups.filter((g: any) => g.instructorId === user.id);
  const myGroupIds = myGroups.map((g: any) => g.id);

  const myLectures = lectures
    .filter((l: any) => myGroupIds.includes(l.groupId))
    .sort((a: any, b: any) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime());

  const selectedLecture = myLectures.find((l: any) => l.id === lectureId);
  const selectedGroup = groups.find((g: any) => g.id === selectedLecture?.groupId);

  const students = selectedGroup
    ? groupStudents
        .filter((gs: any) => gs.groupId === selectedGroup.id)
        .map((gs: any) => users.find((u: any) => u.id === gs.studentId))
        .filter(Boolean)
    : [];

  const summary = useMemo(() => {
    const records = attendance.filter((a: any) => a.lectureId === lectureId);

    return {
      present: records.filter((r: any) => r.status === "present").length,
      absent: records.filter((r: any) => r.status === "absent").length,
      late: records.filter((r: any) => r.status === "late").length,
      excused: records.filter((r: any) => r.status === "excused").length,
      marked: records.length,
    };
  }, [attendance, lectureId]);

  function courseName(id: string) {
    return courses.find((c: any) => c.id === id)?.name || "-";
  }

  function groupName(id: string) {
    return groups.find((g: any) => g.id === id)?.name || "-";
  }

  function studentAttendance(studentId: string) {
    return attendance.find(
      (a: any) => a.studentId === studentId && a.lectureId === lectureId
    );
  }

  async function mark(studentId: string, status: string) {
    if (!lectureId) {
      alert("Select lecture first.");
      return;
    }

    const record = await upsertAttendance(studentId, lectureId, status as any);

    setData((d: any) => {
      const existing = d.attendance.some(
        (a: any) => a.studentId === studentId && a.lectureId === lectureId
      );

      return {
        ...d,
        attendance: existing
          ? d.attendance.map((a: any) =>
              a.studentId === studentId && a.lectureId === lectureId ? record : a
            )
          : [...d.attendance, record],
      };
    });
  }

  async function markAll(status: string) {
    if (!lectureId) {
      alert("Select lecture first.");
      return;
    }

    for (const student of students) {
      await mark(student.id, status);
    }
  }

  return (
    <div>
      <div style={hero}>
        <div>
          <div style={eyebrow}>Instructor Attendance</div>
          <h1 style={heroTitle}>Mark Student Attendance</h1>
          <p style={heroSub}>
            Select a lecture, view students in the assigned group, and mark attendance.
          </p>
        </div>
      </div>

      <div style={grid}>
        <Card>
          <h2 style={sectionTitle}>Select Lecture</h2>
          <p style={sectionSub}>Choose the session you want to mark</p>

          <select
            value={lectureId}
            onChange={e => setLectureId(e.target.value)}
            style={selectStyle}
          >
            <option value="">Select lecture</option>
            {myLectures.map((lecture: any) => (
              <option key={lecture.id} value={lecture.id}>
                {lecture.title} — {groupName(lecture.groupId)} — {formatDate(lecture.scheduledTime)}
              </option>
            ))}
          </select>

          {selectedLecture && (
            <div style={lectureBox}>
              <h3 style={{margin:"0 0 6px",color:C.text}}>{selectedLecture.title}</h3>
              <div style={meta}>{groupName(selectedLecture.groupId)}</div>
              <div style={meta}>{courseName(selectedLecture.courseId)}</div>
              <div style={meta}>{formatDate(selectedLecture.scheduledTime)}</div>
            </div>
          )}
        </Card>

        <Card>
          <h2 style={sectionTitle}>Attendance Summary</h2>
          <p style={sectionSub}>Current marking progress</p>

          <div style={statsGrid}>
            <Stat label="Students" value={String(students.length)} />
            <Stat label="Marked" value={String(summary.marked)} />
            <Stat label="Present" value={String(summary.present)} />
            <Stat label="Absent" value={String(summary.absent)} />
            <Stat label="Late" value={String(summary.late)} />
            <Stat label="Excused" value={String(summary.excused)} />
          </div>
        </Card>
      </div>

      <Card>
        <div style={{display:"flex",justifyContent:"space-between",gap:14,alignItems:"center",marginBottom:18}}>
          <div>
            <h2 style={sectionTitle}>Students</h2>
            <p style={sectionSub}>Mark attendance for each student</p>
          </div>

          {selectedLecture && students.length > 0 && (
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <button style={miniButton} onClick={() => markAll("present")}>Mark All Present</button>
              <button style={dangerButton} onClick={() => markAll("absent")}>Mark All Absent</button>
            </div>
          )}
        </div>

        {!selectedLecture && (
          <div style={emptyState}>
            <strong>Select a lecture</strong>
            <p>Students will appear after you select a lecture.</p>
          </div>
        )}

        {selectedLecture && students.length === 0 && (
          <div style={emptyState}>
            <strong>No students in this group</strong>
            <p>Add students to the group before marking attendance.</p>
          </div>
        )}

        <div style={{display:"grid",gap:12}}>
          {students.map((student: any) => {
            const record = studentAttendance(student.id);

            return (
              <div key={student.id} style={studentRow}>
                <div style={{display:"flex",gap:12,alignItems:"center",minWidth:0}}>
                  <Avatar name={student.name} photo={student.photo} />

                  <div style={{minWidth:0}}>
                    <strong style={{color:C.text}}>{student.name}</strong>
                    <div style={meta}>{student.email}</div>
                  </div>
                </div>

                <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
                  {statuses.map(status => (
                    <button
                      key={status}
                      onClick={() => mark(student.id, status)}
                      style={statusButton(record?.status === status, status)}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function Avatar({ name, photo, size = 44 }: { name: string; photo?: string; size?: number }) {
  const initials = (name || "?").split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div style={{
      width:size,
      height:size,
      borderRadius:"50%",
      background:C.surface,
      color:C.primary,
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      overflow:"hidden",
      fontWeight:900,
      flexShrink:0,
      border:"1px solid rgba(22,163,74,.14)",
    }}>
      {photo ? <img src={photo} style={{width:"100%",height:"100%",objectFit:"cover"}} /> : initials}
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

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function statusButton(active: boolean, status: string): CSSProperties {
  const bg =
    status === "present" ? "#dcfce7" :
    status === "absent" ? "#fee2e2" :
    status === "late" ? "#fef3c7" :
    "#e0f2fe";

  const color =
    status === "present" ? "#166534" :
    status === "absent" ? "#991b1b" :
    status === "late" ? "#92400e" :
    "#075985";

  return {
    border:"1px solid " + (active ? color : "#e2e8f0"),
    background: active ? bg : "#fff",
    color: active ? color : C.text,
    borderRadius:999,
    padding:"7px 11px",
    fontSize:12,
    fontWeight:900,
    cursor:"pointer",
    textTransform:"capitalize",
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
  gridTemplateColumns:"minmax(0,1fr) minmax(0,.9fr)",
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
  margin:"5px 0 16px",
  color:C.muted,
  fontSize:13,
};

const selectStyle: CSSProperties = {
  width:"100%",
  padding:"12px 14px",
  border:"1px solid #e2e8f0",
  borderRadius:10,
  background:"#fff",
};

const lectureBox: CSSProperties = {
  marginTop:16,
  background:"#f8fafc",
  border:"1px solid #e2e8f0",
  borderRadius:16,
  padding:14,
};

const meta: CSSProperties = {
  fontSize:13,
  color:C.muted,
  marginTop:3,
  whiteSpace:"nowrap",
  overflow:"hidden",
  textOverflow:"ellipsis",
};

const statsGrid: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"repeat(2,1fr)",
  gap:10,
};

const statCard: CSSProperties = {
  background:"#f8fafc",
  border:"1px solid #e2e8f0",
  borderRadius:14,
  padding:12,
};

const statLabel: CSSProperties = {
  color:C.muted,
  fontSize:12,
  fontWeight:900,
};

const statValue: CSSProperties = {
  color:C.text,
  fontSize:24,
  fontWeight:900,
  marginTop:4,
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
};

const studentRow: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"minmax(0,1fr) auto",
  gap:14,
  alignItems:"center",
  border:"1px solid #e2e8f0",
  borderRadius:16,
  padding:14,
  background:"#fff",
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

const dangerButton: CSSProperties = {
  border:"none",
  background:"#fee2e2",
  color:"#991b1b",
  borderRadius:10,
  padding:"8px 12px",
  fontWeight:900,
  cursor:"pointer",
};
