const fs = require("fs");

// 1. Add saveFinalCourseResult to scoreApi.ts
const apiPath = "src/lib/scoreApi.ts";
let api = fs.readFileSync(apiPath, "utf8");

if (!api.includes("export async function saveFinalCourseResult")) {
  api += `

export async function saveFinalCourseResult(input: {
  studentId: string;
  courseId: string;
  groupId: string | null;
  finalGrade: number;
  passMark: number;
  assessmentComplete: boolean;
  calculatedBy: string;
}): Promise<StudentCourseResult> {
  const now = new Date().toISOString();

  const finalGrade = Math.max(0, Math.min(100, Number(input.finalGrade || 0)));
  const passMark = Number(input.passMark || 70);
  const assessmentComplete = input.assessmentComplete === true;

  const status = !assessmentComplete
    ? "incomplete"
    : finalGrade >= passMark
      ? "passed"
      : "failed";

  const payload = {
    student_id: input.studentId,
    course_id: input.courseId,
    group_id: input.groupId,
    final_grade: finalGrade,
    pass_mark: passMark,
    assessment_complete: assessmentComplete,
    status,
    component_breakdown: [
      {
        componentType: "final_result",
        label: "Final Result Entry",
        weight: 100,
        score: finalGrade,
        maxScore: 100,
        scorePercent: finalGrade,
        weightedScore: finalGrade,
        complete: assessmentComplete,
        manualSummary: true,
      },
    ],
    calculated_by: input.calculatedBy,
    calculated_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from("student_course_results")
    .upsert(payload, {
      onConflict: "student_id,course_id,group_id",
    })
    .select()
    .single();

  if (error) throw error;

  return mapResult(data as any);
}
`;
}

fs.writeFileSync(apiPath, api, "utf8");

// 2. Patch ScoreEntry.tsx
const pagePath = "src/pages/instructor/ScoreEntry.tsx";
let text = fs.readFileSync(pagePath, "utf8");

// Import saveFinalCourseResult
if (!text.includes("saveFinalCourseResult,")) {
  text = text.replace(
    "  saveAssessmentScore,\n  type AssessmentScore,",
    "  saveAssessmentScore,\n  saveFinalCourseResult,\n  type AssessmentScore,"
  );
}

// Add final result draft state
if (!text.includes("finalResultDrafts")) {
  text = text.replace(
    "  const [busy, setBusy] = useState(false);",
    `  const [busy, setBusy] = useState(false);
  const [finalResultDrafts, setFinalResultDrafts] = useState<Record<string, {
    finalGrade: string;
    passMark: string;
    assessmentComplete: boolean;
  }>>({});`
  );
}

// Add helper functions
if (!text.includes("function finalDraftFor")) {
  text = text.replace(
`  async function saveScore() {`,
`  function finalDraftFor(studentIdValue: string) {
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
        \`\${courseName(courseId)} final result is \${finalGradeNumber}%.\`
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
      alert(\`Saved \${saved} final result(s).\`);
    } catch (err: any) {
      alert(err?.message || "Could not save final results.");
    } finally {
      setBusy(false);
    }
  }

  async function saveScore() {`
  );
}

// Add Final Result Entry Mode card before Course Results
if (!text.includes("Final Result Entry Mode")) {
  text = text.replace(
`      <Card>
        <h2 style={sectionTitle}>Course Results</h2>`,
`      {groupId && courseId && (
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
        <h2 style={sectionTitle}>Course Results</h2>`
  );
}

fs.writeFileSync(pagePath, text, "utf8");

console.log("Final Result Entry Mode added.");
