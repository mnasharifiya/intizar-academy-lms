import { type CSSProperties } from "react";
import { Card } from "../../components/common/ui";
import { C } from "../../lib/theme";

export default function StudentGrades({
  user,
  data,
}: {
  user: any;
  data: any;
}) {
  const grades = data?.grades ?? [];
  const assignments = data?.assignments ?? [];
  const lectures = data?.lectures ?? [];
  const courses = data?.courses ?? [];
  const levelCourses = data?.levelCourses ?? [];
  const users = data?.users ?? [];

  const myGrades = grades.filter((g: any) => g.studentId === user.id);

  const myCourseIds = levelCourses
    .filter((lc: any) => lc.levelId === user.levelId)
    .map((lc: any) => lc.courseId);

  const myCourses = courses.filter((c: any) => myCourseIds.includes(c.id));

  function getGradeCourseId(grade: any) {
    const assignment = assignments.find((a: any) => a.id === grade.assignmentId);
    const lecture = lectures.find((l: any) => l.id === grade.lectureId);
    return assignment?.courseId || lecture?.courseId || null;
  }

  function getGradeTitle(grade: any) {
    const assignment = assignments.find((a: any) => a.id === grade.assignmentId);
    const lecture = lectures.find((l: any) => l.id === grade.lectureId);
    return assignment?.title || lecture?.title || grade.type || "Grade";
  }

  function getGraderName(grade: any) {
    const grader = users.find((u: any) => u.id === grade.gradedBy);
    return grader?.name || "-";
  }

  function courseGrades(courseId: string) {
    return myGrades.filter((g: any) => getGradeCourseId(g) === courseId);
  }

  function averageOf(list: any[]) {
    if (!list.length) return 0;
    return Math.round(
      list.reduce((sum: number, g: any) => sum + Number(g.score || 0), 0) / list.length
    );
  }

  const gradedCourses = myCourses
    .map((course: any) => ({
      course,
      grades: courseGrades(course.id),
      average: averageOf(courseGrades(course.id)),
    }))
    .filter((item: any) => item.grades.length > 0);

  const overallAverage =
    myGrades.length > 0
      ? Math.round(
          myGrades.reduce((sum: number, g: any) => sum + Number(g.score || 0), 0) /
            myGrades.length
        )
      : 0;

  const courseAverage =
    gradedCourses.length > 0
      ? Math.round(
          gradedCourses.reduce((sum: number, item: any) => sum + item.average, 0) /
            gradedCourses.length
        )
      : 0;

  return (
    <div>
      <div style={hero}>
        <div>
          <div style={eyebrow}>Student Grades</div>
          <h1 style={heroTitle}>My Course Grades</h1>
          <p style={heroSub}>
            View your grades by course, course averages, feedback, and total academic average.
          </p>
        </div>

        <div style={averageBox}>
          <div style={{fontSize:13,color:"rgba(255,255,255,.75)",fontWeight:800}}>
            Total Average
          </div>
          <div style={{fontSize:42,fontWeight:900,lineHeight:1}}>
            {myGrades.length ? overallAverage + "%" : "-"}
          </div>
          <div style={{fontSize:13,color:"rgba(255,255,255,.75)",marginTop:6}}>
            {getStatus(overallAverage, myGrades.length)}
          </div>
        </div>
      </div>

      <div style={statsGrid}>
        <Stat label="Registered Courses" value={String(myCourses.length)} />
        <Stat label="Courses With Grades" value={String(gradedCourses.length)} />
        <Stat label="Total Grade Records" value={String(myGrades.length)} />
        <Stat label="Course Average" value={gradedCourses.length ? courseAverage + "%" : "-"} />
      </div>

      <Card>
        <div style={sectionHeader}>
          <div>
            <h2 style={sectionTitle}>Course Grade Summary</h2>
            <p style={sectionSub}>Each course shows its own average and grading status</p>
          </div>
        </div>

        {myCourses.length === 0 && (
          <div style={emptyState}>
            <div style={{fontSize:34,marginBottom:8}}>📚</div>
            <strong>No courses assigned</strong>
            <p>Your courses will appear here after admin assigns courses to your level.</p>
          </div>
        )}

        {myCourses.length > 0 && (
          <div style={{display:"grid",gap:14}}>
            {myCourses.map((course: any) => {
              const list = courseGrades(course.id);
              const avg = averageOf(list);

              return (
                <div key={course.id} style={courseSummaryCard}>
                  <div style={courseTop}>
                    <div style={{display:"flex",gap:12,alignItems:"center"}}>
                      <div style={courseIcon}>{course.name?.slice(0,2).toUpperCase()}</div>
                      <div>
                        <h3 style={{margin:"0 0 4px",color:C.text,fontSize:17}}>
                          {course.name}
                        </h3>
                        <div style={{fontSize:13,color:C.muted}}>
                          {list.length} graded activit{list.length === 1 ? "y" : "ies"}
                        </div>
                      </div>
                    </div>

                    <div style={{textAlign:"right"}}>
                      <div style={scoreBadge(avg, list.length)}>
                        {list.length ? avg + "%" : "No grade"}
                      </div>
                      <div style={{fontSize:12,color:C.muted,marginTop:5}}>
                        {getStatus(avg, list.length)}
                      </div>
                    </div>
                  </div>

                  <div style={progressTrack}>
                    <div style={{
                      ...progressFill,
                      width: list.length ? Math.min(100, avg) + "%" : "0%",
                      background: getProgressColor(avg, list.length),
                    }} />
                  </div>

                  {list.length === 0 && (
                    <p style={{margin:"12px 0 0",color:C.muted,fontSize:13}}>
                      No grade has been recorded for this course yet.
                    </p>
                  )}

                  {list.length > 0 && (
                    <div style={{marginTop:14,overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse"}}>
                        <thead>
                          <tr style={{background:"#f8fafc",textAlign:"left"}}>
                            <th style={smallTh}>Activity</th>
                            <th style={smallTh}>Type</th>
                            <th style={smallTh}>Score</th>
                            <th style={smallTh}>Feedback</th>
                            <th style={smallTh}>Graded By</th>
                          </tr>
                        </thead>

                        <tbody>
                          {list.map((grade: any) => (
                            <tr key={grade.id} style={{borderBottom:"1px solid #e2e8f0"}}>
                              <td style={smallTd}>{getGradeTitle(grade)}</td>
                              <td style={smallTd}>
                                <span style={typeBadge}>{grade.type}</span>
                              </td>
                              <td style={smallTd}>
                                <span style={scoreBadge(Number(grade.score || 0), 1)}>
                                  {grade.score}%
                                </span>
                              </td>
                              <td style={smallTd}>{grade.feedback || "-"}</td>
                              <td style={smallTd}>{getGraderName(grade)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
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

function getStatus(avg: number, count: number) {
  if (!count) return "No records";
  if (avg >= 85) return "Excellent";
  if (avg >= 70) return "Good";
  if (avg >= 50) return "Needs improvement";
  return "At risk";
}

function getProgressColor(avg: number, count: number) {
  if (!count) return "#e2e8f0";
  if (avg >= 70) return "#16a34a";
  if (avg >= 50) return "#d97706";
  return "#dc2626";
}

function scoreBadge(score: number, count: number): CSSProperties {
  if (!count) {
    return {
      display:"inline-flex",
      padding:"7px 11px",
      borderRadius:999,
      fontWeight:900,
      background:"#f1f5f9",
      color:"#64748b",
      fontSize:13,
    };
  }

  return {
    display:"inline-flex",
    padding:"7px 11px",
    borderRadius:999,
    fontWeight:900,
    background: score >= 70 ? "#dcfce7" : score >= 50 ? "#fef3c7" : "#fee2e2",
    color: score >= 70 ? "#166534" : score >= 50 ? "#92400e" : "#991b1b",
    fontSize:13,
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
  letterSpacing:"-0.04em",
};

const heroSub: CSSProperties = {
  margin:"10px 0 0",
  maxWidth:620,
  color:"rgba(255,255,255,.78)",
  fontSize:15,
  lineHeight:1.7,
};

const averageBox: CSSProperties = {
  minWidth:190,
  background:"rgba(255,255,255,.1)",
  border:"1px solid rgba(255,255,255,.18)",
  borderRadius:18,
  padding:18,
  textAlign:"center",
};

const statsGrid: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
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
  fontWeight:900,
};

const sectionHeader: CSSProperties = {
  marginBottom:18,
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
  minHeight:180,
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

const courseSummaryCard: CSSProperties = {
  border:"1px solid #e2e8f0",
  borderRadius:18,
  padding:16,
  background:"#fff",
};

const courseTop: CSSProperties = {
  display:"flex",
  justifyContent:"space-between",
  gap:16,
  alignItems:"center",
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

const progressTrack: CSSProperties = {
  height:9,
  background:"#f1f5f9",
  borderRadius:999,
  overflow:"hidden",
  marginTop:14,
};

const progressFill: CSSProperties = {
  height:"100%",
  borderRadius:999,
};

const smallTh: CSSProperties = {
  padding:"11px",
  fontSize:12,
  color:C.muted,
  fontWeight:900,
  textTransform:"uppercase",
};

const smallTd: CSSProperties = {
  padding:"12px 11px",
  fontSize:13,
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
