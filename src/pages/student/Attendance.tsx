import { type CSSProperties } from "react";
import { Card } from "../../components/common/ui";
import { C } from "../../lib/theme";

export default function StudentAttendance({
  user,
  data,
}: {
  user: any;
  data: any;
}) {
  const groups = data?.groups ?? [];
  const groupStudents = data?.groupStudents ?? [];
  const lectures = data?.lectures ?? [];
  const attendance = data?.attendance ?? [];
  const courses = data?.courses ?? [];

  const myMembership = groupStudents.find((gs: any) => gs.studentId === user.id);
  const myGroup = groups.find((g: any) => g.id === myMembership?.groupId);

  const myLectures = myGroup
    ? lectures
        .filter((l: any) => l.groupId === myGroup.id)
        .sort((a: any, b: any) => new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime())
    : [];

  const myRecords = attendance.filter((a: any) => a.studentId === user.id);

  const presentCount = myRecords.filter((r: any) => r.status === "present").length;
  const lateCount = myRecords.filter((r: any) => r.status === "late").length;
  const absentCount = myRecords.filter((r: any) => r.status === "absent").length;
  const excusedCount = myRecords.filter((r: any) => r.status === "excused").length;

  const attendancePercent =
    myRecords.length > 0
      ? Math.round(((presentCount + lateCount + excusedCount) / myRecords.length) * 100)
      : 0;

  function courseName(id: string) {
    return courses.find((c: any) => c.id === id)?.name || "-";
  }

  function recordForLecture(lectureId: string) {
    return myRecords.find((r: any) => r.lectureId === lectureId);
  }

  return (
    <div>
      <div style={hero}>
        <div>
          <div style={eyebrow}>Student Attendance</div>
          <h1 style={heroTitle}>My Attendance</h1>
          <p style={heroSub}>
            Track your attendance records for online discussions and learning sessions.
          </p>
        </div>

        <div style={summaryBox}>
          <div style={{fontSize:13,color:"rgba(255,255,255,.75)",fontWeight:800}}>
            Attendance
          </div>
          <div style={{fontSize:42,fontWeight:900,lineHeight:1}}>
            {myRecords.length ? attendancePercent + "%" : "-"}
          </div>
        </div>
      </div>

      {!myGroup && (
        <Card>
          <div style={emptyState}>
            <strong>No group assigned</strong>
            <p>Your attendance will appear after admin assigns you to a group.</p>
          </div>
        </Card>
      )}

      <div style={statsGrid}>
        <Stat label="Total Records" value={String(myRecords.length)} />
        <Stat label="Present" value={String(presentCount)} />
        <Stat label="Late" value={String(lateCount)} />
        <Stat label="Absent" value={String(absentCount)} />
        <Stat label="Excused" value={String(excusedCount)} />
      </div>

      <Card>
        <h2 style={sectionTitle}>Attendance History</h2>
        <p style={sectionSub}>Status for each lecture and discussion</p>

        {myLectures.length === 0 && (
          <div style={emptyState}>
            <strong>No lectures yet</strong>
            <p>Your instructor has not scheduled any lectures yet.</p>
          </div>
        )}

        <div style={{display:"grid",gap:12,marginTop:18}}>
          {myLectures.map((lecture: any) => {
            const record = recordForLecture(lecture.id);

            return (
              <div key={lecture.id} style={lectureCard}>
                <div>
                  <h3 style={{margin:"0 0 6px",color:C.text}}>
                    {lecture.title}
                  </h3>

                  <div style={meta}>{courseName(lecture.courseId)}</div>
                  <div style={meta}>{formatDate(lecture.scheduledTime)}</div>
                </div>

                <span style={statusBadge(record?.status || "not marked")}>
                  {record?.status || "not marked"}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
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

function statusBadge(status: string): CSSProperties {
  const bg =
    status === "present" ? "#dcfce7" :
    status === "absent" ? "#fee2e2" :
    status === "late" ? "#fef3c7" :
    status === "excused" ? "#e0f2fe" :
    "#f1f5f9";

  const color =
    status === "present" ? "#166534" :
    status === "absent" ? "#991b1b" :
    status === "late" ? "#92400e" :
    status === "excused" ? "#075985" :
    "#64748b";

  return {
    display:"inline-flex",
    padding:"7px 11px",
    borderRadius:999,
    background:bg,
    color,
    fontSize:12,
    fontWeight:900,
    textTransform:"capitalize",
    whiteSpace:"nowrap",
  };
}

const hero: CSSProperties = {
  background:"linear-gradient(135deg,#052e16,#166534)",
  color:"#fff",
  borderRadius:24,
  padding:28,
  display:"flex",
  justifyContent:"space-between",
  gap:22,
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

const summaryBox: CSSProperties = {
  minWidth:170,
  background:"rgba(255,255,255,.1)",
  border:"1px solid rgba(255,255,255,.18)",
  borderRadius:18,
  padding:18,
  textAlign:"center",
};

const statsGrid: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",
  gap:16,
  marginBottom:20,
};

const statCard: CSSProperties = {
  background:"#fff",
  border:"1px solid #e2e8f0",
  borderRadius:18,
  padding:18,
  boxShadow:"0 6px 20px rgba(15,23,42,.04)",
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
  marginTop:5,
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

const lectureCard: CSSProperties = {
  display:"flex",
  justifyContent:"space-between",
  gap:14,
  alignItems:"center",
  border:"1px solid #e2e8f0",
  borderRadius:16,
  padding:14,
  background:"#fff",
};

const meta: CSSProperties = {
  fontSize:13,
  color:C.muted,
  marginTop:3,
};
