import { type CSSProperties } from "react";
import { Card } from "../../components/common/ui";
import { C } from "../../lib/theme";

export default function StudentLearning({
  user,
  data,
}: {
  user: any;
  data: any;
}) {
  const groups = data?.groups ?? [];
  const groupStudents = data?.groupStudents ?? [];
  const levelCourses = data?.levelCourses ?? [];
  const courses = data?.courses ?? [];
  const lectures = data?.lectures ?? [];
  const videos = data?.videos ?? [];
  const users = data?.users ?? [];

  const myMembership = groupStudents.find((gs: any) => gs.studentId === user.id);
  const myGroup = groups.find((g: any) => g.id === myMembership?.groupId);
  const instructor = users.find((u: any) => u.id === myGroup?.instructorId);

  const myCourseIds = levelCourses
    .filter((lc: any) => lc.levelId === user.levelId)
    .map((lc: any) => lc.courseId);

  const myCourses = courses.filter((c: any) => myCourseIds.includes(c.id));

  const myLectures = myGroup
    ? lectures
        .filter((l: any) => l.groupId === myGroup.id)
        .sort((a: any, b: any) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime())
    : [];

  const now = Date.now();

  const upcomingLectures = myLectures.filter(
    (l: any) => new Date(l.scheduledTime).getTime() >= now
  );

  const pastLectures = myLectures.filter(
    (l: any) => new Date(l.scheduledTime).getTime() < now
  );

  const myVideos = myGroup
    ? videos
        .filter((v: any) => v.groupId === myGroup.id)
        .sort((a: any, b: any) => Number(a.order || 0) - Number(b.order || 0))
    : [];

  function courseName(id: string) {
    return courses.find((c: any) => c.id === id)?.name || "Course";
  }

  return (
    <div>
      <div style={hero}>
        <div>
          <div style={eyebrow}>Student Learning</div>
          <h1 style={heroTitle}>My Courses & Lectures</h1>
          <p style={heroSub}>
            Access your assigned courses, online lecture links, recorded videos, and learning resources.
          </p>
        </div>

        <div style={summaryBox}>
          <div style={{fontSize:13,color:"rgba(255,255,255,.75)",fontWeight:800}}>
            My Courses
          </div>
          <div style={{fontSize:42,fontWeight:900,lineHeight:1}}>
            {myCourses.length}
          </div>
        </div>
      </div>

      {!myGroup && (
        <Card>
          <div style={emptyState}>
            <div style={{fontSize:34,marginBottom:8}}>👥</div>
            <strong>No group assigned yet</strong>
            <p>Your lectures and videos will appear after admin assigns you to a group.</p>
          </div>
        </Card>
      )}

      <div style={statsGrid}>
        <Stat label="Group" value={myGroup?.name || "Not assigned"} />
        <Stat label="Instructor" value={instructor?.name || "Not assigned"} />
        <Stat label="Upcoming Lectures" value={String(upcomingLectures.length)} />
        <Stat label="Recorded Videos" value={String(myVideos.length)} />
      </div>

      <div style={grid}>
        <Card>
          <h2 style={sectionTitle}>My Courses</h2>
          <p style={sectionSub}>Courses assigned to your level</p>

          <div style={{display:"grid",gap:12,marginTop:18}}>
            {myCourses.length === 0 && (
              <div style={emptyState}>
                <strong>No courses assigned</strong>
                <p>Courses will appear here after admin assigns courses to your level.</p>
              </div>
            )}

            {myCourses.map((course: any) => (
              <div key={course.id} style={courseCard}>
                <div style={courseIcon}>
                  {course.name?.slice(0, 2).toUpperCase()}
                </div>

                <div>
                  <h3 style={{margin:"0 0 6px",color:C.text,fontSize:17}}>
                    {course.name}
                  </h3>
                  <p style={{margin:0,color:C.muted,fontSize:13,lineHeight:1.6}}>
                    {course.description || "No course description added."}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 style={sectionTitle}>Upcoming Online Lectures</h2>
          <p style={sectionSub}>Live sessions scheduled by your instructor</p>

          <div style={{display:"grid",gap:12,marginTop:18}}>
            {upcomingLectures.length === 0 && (
              <div style={emptyState}>
                <strong>No upcoming lectures</strong>
                <p>Online lectures will appear here after your instructor schedules them.</p>
              </div>
            )}

            {upcomingLectures.map((lecture: any) => (
              <div key={lecture.id} style={itemCard}>
                <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
                  <div>
                    <h3 style={{margin:"0 0 5px",color:C.text}}>
                      {lecture.title}
                    </h3>

                    <div style={meta}>
                      {courseName(lecture.courseId)}
                    </div>

                    <div style={meta}>
                      {formatDate(lecture.scheduledTime)}
                    </div>

                    {lecture.meetingUrl && (
                      <a href={lecture.meetingUrl} target="_blank" rel="noreferrer" style={linkStyle}>
                        Join Online Lecture
                      </a>
                    )}
                  </div>

                  <span style={statusBadge}>{lecture.status}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 style={sectionTitle}>Recorded Video Lectures</h2>
          <p style={sectionSub}>Videos uploaded by your instructor</p>

          <div style={{display:"grid",gap:12,marginTop:18}}>
            {myVideos.length === 0 && (
              <div style={emptyState}>
                <strong>No video lectures yet</strong>
                <p>Recorded lessons will appear here after your instructor publishes them.</p>
              </div>
            )}

            {myVideos.map((video: any) => (
              <div key={video.id} style={itemCard}>
                <div style={{display:"flex",gap:12}}>
                  <div style={videoIcon}>
                    {video.title?.slice(0, 2).toUpperCase()}
                  </div>

                  <div style={{flex:1}}>
                    <h3 style={{margin:"0 0 5px",color:C.text}}>
                      {video.title}
                    </h3>

                    <div style={meta}>
                      {courseName(video.courseId)}
                    </div>

                    <p style={{margin:"8px 0",fontSize:13,color:C.muted,lineHeight:1.6}}>
                      {video.description || "No description added."}
                    </p>

                    <a href={video.videoUrl} target="_blank" rel="noreferrer" style={linkStyle}>
                      Open Video Lecture
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 style={sectionTitle}>Previous Lectures</h2>
          <p style={sectionSub}>Older scheduled sessions</p>

          <div style={{display:"grid",gap:12,marginTop:18}}>
            {pastLectures.length === 0 && (
              <div style={emptyState}>
                <strong>No previous lectures</strong>
                <p>Completed or past lectures will appear here.</p>
              </div>
            )}

            {pastLectures.slice().reverse().map((lecture: any) => (
              <div key={lecture.id} style={itemCard}>
                <h3 style={{margin:"0 0 5px",color:C.text}}>
                  {lecture.title}
                </h3>

                <div style={meta}>{courseName(lecture.courseId)}</div>
                <div style={meta}>{formatDate(lecture.scheduledTime)}</div>

                {lecture.meetingUrl && (
                  <a href={lecture.meetingUrl} target="_blank" rel="noreferrer" style={linkStyle}>
                    Open Lecture Link
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <h2 style={sectionTitle}>Learning Materials</h2>
        <p style={sectionSub}>
          PDF, PPTX, DOCX, and downloadable resources will be connected after we add Supabase Storage.
        </p>

        <div style={materialNotice}>
          Materials module placeholder: instructor file upload and student download will be added in the next backend upgrade.
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
  gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",
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
  fontSize:20,
  fontWeight:900,
};

const grid: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))",
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

const itemCard: CSSProperties = {
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

const linkStyle: CSSProperties = {
  display:"inline-block",
  marginTop:8,
  color:C.primary,
  fontWeight:900,
  textDecoration:"none",
  fontSize:13,
};

const statusBadge: CSSProperties = {
  display:"inline-flex",
  height:28,
  alignItems:"center",
  padding:"0 10px",
  borderRadius:999,
  background:C.surface,
  color:C.primary,
  fontSize:12,
  fontWeight:900,
  textTransform:"capitalize",
};

const videoIcon: CSSProperties = {
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
};

const materialNotice: CSSProperties = {
  marginTop:16,
  background:"#f8fafc",
  border:"1px dashed #cbd5e1",
  borderRadius:16,
  padding:18,
  color:C.muted,
  lineHeight:1.7,
};
