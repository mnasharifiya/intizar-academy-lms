import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { PageHeader, Card, Button, Input } from "../../components/common/ui";
import { C } from "../../lib/theme";
import { notifyUsers } from "../../lib/notify";
import {
  loadAssessmentSchemes,
  type AssessmentScheme,
} from "../../lib/assessmentApi";
import {
  calculateAndSaveCourseResult,
  deleteAssessmentScore,
  loadAssessmentScores,
  loadCourseResults,
  saveAssessmentScore,
  saveFinalCourseResult,
  type AssessmentScore,
  type StudentCourseResult,
} from "../../lib/scoreApi";

export default function InstructorScoreEntry({
  user,
  data,
}: {
  user: any;
  data: any;
}) {
  const users = data?.users ?? [];
  const groups = data?.groups ?? [];
  const courses = data?.courses ?? [];
  const levelCourses = data?.levelCourses ?? [];
  const groupStudents = data?.groupStudents ?? [];

  const [schemes, setSchemes] = useState<AssessmentScheme[]>([]);
  const [scores, setScores] = useState<AssessmentScore[]>([]);
  const [results, setResults] = useState<StudentCourseResult[]>([]);

  const [groupId, setGroupId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [componentType, setComponentType] = useState("");
  const [title, setTitle] = useState("");
  const [score, setScore] = useState("0");
  const [maxScore, setMaxScore] = useState("100");
  const [assessmentDate, setAssessmentDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [busy, setBusy] = useState(false);
  const [finalResultDrafts, setFinalResultDrafts] = useState<Record<string, {
    finalGrade: string;
    passMark: string;
    assessmentComplete: boolean;
  }>>({});

  const visibleGroups = useMemo(() => {
    return groups.filter((g: any) => {
      if (g.isActive === false) return false;
      if (user.role === "instructor") return g.instructorId === user.id;
      return true;
    });
  }, [groups, user]);

  const selectedGroup = visibleGroups.find((g: any) => g.id === groupId) || null;

  const availableCourses = useMemo(() => {
    if (!selectedGroup) return [];

    const courseIds = levelCourses
      .filter((lc: any) => lc.levelId === selectedGroup.levelId)
      .map((lc: any) => lc.courseId);

    return courses.filter((course: any) => courseIds.includes(course.id));
  }, [courses, levelCourses, selectedGroup]);

  const selectedScheme = schemes.find(s => s.courseId === courseId) || null;

  const groupStudentIds = groupStudents
    .filter((gs: any) =>
      gs.groupId === groupId &&
      (gs.status === "approved" || !gs.status)
    )
    .map((gs: any) => gs.studentId);

  const students = users.filter((u: any) =>
    u.role === "student" &&
    groupStudentIds.includes(u.id)
  );

  async function refresh() {
    const [schemeList, scoreList, resultList] = await Promise.all([
      loadAssessmentSchemes(),
      loadAssessmentScores(),
      loadCourseResults(),
    ]);

    setSchemes(schemeList);
    setScores(scoreList);
    setResults(resultList);

    if (!groupId && visibleGroups.length > 0) {
      const firstGroup = visibleGroups[0];
      setGroupId(firstGroup.id);

      const courseIds = levelCourses
        .filter((lc: any) => lc.levelId === firstGroup.levelId)
        .map((lc: any) => lc.courseId);

      const firstCourse = courses.find((c: any) => courseIds.includes(c.id));
      if (firstCourse) setCourseId(firstCourse.id);
    }
  }

  useEffect(() => {
    refresh().catch(err => alert(err?.message || "Could not load score entry."));
  }, []);

  useEffect(() => {
    if (!courseId && availableCourses.length > 0) {
      setCourseId(availableCourses[0].id);
    }
  }, [availableCourses, courseId]);

  useEffect(() => {
    if (!studentId && students.length > 0) {
      setStudentId(students[0].id);
    }
  }, [students, studentId]);

  useEffect(() => {
    if (!componentType && selectedScheme?.components?.length) {
      setComponentType(selectedScheme.components[0].componentType);
    }
  }, [selectedScheme, componentType]);

  function courseName(id: string) {
    return courses.find((c: any) => c.id === id)?.name || "-";
  }

  function studentName(id: string) {
    return users.find((u: any) => u.id === id)?.name || "-";
  }

  function resultFor(studentIdValue: string) {
    return results.find(r =>
      r.studentId === studentIdValue &&
      r.courseId === courseId &&
      (!groupId || r.groupId === groupId)
    ) || null;
  }

  function scoresForStudent(studentIdValue: string) {
    return scores.filter(s =>
      s.studentId === studentIdValue &&
      s.courseId === courseId &&
      (!groupId || s.groupId === groupId)
    );
  }

  function finalDraftFor(studentIdValue: string) {
    const existingDraft = finalResultDrafts[studentIdValue];
    if (existingDraft) return existingDraft;

    const existingResult = resultFor(studentIdValue);

    return {
      finalGrade: existingResult ? String(Math.round(Number(existingResult.finalGrade || 0))) : "",
      passMark: existingResult ? String(existingResult.passMark || selectedScheme?.passMark || 70) : String(selectedScheme?.passMark || 70),
      assessmentComplete: existingResult ? existingResult.assessmentComplete : true,
    };
  }

  function updateFinalDraft(studentIdValue: string, patch: Partial<{
    finalGrade: string;
    passMark: string;
    assessmentComplete: boolean;
  }>) {
    setFinalResultDrafts(prev => ({
      ...prev,
      [studentIdValue]: {
        ...finalDraftFor(studentIdValue),
        ...patch,
      },
    }));
  }

  async function saveFinalResult(studentIdValue: string, silent = false) {
    if (!groupId || !courseId) {
      alert("Please select group and course first.");
      return;
    }

    const draft = finalDraftFor(studentIdValue);

    if (draft.finalGrade.trim() === "") {
      alert("Final grade is required.");
      return;
    }

    const finalGradeNumber = Number(draft.finalGrade);
    const passMarkNumber = Number(draft.passMark || selectedScheme?.passMark || 70);

    if (Number.isNaN(finalGradeNumber) || finalGradeNumber < 0 || finalGradeNumber > 100) {
      alert("Final grade must be between 0 and 100.");
      return;
    }

    if (Number.isNaN(passMarkNumber) || passMarkNumber < 0 || passMarkNumber > 100) {
      alert("Pass mark must be between 0 and 100.");
      return;
    }

    await saveFinalCourseResult({
      studentId: studentIdValue,
      courseId,
      groupId,
      finalGrade: finalGradeNumber,
      passMark: passMarkNumber,
      assessmentComplete: draft.assessmentComplete,
      calculatedBy: user.id,
    });

    try {
      await notifyUsers(
        [studentIdValue],
        "grade",
        "Final Course Result Posted",
        `${courseName(courseId)} final result is ${finalGradeNumber}%.`
      );
    } catch (notifyErr) {
      console.warn("Final result notification failed:", notifyErr);
    }

    if (!silent) {
      await refresh();
      alert("Final result saved.");
    }
  }

  async function saveAllFinalResults() {
    const ok = confirm("Save final results for all students with filled final grade?");
    if (!ok) return;

    try {
      setBusy(true);

      let saved = 0;

      for (const student of students) {
        const draft = finalDraftFor(student.id);
        if (draft.finalGrade.trim() === "") continue;

        await saveFinalResult(student.id, true);
        saved++;
      }

      await refresh();
      alert(`Saved ${saved} final result(s).`);
    } catch (err: any) {
      alert(err?.message || "Could not save final results.");
    } finally {
      setBusy(false);
    }
  }

  async function saveScore() {
    if (!selectedScheme) {
      alert("No assessment scheme found for this course. Main Admin must configure Assessment Scheme first.");
      return;
    }

    if (!groupId || !courseId || !studentId || !componentType || !title.trim()) {
      alert("Group, course, student, component, and title are required.");
      return;
    }

    try {
      setBusy(true);

      await saveAssessmentScore({
        studentId,
        courseId,
        groupId,
        componentType,
        title,
        score: Number(score || 0),
        maxScore: Number(maxScore || 100),
        assessmentDate,
        enteredBy: user.id,
      });

      await calculateAndSaveCourseResult({
        studentId,
        courseId,
        groupId,
        scheme: selectedScheme,
        calculatedBy: user.id,
      });

      const componentLabel =
        selectedScheme.components.find(c => c.componentType === componentType)?.label || componentType;

      try {
        await notifyUsers(
          [studentId],
          "grade",
          "New Score Posted",
          `${courseName(courseId)}: ${componentLabel} - ${title} score is ${score}/${maxScore}.`
        );
      } catch (notifyErr) {
        console.warn("Score notification failed:", notifyErr);
      }

      setTitle("");
      setScore("0");
      setMaxScore("100");

      await refresh();

      alert("Score saved and course result recalculated.");
    } catch (err: any) {
      alert(err?.message || "Could not save score.");
    } finally {
      setBusy(false);
    }
  }

  async function recalculate(studentIdValue: string) {
    if (!selectedScheme) {
      alert("No assessment scheme found for this course.");
      return;
    }

    try {
      setBusy(true);

      await calculateAndSaveCourseResult({
        studentId: studentIdValue,
        courseId,
        groupId,
        scheme: selectedScheme,
        calculatedBy: user.id,
      });

      await refresh();
      alert("Result recalculated.");
    } catch (err: any) {
      alert(err?.message || "Could not recalculate result.");
    } finally {
      setBusy(false);
    }
  }

  async function removeScore(scoreId: string, studentIdValue: string) {
    const ok = confirm("Delete this score?");

    if (!ok) return;

    try {
      setBusy(true);
      await deleteAssessmentScore(scoreId);

      if (selectedScheme) {
        await calculateAndSaveCourseResult({
          studentId: studentIdValue,
          courseId,
          groupId,
          scheme: selectedScheme,
          calculatedBy: user.id,
        });
      }

      await refresh();
    } catch (err: any) {
      alert(err?.message || "Could not delete score.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Score Entry"
        sub="Enter quiz, assignment, discussion, participation, attendance, and exam scores by course."
      />

      <Card>
        <div style={selectors}>
          <div style={field}>
            <label style={label}>Group</label>
            <select
              value={groupId}
              onChange={e => {
                setGroupId(e.target.value);
                setCourseId("");
                setStudentId("");
              }}
              style={selectStyle}
            >
              <option value="">Select group</option>
              {visibleGroups.map((group: any) => (
                <option key={group.id} value={group.id}>{group.name}</option>
              ))}
            </select>
          </div>

          <div style={field}>
            <label style={label}>Course</label>
            <select
              value={courseId}
              onChange={e => {
                setCourseId(e.target.value);
                setComponentType("");
              }}
              style={selectStyle}
            >
              <option value="">Select course</option>
              {availableCourses.map((course: any) => (
                <option key={course.id} value={course.id}>{course.name}</option>
              ))}
            </select>
          </div>

          <div style={field}>
            <label style={label}>Student</label>
            <select
              value={studentId}
              onChange={e => setStudentId(e.target.value)}
              style={selectStyle}
            >
              <option value="">Select student</option>
              {students.map((student: any) => (
                <option key={student.id} value={student.id}>{student.name}</option>
              ))}
            </select>
          </div>
        </div>

        {!selectedScheme && courseId && (
          <div style={warningBox}>
            No assessment scheme found for this course. Main Admin must configure it in Assessment Scheme before score entry.
          </div>
        )}

        {selectedScheme && (
          <div style={schemeBox}>
            <strong>{courseName(courseId)} Scheme</strong>
            <div>Duration: {selectedScheme.durationMonths} months</div>
            <div>Pass mark: {selectedScheme.passMark}%</div>
            <div>Attendance required: {selectedScheme.attendanceRequired}%</div>
          </div>
        )}
      </Card>

      {selectedScheme && (
        <Card>
          <h2 style={sectionTitle}>Add Score</h2>

          <div style={scoreGrid}>
            <div style={field}>
              <label style={label}>Component</label>
              <select
                value={componentType}
                onChange={e => setComponentType(e.target.value)}
                style={selectStyle}
              >
                {selectedScheme.components.map(component => (
                  <option key={component.componentType} value={component.componentType}>
                    {component.label} — {component.weight}%
                  </option>
                ))}
              </select>
            </div>

            <div style={field}>
              <label style={label}>Title</label>
              <Input
                value={title}
                onChange={setTitle}
                placeholder="Example: Quiz 1, Assignment 2, Final Exam"
              />
            </div>

            <div style={field}>
              <label style={label}>Score</label>
              <Input type="number" value={score} onChange={setScore} placeholder="Score" />
            </div>

            <div style={field}>
              <label style={label}>Max Score</label>
              <Input type="number" value={maxScore} onChange={setMaxScore} placeholder="100" />
            </div>

            <div style={field}>
              <label style={label}>Date</label>
              <Input type="date" value={assessmentDate} onChange={setAssessmentDate} placeholder="Date" />
            </div>
          </div>

          <div style={{marginTop:16}}>
            <Button onClick={saveScore} disabled={busy}>
              Save Score
            </Button>
          </div>
        </Card>
      )}

      {groupId && courseId && (
        <Card>
          <h2 style={sectionTitle}>Final Result Entry Mode</h2>
          <p style={sectionSub}>
            Fast mode for continuous assessment. Enter the final course result only.
            This updates certificate eligibility directly.
          </p>

          <div style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 14,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1e3a8a",
            fontWeight: 800
          }}>
            Use this when the assessment was continuous and already summarized by the instructor.
            The old detailed score entry remains available above.
          </div>

          <div style={{overflowX:"auto",marginTop:16}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"#f8fafc",textAlign:"left"}}>
                  <th style={th}>Student</th>
                  <th style={th}>Final Grade / 100</th>
                  <th style={th}>Pass Mark</th>
                  <th style={th}>Complete?</th>
                  <th style={th}>Auto Status</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {students.map((student: any) => {
                  const draft = finalDraftFor(student.id);
                  const finalGradeNumber = Number(draft.finalGrade || 0);
                  const passMarkNumber = Number(draft.passMark || selectedScheme?.passMark || 70);
                  const autoStatus = !draft.assessmentComplete
                    ? "incomplete"
                    : finalGradeNumber >= passMarkNumber
                      ? "passed"
                      : "failed";

                  return (
                    <tr key={student.id} style={{borderBottom:"1px solid #e2e8f0"}}>
                      <td style={td}>
                        <strong>{student.name}</strong>
                        <div style={meta}>{student.email}</div>
                      </td>

                      <td style={td}>
                        <Input
                          type="number"
                          value={draft.finalGrade}
                          onChange={(value) => updateFinalDraft(student.id, { finalGrade: value })}
                          placeholder="0 - 100"
                        />
                      </td>

                      <td style={td}>
                        <Input
                          type="number"
                          value={draft.passMark}
                          onChange={(value) => updateFinalDraft(student.id, { passMark: value })}
                          placeholder="70"
                        />
                      </td>

                      <td style={td}>
                        <label style={{display:"flex",alignItems:"center",gap:8,fontWeight:800}}>
                          <input
                            type="checkbox"
                            checked={draft.assessmentComplete}
                            onChange={event => updateFinalDraft(student.id, { assessmentComplete: event.target.checked })}
                          />
                          Complete
                        </label>
                      </td>

                      <td style={td}>
                        <span style={{
                          fontWeight: 900,
                          color: autoStatus === "passed" ? "#166534" : autoStatus === "failed" ? "#991b1b" : "#92400e"
                        }}>
                          {autoStatus}
                        </span>
                      </td>

                      <td style={td}>
                        <Button onClick={() => saveFinalResult(student.id)} disabled={busy}>
                          Save Final
                        </Button>
                      </td>
                    </tr>
                  );
                })}

                {students.length === 0 && (
                  <tr>
                    <td style={td} colSpan={6}>No approved students found in this group.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{marginTop:16,display:"flex",gap:10,flexWrap:"wrap"}}>
            <Button onClick={saveAllFinalResults} disabled={busy || students.length === 0}>
              Save All Filled Results
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <h2 style={sectionTitle}>Course Results</h2>
        <p style={sectionSub}>
          The system calculates final course grade using Main Admin assessment weights.
        </p>

        <div style={{overflowX:"auto",marginTop:16}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"#f8fafc",textAlign:"left"}}>
                <th style={th}>Student</th>
                <th style={th}>Final Grade</th>
                <th style={th}>Status</th>
                <th style={th}>Completion</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {students.map((student: any) => {
                const result = resultFor(student.id);

                return (
                  <tr key={student.id} style={{borderBottom:"1px solid #e2e8f0"}}>
                    <td style={td}>
                      <strong>{student.name}</strong>
                      <div style={meta}>{student.email}</div>
                    </td>

                    <td style={td}>
                      {result ? result.finalGrade + "%" : "-"}
                    </td>

                    <td style={td}>
                      <StatusBadge status={result?.status || "not calculated"} />
                    </td>

                    <td style={td}>
                      {result ? (result.assessmentComplete ? "Complete" : "Incomplete") : "-"}
                    </td>

                    <td style={td}>
                      <Button variant="secondary" onClick={() => recalculate(student.id)} disabled={busy || !selectedScheme}>
                        Recalculate
                      </Button>
                    </td>
                  </tr>
                );
              })}

              {students.length === 0 && (
                <tr>
                  <td style={td} colSpan={5}>No approved students in this group.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {studentId && (
        <Card>
          <h2 style={sectionTitle}>Scores for {studentName(studentId)}</h2>

          <div style={{overflowX:"auto",marginTop:16}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"#f8fafc",textAlign:"left"}}>
                  <th style={th}>Component</th>
                  <th style={th}>Title</th>
                  <th style={th}>Score</th>
                  <th style={th}>Percent</th>
                  <th style={th}>Date</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>

              <tbody>
                {scoresForStudent(studentId).map(item => (
                  <tr key={item.id} style={{borderBottom:"1px solid #e2e8f0"}}>
                    <td style={td}>{item.componentType}</td>
                    <td style={td}>{item.title}</td>
                    <td style={td}>{item.score}/{item.maxScore}</td>
                    <td style={td}>{item.scorePercent}%</td>
                    <td style={td}>{item.assessmentDate}</td>
                    <td style={td}>
                      <Button variant="danger" onClick={() => removeScore(item.id, item.studentId)} disabled={busy}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}

                {scoresForStudent(studentId).length === 0 && (
                  <tr>
                    <td style={td} colSpan={6}>No scores entered yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "passed"
      ? ["#dcfce7", "#166534"]
      : status === "failed"
        ? ["#fee2e2", "#991b1b"]
        : ["#fef3c7", "#92400e"];

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

const selectors: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",
  gap:12,
};

const scoreGrid: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
  gap:12,
};

const field: CSSProperties = {
  display:"grid",
  gap:8,
};

const label: CSSProperties = {
  fontSize:13,
  color:C.text,
  fontWeight:900,
};

const selectStyle: CSSProperties = {
  padding:"12px 14px",
  border:"1px solid "+C.border,
  borderRadius:10,
  background:"#fff",
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

const schemeBox: CSSProperties = {
  border:"1px solid #bbf7d0",
  background:"#f0fdf4",
  color:"#166534",
  padding:14,
  borderRadius:14,
  marginTop:16,
  lineHeight:1.7,
};

const warningBox: CSSProperties = {
  border:"1px solid #fed7aa",
  background:"#fff7ed",
  color:"#9a3412",
  padding:14,
  borderRadius:14,
  marginTop:16,
  lineHeight:1.7,
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

const meta: CSSProperties = {
  fontSize:12,
  color:C.muted,
  marginTop:4,
};


