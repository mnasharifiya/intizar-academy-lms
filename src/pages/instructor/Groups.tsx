import { type CSSProperties } from "react";
import { Card } from "../../components/common/ui";
import { C } from "../../lib/theme";

export default function InstructorGroups({
  user,
  data,
}: {
  user: any;
  data: any;
}) {
  const groups = data?.groups ?? [];
  const users = data?.users ?? [];
  const levels = data?.levels ?? [];
  const groupStudents = data?.groupStudents ?? [];
  const courses = data?.courses ?? [];
  const levelCourses = data?.levelCourses ?? [];

  const myGroups = groups.filter((g: any) => g.instructorId === user.id);

  function groupMembers(groupId: string) {
    return groupStudents
      .filter((gs: any) => gs.groupId === groupId)
      .map((gs: any) => users.find((u: any) => u.id === gs.studentId))
      .filter(Boolean);
  }

  function groupCourses(levelId: string) {
    const courseIds = levelCourses
      .filter((lc: any) => lc.levelId === levelId)
      .map((lc: any) => lc.courseId);

    return courses.filter((c: any) => courseIds.includes(c.id));
  }

  function levelName(levelId: string) {
    return levels.find((l: any) => l.id === levelId)?.name || "No level";
  }

  return (
    <div>
      <div style={hero}>
        <div>
          <div style={eyebrow}>Instructor Portal</div>
          <h1 style={heroTitle}>My Assigned Groups</h1>
          <p style={heroSub}>
            View the groups assigned to you, your students, their photos, levels, and courses.
          </p>
        </div>

        <div style={summaryBox}>
          <div style={{fontSize:13,color:"rgba(255,255,255,.75)",fontWeight:800}}>
            Total Groups
          </div>
          <div style={{fontSize:42,fontWeight:900,lineHeight:1}}>
            {myGroups.length}
          </div>
        </div>
      </div>

      {myGroups.length === 0 && (
        <Card>
          <div style={emptyState}>
            <div style={{fontSize:34,marginBottom:8}}>👥</div>
            <strong>No group assigned yet</strong>
            <p>When admin assigns a group to you, it will appear here.</p>
          </div>
        </Card>
      )}

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))",gap:18}}>
        {myGroups.map((group: any) => {
          const students = groupMembers(group.id);
          const assignedCourses = groupCourses(group.levelId);

          return (
            <Card key={group.id}>
              <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start"}}>
                <div>
                  <h2 style={{margin:"0 0 6px",color:C.text,fontSize:22}}>
                    {group.name}
                  </h2>
                  <div style={{fontSize:13,color:C.muted}}>
                    Level: <strong>{levelName(group.levelId)}</strong>
                  </div>
                  <div style={{fontSize:13,color:C.muted,marginTop:3}}>
                    Students: <strong>{students.length}/{group.maxStudents}</strong>
                  </div>
                </div>

                <span style={groupBadge}>
                  {group.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div style={{marginTop:18}}>
                <h3 style={sectionTitle}>Courses</h3>

                {assignedCourses.length === 0 && (
                  <p style={{color:C.muted,fontSize:13}}>No courses assigned to this level.</p>
                )}

                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {assignedCourses.map((course: any) => (
                    <span key={course.id} style={coursePill}>
                      {course.name}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{marginTop:22}}>
                <h3 style={sectionTitle}>Students</h3>

                {students.length === 0 && (
                  <p style={{color:C.muted,fontSize:13}}>No students assigned to this group yet.</p>
                )}

                <div style={{display:"grid",gap:12}}>
                  {students.map((student: any) => (
                    <div key={student.id} style={studentRow}>
                      <Avatar name={student.name} photo={student.photo} />

                      <div style={{minWidth:0}}>
                        <strong style={{color:C.text}}>{student.name}</strong>
                        <div style={{fontSize:12,color:C.muted,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                          {student.email}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Avatar({
  name,
  photo,
  size = 46,
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
  maxWidth:680,
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

const emptyState: CSSProperties = {
  minHeight:180,
  display:"flex",
  flexDirection:"column",
  alignItems:"center",
  justifyContent:"center",
  textAlign:"center",
  color:C.muted,
};

const groupBadge: CSSProperties = {
  background:C.surface,
  color:C.primary,
  borderRadius:999,
  padding:"7px 11px",
  fontSize:12,
  fontWeight:900,
};

const sectionTitle: CSSProperties = {
  margin:"0 0 10px",
  fontSize:15,
  color:C.text,
  fontWeight:900,
};

const coursePill: CSSProperties = {
  background:"#f8fafc",
  border:"1px solid #e2e8f0",
  color:C.text,
  borderRadius:999,
  padding:"7px 11px",
  fontSize:12,
  fontWeight:800,
};

const studentRow: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"46px 1fr",
  gap:12,
  alignItems:"center",
  padding:12,
  border:"1px solid #e2e8f0",
  borderRadius:14,
  background:"#fff",
};
