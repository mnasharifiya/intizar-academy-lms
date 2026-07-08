import { type CSSProperties } from "react";
import { Card } from "../../components/common/ui";
import { C } from "../../lib/theme";

export default function StudentDashboard({
  user,
  data,
}: {
  user: any;
  data: any;
}) {
  const levels = data?.levels ?? [];
  const users = data?.users ?? [];
  const groups = data?.groups ?? [];
  const groupStudents = data?.groupStudents ?? [];
  const levelCourses = data?.levelCourses ?? [];
  const courses = data?.courses ?? [];

  const myLevel = levels.find((l: any) => l.id === user.levelId);

  const myMembership = groupStudents.find((gs: any) => gs.studentId === user.id);
  const myGroup = groups.find((g: any) => g.id === myMembership?.groupId);

  const instructor = users.find((u: any) => u.id === myGroup?.instructorId);

  const myCourseIds = levelCourses
    .filter((lc: any) => lc.levelId === user.levelId)
    .map((lc: any) => lc.courseId);

  const myCourses = courses.filter((c: any) => myCourseIds.includes(c.id));

  const classmates = myGroup
    ? groupStudents
        .filter((gs: any) => gs.groupId === myGroup.id && gs.studentId !== user.id)
        .map((gs: any) => users.find((u: any) => u.id === gs.studentId))
        .filter(Boolean)
    : [];

  return (
    <div>
      <div style={hero}>
        <div>
          <div style={eyebrow}>Student Portal</div>
          <h1 style={heroTitle}>Welcome back, {user.name}</h1>
          <p style={heroSub}>
            Track your courses, group, instructor, classmates, and learning activities from one place.
          </p>
        </div>

        <div style={profileBox}>
          <Avatar name={user.name} photo={user.photo} size={64} />
          <div>
            <div style={{fontWeight:900,fontSize:16}}>{user.name}</div>
            <div style={{fontSize:13,color:"rgba(255,255,255,.78)"}}>
              {myLevel?.name || "No level assigned"}
            </div>
          </div>
        </div>
      </div>

      <div style={statsGrid}>
        <StatCard label="My Level" value={myLevel?.name || "Not assigned"} sub={myLevel?.category || "Level information"} />
        <StatCard label="My Group" value={myGroup?.name || "Not assigned"} sub={myGroup ? "Active learning group" : "Ask admin to assign you"} />
        <StatCard label="My Courses" value={String(myCourses.length)} sub="Courses assigned to your level" />
        <StatCard label="Classmates" value={String(classmates.length)} sub="Students in your group" />
      </div>

      <div style={mainGrid}>
        <Card>
          <div style={sectionHeader}>
            <div>
              <h2 style={sectionTitle}>My Instructor</h2>
              <p style={sectionSub}>Profile and contact information</p>
            </div>
          </div>

          {!instructor && (
            <div style={emptyState}>
              <div style={emptyIcon}>👤</div>
              <strong>No instructor assigned yet</strong>
              <p>Your instructor will appear here after admin assigns your group.</p>
            </div>
          )}

          {instructor && (
            <div>
              <div style={instructorHeader}>
                <Avatar name={instructor.name} photo={instructor.photo} size={74} />
                <div>
                  <h3 style={{margin:"0 0 4px",fontSize:22,color:C.text}}>
                    {instructor.name}
                  </h3>
                  <div style={rankBadge}>
                    {instructor.rank || "Instructor"}
                  </div>
                  <div style={{fontSize:14,color:C.muted,marginTop:6}}>
                    {instructor.background || "Speciality not added"}
                  </div>
                </div>
              </div>

              <p style={bioText}>
                {instructor.about || "No biography added yet."}
              </p>

              <div style={contactGrid}>
                <Contact label="Email" value={instructor.email || "-"} />
                <Contact label="Phone" value={instructor.contacts?.phone || "-"} />
                <Contact label="Office" value={instructor.contacts?.office || "-"} />
              </div>
            </div>
          )}
        </Card>

        <Card>
          <div style={sectionHeader}>
            <div>
              <h2 style={sectionTitle}>My Courses</h2>
              <p style={sectionSub}>Courses available for your level</p>
            </div>
          </div>

          {myCourses.length === 0 && (
            <div style={emptyState}>
              <div style={emptyIcon}>📚</div>
              <strong>No courses assigned</strong>
              <p>Courses will appear here after admin assigns courses to your level.</p>
            </div>
          )}

          <div style={{display:"grid",gap:12}}>
            {myCourses.map((course: any) => (
              <div key={course.id} style={courseCard}>
                <div style={courseIcon}>
                  {course.name?.slice(0, 2).toUpperCase()}
                </div>

                <div>
                  <h3 style={{margin:"0 0 6px",fontSize:16,color:C.text}}>
                    {course.name}
                  </h3>
                  <p style={{margin:0,color:C.muted,fontSize:13,lineHeight:1.6}}>
                    {course.description || "No description added."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div style={sectionHeader}>
            <div>
              <h2 style={sectionTitle}>My Classmates</h2>
              <p style={sectionSub}>Students in your learning group</p>
            </div>
          </div>

          {classmates.length === 0 && (
            <div style={emptyState}>
              <div style={emptyIcon}>👥</div>
              <strong>No classmates found</strong>
              <p>Classmates will appear after students are assigned to your group.</p>
            </div>
          )}

          <div style={{display:"grid",gap:12}}>
            {classmates.map((student: any) => (
              <div key={student.id} style={personRow}>
                <Avatar name={student.name} photo={student.photo} />
                <div>
                  <strong style={{color:C.text}}>{student.name}</strong>
                  <div style={{fontSize:12,color:C.muted}}>{student.email}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <div style={sectionHeader}>
            <div>
              <h2 style={sectionTitle}>Learning Activity</h2>
              <p style={sectionSub}>Your academic progress overview</p>
            </div>
          </div>

          <Activity label="Upcoming Sessions" value="Coming soon" />
          <Activity label="Assignments" value="Coming soon" />
          <Activity label="Attendance" value="Coming soon" />
          <Activity label="Group Chat" value="Coming soon" />
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div style={statCard}>
      <div style={statLabel}>{label}</div>
      <div style={statValue}>{value}</div>
      <div style={statSub}>{sub}</div>
    </div>
  );
}

function Contact({ label, value }: { label: string; value: string }) {
  return (
    <div style={contactItem}>
      <div style={{fontSize:12,color:C.muted,fontWeight:800}}>{label}</div>
      <div style={{fontSize:14,color:C.text,fontWeight:700,marginTop:3}}>{value}</div>
    </div>
  );
}

function Activity({ label, value }: { label: string; value: string }) {
  return (
    <div style={activityRow}>
      <strong>{label}</strong>
      <span>{value}</span>
    </div>
  );
}

function Avatar({
  name,
  photo,
  size = 44,
}: {
  name: string;
  photo?: string;
  size?: number;
}) {
  const initials = (name || "?")
    .split(" ")
    .map(x => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
      {photo ? (
        <img src={photo} style={{width:"100%",height:"100%",objectFit:"cover"}} />
      ) : initials}
    </div>
  );
}

const hero: CSSProperties = {
  background:"linear-gradient(135deg,#052e16,#166534)",
  color:"#fff",
  borderRadius:24,
  padding:28,
  display:"flex",
  alignItems:"center",
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
  letterSpacing:"-0.04em",
};

const heroSub: CSSProperties = {
  margin:"10px 0 0",
  maxWidth:650,
  color:"rgba(255,255,255,.78)",
  fontSize:15,
  lineHeight:1.7,
};

const profileBox: CSSProperties = {
  minWidth:230,
  display:"flex",
  alignItems:"center",
  gap:12,
  background:"rgba(255,255,255,.1)",
  border:"1px solid rgba(255,255,255,.18)",
  borderRadius:18,
  padding:14,
};

const statsGrid: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",
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
  marginBottom:8,
};

const statValue: CSSProperties = {
  color:C.text,
  fontSize:24,
  lineHeight:1.15,
  fontWeight:900,
  letterSpacing:"-0.03em",
};

const statSub: CSSProperties = {
  color:C.muted,
  fontSize:13,
  marginTop:7,
  lineHeight:1.5,
};

const mainGrid: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"minmax(0,1.1fr) minmax(0,.9fr)",
  gap:18,
};

const sectionHeader: CSSProperties = {
  display:"flex",
  justifyContent:"space-between",
  alignItems:"flex-start",
  marginBottom:18,
};

const sectionTitle: CSSProperties = {
  margin:0,
  fontSize:20,
  color:C.text,
  fontWeight:900,
  letterSpacing:"-0.03em",
};

const sectionSub: CSSProperties = {
  margin:"5px 0 0",
  color:C.muted,
  fontSize:13,
};

const instructorHeader: CSSProperties = {
  display:"flex",
  gap:16,
  alignItems:"center",
  marginBottom:16,
};

const rankBadge: CSSProperties = {
  display:"inline-flex",
  background:C.surface,
  color:C.primary,
  border:"1px solid rgba(22,163,74,.14)",
  borderRadius:999,
  padding:"5px 10px",
  fontSize:12,
  fontWeight:900,
};

const bioText: CSSProperties = {
  color:"#334155",
  lineHeight:1.8,
  fontSize:14,
  margin:"12px 0 16px",
};

const contactGrid: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",
  gap:10,
};

const contactItem: CSSProperties = {
  background:"#f8fafc",
  border:"1px solid #e2e8f0",
  borderRadius:14,
  padding:12,
};

const courseCard: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"48px 1fr",
  gap:12,
  alignItems:"center",
  border:"1px solid #e2e8f0",
  borderRadius:16,
  padding:14,
  background:"#fff",
};

const courseIcon: CSSProperties = {
  width:48,
  height:48,
  borderRadius:14,
  background:C.surface,
  color:C.primary,
  display:"flex",
  alignItems:"center",
  justifyContent:"center",
  fontWeight:900,
};

const personRow: CSSProperties = {
  display:"flex",
  gap:12,
  alignItems:"center",
  padding:"11px 0",
  borderBottom:"1px solid #e2e8f0",
};

const activityRow: CSSProperties = {
  display:"flex",
  justifyContent:"space-between",
  alignItems:"center",
  padding:"14px 0",
  borderBottom:"1px solid #e2e8f0",
  color:C.muted,
  fontSize:14,
};

const emptyState: CSSProperties = {
  minHeight:160,
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

const emptyIcon: CSSProperties = {
  fontSize:28,
  marginBottom:8,
};

