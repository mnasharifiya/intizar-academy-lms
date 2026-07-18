const fs = require("fs");

const path = "src/pages/admin/Certificates.tsx";
let text = fs.readFileSync(path, "utf8");

// 1. Import supabase
if (!text.includes('import { supabase } from "../../lib/supabase";')) {
  text = text.replace(
    'import { C } from "../../lib/theme";',
    'import { C } from "../../lib/theme";\nimport { supabase } from "../../lib/supabase";'
  );
}

// 2. Add auto eligibility states
if (!text.includes("dbEligibilityChecks")) {
  text = text.replace(
    'const [settingsView, setSettingsView] = useState<AppSettings>(DEFAULT_SETTINGS);',
    `const [settingsView, setSettingsView] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [dbEligibilityChecks, setDbEligibilityChecks] = useState<Record<string, any>>({});
  const [checkingEligibility, setCheckingEligibility] = useState<string | null>(null);`
  );
}

// 3. Add helper functions before generate()
if (!text.includes("async function checkDbEligibility")) {
  text = text.replace(
`  async function generate(student: any) {`,
`  function eligibilityCheckKey(studentId: string, programId?: string | null, groupId?: string | null) {
    return [studentId, programId || "no-program", groupId || "no-group"].join(":");
  }

  function eligibilityAlertText(snapshot: any) {
    const courses = snapshot?.courses ?? [];
    const badCourses = courses.filter((course: any) => !course.eligible_course);

    const lines = [
      snapshot?.reason || "Certificate eligibility check failed.",
      "",
      "Summary:",
      "Required courses: " + (snapshot?.required_course_count ?? 0),
      "Passed courses: " + (snapshot?.passed_count ?? 0),
      "Complete courses: " + (snapshot?.complete_count ?? 0),
      "Missing results: " + (snapshot?.missing_count ?? 0),
      "Failed/incomplete: " + (snapshot?.failed_count ?? 0),
    ];

    if (badCourses.length) {
      lines.push("", "Courses to fix:");
      badCourses.slice(0, 8).forEach((course: any) => {
        lines.push("- " + course.course_name + " | status: " + (course.status || "missing") + " | grade: " + (course.final_grade ?? "-"));
      });
    }

    return lines.join("\\n");
  }

  async function checkDbEligibility(student: any, silent = false) {
    const e = eligibility(student);
    const programId = e.programId;
    const groupId = e.group?.id || null;

    if (!programId || !groupId) {
      const result = {
        eligible: false,
        reason: "Student must have a program and approved group before certificate eligibility can be checked.",
        courses: [],
      };

      const key = eligibilityCheckKey(student.id, programId, groupId);

      setDbEligibilityChecks(prev => ({
        ...prev,
        [key]: result,
      }));

      if (!silent) alert(result.reason);

      return result;
    }

    try {
      setCheckingEligibility(student.id);

      const { data, error } = await (supabase as any).rpc("check_certificate_eligibility", {
        p_student_id: student.id,
        p_program_id: programId,
        p_group_id: groupId,
      });

      if (error) throw error;

      const key = eligibilityCheckKey(student.id, programId, groupId);

      setDbEligibilityChecks(prev => ({
        ...prev,
        [key]: data,
      }));

      if (!silent) {
        alert(data?.eligible ? "Student is eligible for certificate." : eligibilityAlertText(data));
      }

      return data;
    } catch (err: any) {
      if (!silent) alert(err?.message || "Could not check certificate eligibility.");
      throw err;
    } finally {
      setCheckingEligibility(null);
    }
  }

  async function generate(student: any) {`
  );
}

