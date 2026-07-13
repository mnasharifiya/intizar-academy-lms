import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { PageHeader, Card, Button, Input } from "../../components/common/ui";
import { C } from "../../lib/theme";
import {
  componentTotal,
  defaultSchemeForCourse,
  loadAssessmentSchemes,
  saveAssessmentScheme,
  type AssessmentComponent,
  type AssessmentScheme,
} from "../../lib/assessmentApi";

export default function AdminAssessmentScheme({
  user,
  data,
}: {
  user: any;
  data: any;
}) {
  const courses = data?.courses ?? [];
  const adminGroups = data?.adminGroups ?? [];

  const isMainController =
    user?.role === "admin" &&
    adminGroups.filter((ag: any) => ag.adminId === user.id).length === 0;

  const [schemes, setSchemes] = useState<AssessmentScheme[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [durationMonths, setDurationMonths] = useState(3);
  const [passMark, setPassMark] = useState(70);
  const [attendanceRequired, setAttendanceRequired] = useState(70);
  const [components, setComponents] = useState<AssessmentComponent[]>([]);
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const list = await loadAssessmentSchemes();
    setSchemes(list);

    if (!selectedCourseId && courses.length > 0) {
      loadCourse(courses[0].id, list);
    }
  }

  useEffect(() => {
    refresh().catch(err => alert(err?.message || "Could not load assessment schemes."));
  }, []);

  const selectedCourse = useMemo(() => {
    return courses.find((c: any) => c.id === selectedCourseId) || null;
  }, [courses, selectedCourseId]);

  const total = componentTotal(components);
  const validTotal = total === 100;

  function schemeFor(courseId: string, list = schemes) {
    return list.find(s => s.courseId === courseId) || null;
  }

  function loadCourse(courseId: string, list = schemes) {
    const scheme = schemeFor(courseId, list);

    setSelectedCourseId(courseId);

    if (scheme) {
      setDurationMonths(scheme.durationMonths);
      setPassMark(scheme.passMark);
      setAttendanceRequired(scheme.attendanceRequired);
      setComponents(scheme.components.map(c => ({ ...c })));
    } else {
      const def = defaultSchemeForCourse(courseId);
      setDurationMonths(def.durationMonths);
      setPassMark(def.passMark);
      setAttendanceRequired(def.attendanceRequired);
      setComponents(def.components.map(c => ({ ...c })));
    }
  }

  function updateComponent(index: number, patch: Partial<AssessmentComponent>) {
    setComponents(prev =>
      prev.map((component, i) =>
        i === index ? { ...component, ...patch } : component
      )
    );
  }

  function resetDefault() {
    if (!selectedCourseId) return;

    const def = defaultSchemeForCourse(selectedCourseId);
    setDurationMonths(def.durationMonths);
    setPassMark(def.passMark);
    setAttendanceRequired(def.attendanceRequired);
    setComponents(def.components.map(c => ({ ...c })));
  }

  async function save() {
    if (!isMainController) {
      alert("Only Main Controller can change assessment schemes.");
      return;
    }

    if (!selectedCourseId) {
      alert("Select a course first.");
      return;
    }

    if (!validTotal) {
      alert(`Total weight must be 100%. Current total is ${total}%.`);
      return;
    }

    try {
      setBusy(true);

      await saveAssessmentScheme({
        courseId: selectedCourseId,
        durationMonths,
        passMark,
        attendanceRequired,
        components,
        userId: user.id,
      });

      await refresh();
      alert("Assessment scheme saved.");
    } catch (err: any) {
      alert(err?.message || "Could not save assessment scheme.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Assessment Scheme"
        sub="Set the official 3-month course grading structure and weights."
      />

      {!isMainController && (
        <Card>
          <div style={warningBox}>
            Restricted admins can view assessment schemes, but only Main Controller can edit them.
          </div>
        </Card>
      )}

      <div style={layout}>
        <Card>
          <h2 style={sectionTitle}>Courses</h2>
          <p style={sectionSub}>Select a course to view or edit its assessment structure.</p>

          <div style={{display:"grid",gap:10,marginTop:16}}>
            {courses.map((course: any) => {
              const hasScheme = !!schemeFor(course.id);
              const active = course.id === selectedCourseId;

              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => loadCourse(course.id)}
                  style={{
                    ...courseButton,
                    borderColor: active ? C.primary : C.border,
                    background: active ? "#f0fdf4" : "#fff",
                  }}
                >
                  <div style={{fontWeight:900,color:C.text}}>{course.name}</div>
                  <div style={{fontSize:12,color:hasScheme ? "#166534" : C.muted,marginTop:4}}>
                    {hasScheme ? "Scheme configured" : "Using default scheme"}
                  </div>
                </button>
              );
            })}

            {courses.length === 0 && (
              <div style={emptyState}>No courses found. Create courses first.</div>
            )}
          </div>
        </Card>

        <Card>
          <div style={topRow}>
            <div>
              <h2 style={sectionTitle}>{selectedCourse?.name || "Select Course"}</h2>
              <p style={sectionSub}>
                The total component weight must be exactly 100%.
              </p>
            </div>

            <div style={{
              ...totalBadge,
              background: validTotal ? "#dcfce7" : "#fee2e2",
              color: validTotal ? "#166534" : "#991b1b",
            }}>
              Total: {total}%
            </div>
          </div>

          {selectedCourse && (
            <>
              <div style={settingsGrid}>
                <div style={field}>
                  <label style={label}>Duration Months</label>
                  <Input
                    type="number"
                    value={String(durationMonths)}
                    onChange={v => setDurationMonths(Number(v || 0))}
                    placeholder="3"
                  />
                </div>

                <div style={field}>
                  <label style={label}>Pass Mark %</label>
                  <Input
                    type="number"
                    value={String(passMark)}
                    onChange={v => setPassMark(Number(v || 0))}
                    placeholder="70"
                  />
                </div>

                <div style={field}>
                  <label style={label}>Attendance Required %</label>
                  <Input
                    type="number"
                    value={String(attendanceRequired)}
                    onChange={v => setAttendanceRequired(Number(v || 0))}
                    placeholder="70"
                  />
                </div>
              </div>

              <div style={{overflowX:"auto",marginTop:18}}>
                <table style={{width:"100%",borderCollapse:"collapse"}}>
                  <thead>
                    <tr style={{background:"#f8fafc",textAlign:"left"}}>
                      <th style={th}>Component</th>
                      <th style={th}>Required Count</th>
                      <th style={th}>Weight %</th>
                    </tr>
                  </thead>

                  <tbody>
                    {components.map((component, index) => (
                      <tr key={component.componentType} style={{borderBottom:"1px solid #e2e8f0"}}>
                        <td style={td}>
                          <div style={{fontWeight:900,color:C.text}}>{component.label}</div>
                          <div style={{fontSize:12,color:C.muted}}>{component.componentType}</div>
                        </td>

                        <td style={td}>
                          <Input
                            type="number"
                            value={String(component.requiredCount)}
                            onChange={v => updateComponent(index, { requiredCount: Number(v || 0) })}
                            placeholder="Required count"
                          />
                        </td>

                        <td style={td}>
                          <Input
                            type="number"
                            value={String(component.weight)}
                            onChange={v => updateComponent(index, { weight: Number(v || 0) })}
                            placeholder="Weight"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!validTotal && (
                <div style={warningBox}>
                  Total weight is {total}%. It must be exactly 100% before saving.
                </div>
              )}

              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:18}}>
                <Button onClick={save} disabled={busy || !validTotal || !isMainController}>
                  Save Scheme
                </Button>

                <Button variant="secondary" onClick={resetDefault} disabled={busy || !isMainController}>
                  Reset Default
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

const layout: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"320px 1fr",
  gap:18,
  alignItems:"start",
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

const courseButton: CSSProperties = {
  width:"100%",
  textAlign:"left",
  border:"1px solid",
  borderRadius:14,
  padding:14,
  cursor:"pointer",
};

const topRow: CSSProperties = {
  display:"flex",
  justifyContent:"space-between",
  gap:14,
  alignItems:"start",
  flexWrap:"wrap",
};

const totalBadge: CSSProperties = {
  padding:"10px 14px",
  borderRadius:999,
  fontWeight:900,
  fontSize:14,
};

const settingsGrid: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
  gap:12,
  marginTop:18,
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
};

const warningBox: CSSProperties = {
  border:"1px solid #fed7aa",
  background:"#fff7ed",
  color:"#9a3412",
  padding:14,
  borderRadius:14,
  marginTop:16,
  fontSize:14,
  lineHeight:1.6,
};

const emptyState: CSSProperties = {
  border:"1px dashed #cbd5e1",
  borderRadius:14,
  padding:18,
  color:C.muted,
  textAlign:"center",
};
