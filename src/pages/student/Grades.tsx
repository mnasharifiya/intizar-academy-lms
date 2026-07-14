import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { PageHeader, Card, Button } from "../../components/common/ui";
import { C } from "../../lib/theme";
import {
  loadAssessmentScores,
  loadCourseResults,
  type AssessmentScore,
  type StudentCourseResult,
} from "../../lib/scoreApi";
import { loadAssessmentSchemes, type AssessmentScheme } from "../../lib/assessmentApi";

export default function StudentGrades({
  user,
  data,
}: {
  user: any;
  data: any;
}) {
  const courses = data?.courses ?? [];

  const [scores, setScores] = useState<AssessmentScore[]>([]);
  const [results, setResults] = useState<StudentCourseResult[]>([]);
  const [schemes, setSchemes] = useState<AssessmentScheme[]>([]);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setBusy(true);

    try {
      const [scoreList, resultList, schemeList] = await Promise.all([
        loadAssessmentScores(),
        loadCourseResults(),
        loadAssessmentSchemes(),
      ]);

      setScores(scoreList.filter(score => score.studentId === user.id));
      setResults(resultList.filter(result => result.studentId === user.id));
      setSchemes(schemeList);
    } catch (err: any) {
      alert(err?.message || "Could not load grades.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function courseName(courseId: string) {
    return courses.find((c: any) => c.id === courseId)?.name || "Course";
  }

  function schemeFor(courseId: string) {
    return schemes.find(s => s.courseId === courseId) || null;
  }

  function resultFor(courseId: string) {
    return results.find(r => r.courseId === courseId) || null;
  }

  function scoresForCourse(courseId: string) {
    return scores.filter(s => s.courseId === courseId);
  }

  const courseCards = useMemo(() => {
    const ids = new Set<string>();

    for (const course of courses) ids.add(course.id);
    for (const score of scores) ids.add(score.courseId);
    for (const result of results) ids.add(result.courseId);

    return Array.from(ids).map(courseId => {
      const scheme = schemeFor(courseId);
      const courseScores = scoresForCourse(courseId);
      const result = resultFor(courseId);

      if (!scheme) {
        const avg =
          courseScores.length === 0
            ? 0
            : Math.round(
                courseScores.reduce((sum, s) => sum + Number(s.scorePercent || 0), 0) /
                  courseScores.length
              );

        return {
          courseId,
          scheme,
          result,
          scores: courseScores,
          progressPercent: courseScores.length > 0 ? 100 : 0,
          currentGrade: avg,
          breakdown: [],
        };
      }

      const breakdown = scheme.components.map(component => {
        const componentScores = courseScores.filter(score => score.componentType === component.componentType);

        const submittedCount = componentScores.length;

        const average =
          submittedCount === 0
            ? 0
            : Math.round(
                componentScores.reduce((sum, score) => sum + Number(score.scorePercent || 0), 0) /
                  submittedCount
              );

        const requiredCount = Number(component.requiredCount || 0);
        const complete = requiredCount === 0 ? true : submittedCount >= requiredCount;
        const weightedScore = Math.round((average * Number(component.weight || 0)) / 100);

        return {
          componentType: component.componentType,
          label: component.label,
          requiredCount,
          submittedCount,
          weight: component.weight,
          average,
          weightedScore,
          complete,
        };
      });

      const totalRequired = breakdown.reduce((sum, item) => sum + Number(item.requiredCount || 0), 0);
      const totalSubmitted = breakdown.reduce(
        (sum, item) => sum + Math.min(Number(item.submittedCount || 0), Number(item.requiredCount || 0)),
        0
      );

      const progressPercent =
        totalRequired === 0 ? 0 : Math.round((totalSubmitted / totalRequired) * 100);

      const currentGrade = breakdown.reduce((sum, item) => sum + Number(item.weightedScore || 0), 0);

      return {
        courseId,
        scheme,
        result,
        scores: courseScores,
        progressPercent,
        currentGrade,
        breakdown,
      };
    });
  }, [courses, scores, results, schemes]);

  const completedResults = results.filter(r => r.assessmentComplete);
  const officialAverage =
    completedResults.length === 0
      ? null
      : Math.round(
          completedResults.reduce((sum, r) => sum + Number(r.finalGrade || 0), 0) /
            completedResults.length
        );

  const passed = results.filter(r => r.status === "passed").length;
  const failed = results.filter(r => r.status === "failed").length;
  const incomplete = results.filter(r => r.status === "incomplete").length;

  return (
    <div>
      <PageHeader
        title="My Grades"
        sub="Live progress, entered scores, weighted course results, and official transcript."
      />

      <div style={statsGrid}>
        <Stat label="Official Average" value={officialAverage === null ? "-" : officialAverage + "%"} />
        <Stat label="Passed Courses" value={String(passed)} />
        <Stat label="Failed Courses" value={String(failed)} danger={failed > 0} />
        <Stat label="Incomplete Courses" value={String(incomplete)} danger={incomplete > 0} />
      </div>

      <Card>
        <div style={topRow}>
          <div>
            <h2 style={sectionTitle}>Live Course Progress</h2>
            <p style={sectionSub}>
              You can see every score immediately after your instructor records it. Final status becomes official after required scores are complete.
            </p>
          </div>

          <Button onClick={refresh} disabled={busy}>
            Refresh
          </Button>
        </div>
      </Card>

      {courseCards.map(card => (
        <Card key={card.courseId}>
          <div style={topRow}>
            <div>
              <h2 style={sectionTitle}>{courseName(card.courseId)}</h2>
              <p style={sectionSub}>
                Progress: {card.progressPercent}% · Current weighted progress: {card.currentGrade}%
              </p>
            </div>

            <div style={{textAlign:"right"}}>
              {card.result ? (
                <StatusBadge status={card.result.status} />
              ) : (
                <StatusBadge status="in progress" />
              )}
            </div>
          </div>

          <div style={progressTrack}>
            <div style={{...progressFill,width:`${Math.min(100, card.progressPercent)}%`}} />
          </div>

          <div style={miniGrid}>
            <Info label="Current Progress Grade" value={card.currentGrade + "%"} />
            <Info label="Official Final Grade" value={card.result ? card.result.finalGrade + "%" : "-"} />
            <Info label="Pass Mark" value={card.result ? card.result.passMark + "%" : card.scheme ? card.scheme.passMark + "%" : "-"} />
            <Info label="Assessment Complete" value={card.result ? (card.result.assessmentComplete ? "Yes" : "No") : "No"} />
          </div>

          {card.scheme && (
            <>
              <h3 style={miniTitle}>Assessment Breakdown</h3>

              <div style={{overflowX:"auto",marginTop:10}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr style={{background:"#f8fafc",textAlign:"left"}}>
                      <th style={th}>Component</th>
                      <th style={th}>Required</th>
                      <th style={th}>Submitted</th>
                      <th style={th}>Average</th>
                      <th style={th}>Weight</th>
                      <th style={th}>Current Weighted</th>
                      <th style={th}>Complete</th>
                    </tr>
                  </thead>

                  <tbody>
                    {card.breakdown.map((item: any) => (
                      <tr key={item.componentType} style={{borderBottom:"1px solid #e2e8f0"}}>
                        <td style={td}>{item.label}</td>
                        <td style={td}>{item.requiredCount}</td>
                        <td style={td}>{item.submittedCount}</td>
                        <td style={td}>{item.average}%</td>
                        <td style={td}>{item.weight}%</td>
                        <td style={td}>{item.weightedScore}%</td>
                        <td style={td}>{item.complete ? "Yes" : "No"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <h3 style={miniTitle}>Scores Entered by Instructor</h3>

          <div style={{overflowX:"auto",marginTop:10}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"#f8fafc",textAlign:"left"}}>
                  <th style={th}>Component</th>
                  <th style={th}>Title</th>
                  <th style={th}>Score</th>
                  <th style={th}>Percent</th>
                  <th style={th}>Date</th>
                </tr>
              </thead>

              <tbody>
                {card.scores.map(score => (
                  <tr key={score.id} style={{borderBottom:"1px solid #e2e8f0"}}>
                    <td style={td}>{score.componentType}</td>
                    <td style={td}>{score.title}</td>
                    <td style={td}>{score.score}/{score.maxScore}</td>
                    <td style={td}>{score.scorePercent}%</td>
                    <td style={td}>{score.assessmentDate}</td>
                  </tr>
                ))}

                {card.scores.length === 0 && (
                  <tr>
                    <td style={td} colSpan={5}>No score entered yet for this course.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      {courseCards.length === 0 && (
        <Card>
          <div style={emptyState}>
            <strong>No grades yet</strong>
            <p>Your scores will appear here when your instructor records them.</p>
          </div>
        </Card>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoCard}>
      <div style={{fontSize:12,color:C.muted,fontWeight:900}}>{label}</div>
      <div style={{fontSize:15,color:C.text,fontWeight:900,marginTop:5}}>{value}</div>
    </div>
  );
}

function Stat({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return (
    <div style={statCard}>
      <div style={statLabel}>{label}</div>
      <div style={{...statValue,color:danger ? "#dc2626" : C.text}}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "passed"
      ? ["#dcfce7", "#166534"]
      : status === "failed"
        ? ["#fee2e2", "#991b1b"]
        : status === "incomplete"
          ? ["#fef3c7", "#92400e"]
          : ["#e0f2fe", "#075985"];

  return (
    <span style={{
      display:"inline-flex",
      padding:"7px 11px",
      borderRadius:999,
      background: color[0],
      color: color[1],
      fontSize:12,
      fontWeight:900,
      textTransform:"capitalize",
    }}>
      {status}
    </span>
  );
}

const statsGrid: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
  gap:16,
  marginBottom:18,
};

const statCard: CSSProperties = {
  background:"#fff",
  border:"1px solid #e2e8f0",
  borderRadius:18,
  padding:18,
};

const statLabel: CSSProperties = {
  color:C.muted,
  fontSize:13,
  fontWeight:900,
};

const statValue: CSSProperties = {
  fontSize:28,
  fontWeight:900,
  marginTop:5,
};

const topRow: CSSProperties = {
  display:"flex",
  justifyContent:"space-between",
  alignItems:"start",
  gap:14,
  flexWrap:"wrap",
};

const sectionTitle: CSSProperties = {
  margin:0,
  fontSize:22,
  color:C.text,
  fontWeight:900,
};

const sectionSub: CSSProperties = {
  margin:"6px 0 0",
  color:C.muted,
  fontSize:14,
};

const miniTitle: CSSProperties = {
  margin:"22px 0 0",
  color:C.text,
  fontSize:17,
  fontWeight:900,
};

const miniGrid: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
  gap:12,
  marginTop:16,
};

const infoCard: CSSProperties = {
  border:"1px solid "+C.border,
  borderRadius:14,
  padding:14,
  background:"#f8fafc",
};

const progressTrack: CSSProperties = {
  height:12,
  background:"#e2e8f0",
  borderRadius:999,
  overflow:"hidden",
  marginTop:16,
};

const progressFill: CSSProperties = {
  height:"100%",
  background:C.primary,
  borderRadius:999,
};

const th: CSSProperties = {
  padding:"12px",
  color:C.muted,
  fontSize:12,
  fontWeight:900,
  textTransform:"uppercase",
};

const td: CSSProperties = {
  padding:"12px",
  verticalAlign:"middle",
  color:C.text,
};

const emptyState: CSSProperties = {
  minHeight:120,
  display:"flex",
  flexDirection:"column",
  alignItems:"center",
  justifyContent:"center",
  textAlign:"center",
  color:C.muted,
};