// 4. Make generate() use database eligibility check
if (!text.includes("const dbEligibility = await checkDbEligibility(student, true);")) {
  text = text.replace(
`    const existing = studentCertificate(student.id);
    if (existing) {
      alert("This student already has a valid certificate.");
      return;
    }`,
`    const existing = studentCertificate(student.id);
    if (existing) {
      alert("This student already has a valid certificate.");
      return;
    }

    const dbEligibility = await checkDbEligibility(student, true);

    if (!dbEligibility?.eligible) {
      alert("Certificate blocked by auto-check:\\n\\n" + eligibilityAlertText(dbEligibility));
      return;
    }`
  );

  text = text.replace(
`        eligibilitySnapshot: {
          requiredOverall: REQUIRED_OVERALL,
          requiredAttendance: REQUIRED_ATTENDANCE,
          average: e.average,
          attendance: e.attendance,
          failedCourses: e.failedCourses,
          remedialPayment: e.latestRemedial,
          refresherRequired: e.refresherRequired,
          group: e.group?.name || null,
          paymentStatus: e.application?.paymentStatus || "legacy/manual student",
          applicationStatus: e.application?.applicationStatus || "legacy/manual student",
          generatedAt: new Date().toISOString(),
        },`,
`        eligibilitySnapshot: {
          autoCheck: dbEligibility,
          legacyCheck: {
            requiredOverall: REQUIRED_OVERALL,
            requiredAttendance: REQUIRED_ATTENDANCE,
            average: e.average,
            attendance: e.attendance,
            failedCourses: e.failedCourses,
            remedialPayment: e.latestRemedial,
            refresherRequired: e.refresherRequired,
            group: e.group?.name || null,
            paymentStatus: e.application?.paymentStatus || "legacy/manual student",
            applicationStatus: e.application?.applicationStatus || "legacy/manual student",
          },
          generatedAt: new Date().toISOString(),
        },`
  );
}

// 5. Add dbEligibility variable inside row render
if (!text.includes("const dbEligibility = dbEligibilityChecks[checkKey];")) {
  text = text.replace(
`          const remedial = e.latestRemedial;`,
`          const remedial = e.latestRemedial;
          const checkKey = eligibilityCheckKey(student.id, e.programId, e.group?.id || null);
          const dbEligibility = dbEligibilityChecks[checkKey];`
  );
}

// 6. Add auto-check display block
if (!text.includes("Auto Eligibility Check")) {
  text = text.replace(
`              {cert && (
                <div style={certBox}>`,
`              {dbEligibility && (
                <div style={{
                  marginTop: 12,
                  padding: 14,
                  borderRadius: 14,
                  border: "1px solid " + (dbEligibility.eligible ? "#bbf7d0" : "#fecaca"),
                  background: dbEligibility.eligible ? "#f0fdf4" : "#fef2f2",
                  color: "#0f172a"
                }}>
                  <strong>Auto Eligibility Check: {dbEligibility.eligible ? "Eligible" : "Blocked"}</strong>
                  <div style={meta}>{dbEligibility.reason}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginTop:10}}>
                    <Info label="Required Courses" value={String(dbEligibility.required_course_count ?? 0)} />
                    <Info label="Passed" value={String(dbEligibility.passed_count ?? 0)} />
                    <Info label="Complete" value={String(dbEligibility.complete_count ?? 0)} />
                    <Info label="Missing" value={String(dbEligibility.missing_count ?? 0)} />
                    <Info label="Failed/Incomplete" value={String(dbEligibility.failed_count ?? 0)} />
                  </div>

                  {(dbEligibility.courses ?? []).length > 0 && (
                    <div style={{marginTop:10}}>
                      <strong>Course Check</strong>
                      <ul style={{margin:"8px 0 0",paddingLeft:18}}>
                        {(dbEligibility.courses ?? []).map((course: any) => (
                          <li key={course.course_id}>
                            {course.course_name}: {course.eligible_course ? "OK" : "Not complete"} 
                            {course.final_grade !== null && course.final_grade !== undefined ? " | " + course.final_grade + "%" : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {cert && (
                <div style={certBox}>`
  );
}

// 7. Add Check Eligibility button before Generate Certificate
if (!text.includes("Check Eligibility")) {
  text = text.replace(
`                {!cert && (
                  <Button onClick={() => generate(student)} disabled={busy || !e.eligible}>
                    Generate Certificate
                  </Button>
                )}`,
`                {!cert && (
                  <>
                    <Button onClick={() => checkDbEligibility(student)} disabled={busy || checkingEligibility === student.id}>
                      {checkingEligibility === student.id ? "Checking..." : "Check Eligibility"}
                    </Button>

                    <Button onClick={() => generate(student)} disabled={busy || !e.eligible || (dbEligibility && !dbEligibility.eligible)}>
                      Generate Certificate
                    </Button>
                  </>
                )}`
  );
}

fs.writeFileSync(path, text, "utf8");

console.log("Certificate auto eligibility check connected.");
