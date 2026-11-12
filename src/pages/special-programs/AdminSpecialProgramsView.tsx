import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { Button, Card, Input, PageHeader } from "../../components/common/ui";
import { C } from "../../lib/theme";
import { supabase } from "../../lib/supabase";
import {
  assignProgramLead,
  createProgramCourse,
  createSpecialProgram,
  deleteProgramCourse,
  deleteSpecialProgram,
  loadProgramAnalyticsBundle,
  loadSpecialProgramsOverviewList,
  manageProgramEnrollment,
  removeProgramLead,
  revokeProgramCertificate,
  setCoursePrerequisites,
  spIsoToWatInput,
  transitionSpecialProgramStatus,
  updateProgramCourse,
  updateSpecialProgram,
  type ProgramCertificate,
  type ProgramCourse,
  type ProgramEnrollment,
  type ProgramInstructorAssignment,
  type SpecialProgram,
  type SpecialProgramCourseStatus,
  type SpecialProgramEnrollmentMode,
  type SpecialProgramStatus,
} from "../../lib/specialProgramsApi";

const STATUS_TRANSITIONS: Record<SpecialProgramStatus, SpecialProgramStatus[]> = {
  draft: ["published", "archived"],
  published: ["enrollment_open", "active", "draft", "archived"],
  enrollment_open: ["enrollment_closed", "active", "archived"],
  enrollment_closed: ["enrollment_open", "active", "completed", "archived"],
  active: ["enrollment_open", "enrollment_closed", "completed", "archived"],
  completed: ["archived"],
  archived: ["draft"],
};

export default function AdminSpecialProgramsView({
  user: _user,
  data,
  isMainAdmin,
  leadProgramIds,
  onOpenCourseStudio,
}: {
  user: any;
  data: any;
  isMainAdmin: boolean;
  leadProgramIds: string[];
  onOpenCourseStudio?: (courseId: string) => void;
}) {
  const [programs, setPrograms] = useState<SpecialProgram[]>([]);
  const [courses, setCourses] = useState<ProgramCourse[]>([]);
  const [leads, setLeads] = useState<ProgramInstructorAssignment[]>([]);
  const [enrollments, setEnrollments] = useState<ProgramEnrollment[]>([]);
  const [certificates, setCertificates] = useState<ProgramCertificate[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<string>("");
  const [analytics, setAnalytics] = useState<any>(null);
  const [memberProfiles, setMemberProfiles] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<
    "programs" | "curriculum" | "enrollments" | "analytics" | "certificates"
  >("programs");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [showProgramForm, setShowProgramForm] = useState(false);
  const [editingProgramId, setEditingProgramId] = useState<string | null>(null);
  const [pTitle, setPTitle] = useState("");
  const [pCategory, setPCategory] = useState("leadership");
  const [pDescription, setPDescription] = useState("");
  const [pObjectives, setPObjectives] = useState("");
  const [pIsSelfPaced, setPIsSelfPaced] = useState(true);
  const [pEnrollmentMode, setPEnrollmentMode] =
    useState<SpecialProgramEnrollmentMode>("open_to_eligible");
  const [pEligibleLevels, setPEligibleLevels] = useState<string[]>([]);
  const [pMaxEnrollments, setPMaxEnrollments] = useState("");
  const [pEnrollOpens, setPEnrollOpens] = useState("");
  const [pEnrollCloses, setPEnrollCloses] = useState("");
  const [pStartsAt, setPStartsAt] = useState("");
  const [pEndsAt, setPEndsAt] = useState("");
  const [pCertEnabled, setPCertEnabled] = useState(true);
  const [pMinAvgScore, setPMinAvgScore] = useState("0");

  const [leadInstructorId, setLeadInstructorId] = useState("");
  const [leadRole, setLeadRole] = useState<"program_lead" | "co_lead">("program_lead");

  const [cTitle, setCTitle] = useState("");
  const [cDescription, setCDescription] = useState("");
  const [cInstructorId, setCInstructorId] = useState("");
  const [cOrder, setCOrder] = useState("1");
  const [cRequired, setCRequired] = useState(true);
  const [cDeadline, setCDeadline] = useState("");
  const [cPrereqIds, setCPrereqIds] = useState<string[]>([]);

  const [enrollStudentId, setEnrollStudentId] = useState("");

  const visiblePrograms = useMemo(() => {
    if (isMainAdmin) return programs;
    const leadSet = new Set(leadProgramIds);
    return programs.filter(p => leadSet.has(p.id));
  }, [programs, isMainAdmin, leadProgramIds]);

  const selectedProgram = useMemo(
    () => visiblePrograms.find(p => p.id === selectedProgramId) ?? visiblePrograms[0] ?? null,
    [visiblePrograms, selectedProgramId]
  );

  const allUsersMap = useMemo(() => {
    const map: Record<string, any> = { ...memberProfiles };
    (data?.users ?? []).forEach((u: any) => {
      map[u.id] = u;
    });
    return map;
  }, [data?.users, memberProfiles]);

  const instructorCandidates = useMemo(
    () =>
      (data?.users ?? []).filter(
        (u: any) => (u.role === "instructor" || u.role === "admin") && u.isActive !== false
      ),
    [data?.users]
  );

  const studentCandidates = useMemo(
    () => (data?.users ?? []).filter((u: any) => u.role === "student" && u.isActive !== false),
    [data?.users]
  );

  async function refreshOverview() {
    try {
      setLoading(true);
      const res = await loadSpecialProgramsOverviewList();
      setPrograms(res.programs);
      setCourses(res.courses);
      setLeads(res.leads);
      setEnrollments(res.enrollments);
      setCertificates(res.certificates);
      if (!selectedProgramId && res.programs.length > 0) {
        const firstAllowed = isMainAdmin
          ? res.programs[0]
          : res.programs.find(p => leadProgramIds.includes(p.id));
        if (firstAllowed) setSelectedProgramId(firstAllowed.id);
      }
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Could not load Special Programs.");
    } finally {
      setLoading(false);
    }
  }

  async function refreshSelectedDetails(programId: string) {
    try {
      const [bundle, profilesRes] = await Promise.all([
        loadProgramAnalyticsBundle(programId),
        (supabase as any).rpc("get_program_member_profiles", { p_program_id: programId }),
      ]);
      setAnalytics(bundle);
      if (!profilesRes.error && Array.isArray(profilesRes.data)) {
        const nextMap: Record<string, any> = {};
        profilesRes.data.forEach((p: any) => {
          nextMap[p.id] = p;
        });
        setMemberProfiles(nextMap);
      }
    } catch (err: any) {
      console.error(err);
    }
  }

  useEffect(() => {
    refreshOverview();
  }, []);

  useEffect(() => {
    if (selectedProgram?.id) {
      refreshSelectedDetails(selectedProgram.id);
    } else {
      setAnalytics(null);
    }
  }, [selectedProgram?.id]);

  function openCreateProgram() {
    setEditingProgramId(null);
    setPTitle("");
    setPCategory("leadership");
    setPDescription("");
    setPObjectives("");
    setPIsSelfPaced(true);
    setPEnrollmentMode("open_to_eligible");
    setPEligibleLevels([]);
    setPMaxEnrollments("");
    setPEnrollOpens("");
    setPEnrollCloses("");
    setPStartsAt("");
    setPEndsAt("");
    setPCertEnabled(true);
    setPMinAvgScore("0");
    setShowProgramForm(true);
  }

  function openEditProgram(prog: SpecialProgram) {
    setEditingProgramId(prog.id);
    setPTitle(prog.title);
    setPCategory(prog.category);
    setPDescription(prog.description ?? "");
    setPObjectives(prog.objectives.join("\n"));
    setPIsSelfPaced(prog.isSelfPaced);
    setPEnrollmentMode(prog.enrollmentMode);
    setPEligibleLevels(prog.eligibleLevelIds ?? []);
    setPMaxEnrollments(prog.maxEnrollments != null ? String(prog.maxEnrollments) : "");
    setPEnrollOpens(spIsoToWatInput(prog.enrollmentOpensAt));
    setPEnrollCloses(spIsoToWatInput(prog.enrollmentClosesAt));
    setPStartsAt(spIsoToWatInput(prog.startsAt));
    setPEndsAt(spIsoToWatInput(prog.endsAt));
    setPCertEnabled(prog.certificateEnabled);
    setPMinAvgScore(String(prog.completionRules?.min_average_score ?? 0));
    setShowProgramForm(true);
  }

  async function handleSaveProgram(e: React.FormEvent) {
    e.preventDefault();
    if (!pTitle.trim()) {
      alert("Program title is required.");
      return;
    }

    try {
      setBusy(true);
      const payload = {
        title: pTitle,
        category: pCategory,
        description: pDescription,
        objectives: pObjectives.split("\n").map(s => s.trim()).filter(Boolean),
        isSelfPaced: pIsSelfPaced,
        enrollmentMode: pEnrollmentMode,
        eligibleLevelIds: pEligibleLevels.length > 0 ? pEligibleLevels : null,
        maxEnrollments: pMaxEnrollments ? Number(pMaxEnrollments) : null,
        enrollmentOpensAt: pEnrollOpens || null,
        enrollmentClosesAt: pEnrollCloses || null,
        startsAt: pStartsAt || null,
        endsAt: pEndsAt || null,
        certificateEnabled: pCertEnabled,
        completionRules: {
          require_all_required_lessons: true,
          require_all_required_quizzes: true,
          min_average_score: Math.max(0, Math.min(100, Number(pMinAvgScore || 0))),
        },
      };

      if (editingProgramId) {
        await updateSpecialProgram(editingProgramId, payload);
      } else {
        const created = await createSpecialProgram(payload);
        setSelectedProgramId(created.id);
      }
      setShowProgramForm(false);
      await refreshOverview();
    } catch (err: any) {
      alert(err?.message || "Failed to save program.");
    } finally {
      setBusy(false);
    }
  }

  async function handleStatusTransition(programId: string, nextStatus: SpecialProgramStatus) {
    try {
      setBusy(true);
      await transitionSpecialProgramStatus(programId, nextStatus);
      await refreshOverview();
      await refreshSelectedDetails(programId);
    } catch (err: any) {
      alert(err?.message || "Could not update program status.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteProgram(prog: SpecialProgram) {
    if (!window.confirm(`Delete special program "${prog.title}"? This cannot be undone.`)) return;
    try {
      setBusy(true);
      await deleteSpecialProgram(prog.id);
      setSelectedProgramId("");
      await refreshOverview();
    } catch (err: any) {
      alert(err?.message || "Could not delete program.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAssignLead(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProgram || !leadInstructorId) return;
    try {
      setBusy(true);
      await assignProgramLead(selectedProgram.id, leadInstructorId, leadRole);
      setLeadInstructorId("");
      await refreshOverview();
      await refreshSelectedDetails(selectedProgram.id);
    } catch (err: any) {
      alert(err?.message || "Failed to assign Program Lead.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveLead(assignmentId: string) {
    if (!selectedProgram) return;
    try {
      setBusy(true);
      await removeProgramLead(assignmentId);
      await refreshOverview();
      await refreshSelectedDetails(selectedProgram.id);
    } catch (err: any) {
      alert(err?.message || "Failed to remove Program Lead.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProgram) return;
    if (!cTitle.trim() || !cInstructorId) {
      alert("Course title and assigned instructor are required.");
      return;
    }
    try {
      setBusy(true);
      const created = await createProgramCourse({
        programId: selectedProgram.id,
        title: cTitle,
        description: cDescription,
        instructorId: cInstructorId,
        displayOrder: Number(cOrder || 1),
        isRequired: cRequired,
        deadlineAt: cDeadline || null,
        status: "draft",
      });
      if (cPrereqIds.length > 0) {
        await setCoursePrerequisites(created.id, cPrereqIds);
      }
      setCTitle("");
      setCDescription("");
      setCInstructorId("");
      setCPrereqIds([]);
      setCDeadline("");
      await refreshOverview();
      await refreshSelectedDetails(selectedProgram.id);
    } catch (err: any) {
      alert(err?.message || "Could not create course.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCourseStatusChange(courseId: string, status: SpecialProgramCourseStatus) {
    if (!selectedProgram) return;
    try {
      setBusy(true);
      await updateProgramCourse(courseId, { status });
      await refreshOverview();
      await refreshSelectedDetails(selectedProgram.id);
    } catch (err: any) {
      alert(err?.message || "Could not update course status.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteCourse(course: ProgramCourse) {
    if (!selectedProgram) return;
    if (!window.confirm(`Delete course "${course.title}" and all its lessons/quizzes?`)) return;
    try {
      setBusy(true);
      await deleteProgramCourse(course.id);
      await refreshOverview();
      await refreshSelectedDetails(selectedProgram.id);
    } catch (err: any) {
      alert(err?.message || "Could not delete course.");
    } finally {
      setBusy(false);
    }
  }

  async function handleManualEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProgram || !enrollStudentId) return;
    try {
      setBusy(true);
      await manageProgramEnrollment(selectedProgram.id, "enroll", enrollStudentId);
      setEnrollStudentId("");
      await refreshOverview();
      await refreshSelectedDetails(selectedProgram.id);
    } catch (err: any) {
      alert(err?.message || "Could not enroll student.");
    } finally {
      setBusy(false);
    }
  }

  async function handleEnrollmentAction(
    studentId: string,
    action: "approve" | "suspend" | "reactivate" | "withdraw"
  ) {
    if (!selectedProgram) return;
    try {
      setBusy(true);
      await manageProgramEnrollment(selectedProgram.id, action, studentId);
      await refreshOverview();
      await refreshSelectedDetails(selectedProgram.id);
    } catch (err: any) {
      alert(err?.message || "Could not update enrollment.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRevokeCert(cert: ProgramCertificate) {
    const reason = window.prompt(
      `Enter revocation reason for ${cert.certificateNo} (${cert.studentName}):`
    );
    if (!reason || !reason.trim()) return;
    try {
      setBusy(true);
      await revokeProgramCertificate(cert.id, reason);
      await refreshOverview();
      if (selectedProgram) await refreshSelectedDetails(selectedProgram.id);
    } catch (err: any) {
      alert(err?.message || "Could not revoke certificate.");
    } finally {
      setBusy(false);
    }
  }

  const programCourses = useMemo(
    () =>
      selectedProgram
        ? courses
            .filter(c => c.programId === selectedProgram.id)
            .sort((a, b) => a.displayOrder - b.displayOrder)
        : [],
    [courses, selectedProgram]
  );

  const programLeads = useMemo(
    () => (selectedProgram ? leads.filter(l => l.programId === selectedProgram.id) : []),
    [leads, selectedProgram]
  );

  const programEnrollments = useMemo(
    () =>
      selectedProgram ? enrollments.filter(e => e.programId === selectedProgram.id) : [],
    [enrollments, selectedProgram]
  );

  const programCertificates = useMemo(
    () =>
      selectedProgram ? certificates.filter(c => c.programId === selectedProgram.id) : [],
    [certificates, selectedProgram]
  );

  if (loading) {
    return <Card>Loading Special Programs workspace...</Card>;
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PageHeader
        title="Special Programs Management"
        sub={
          isMainAdmin
            ? "Create structured self-paced programs, assign Program Leads and Course Instructors, manage enrollment, and track completion."
            : "Program Lead oversight for your assigned Special Programs."
        }
        action={
          isMainAdmin ? (
            <Button onClick={openCreateProgram}>+ New Special Program</Button>
          ) : undefined
        }
      />

      {showProgramForm && isMainAdmin && (
        <Card>
          <h2 style={{ margin: "0 0 14px", fontSize: 19, color: C.text }}>
            {editingProgramId ? "Edit Special Program" : "Create Special Program"}
          </h2>
          <form onSubmit={handleSaveProgram} style={{ display: "grid", gap: 14 }}>
            <div style={twoCol}>
              <div>
                <label style={labelStyle}>Program Title *</label>
                <Input
                  value={pTitle}
                  onChange={setPTitle}
                  placeholder="e.g. Executive Youth Leadership Fellowship"
                />
              </div>
              <div>
                <label style={labelStyle}>Category</label>
                <Input
                  value={pCategory}
                  onChange={setPCategory}
                  placeholder="e.g. leadership, cybersecurity, entrepreneurship"
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Program Description</label>
              <textarea
                value={pDescription}
                onChange={e => setPDescription(e.target.value)}
                rows={3}
                style={textareaStyle}
                placeholder="Overview, target cohort, and expected outcomes..."
              />
            </div>

            <div>
              <label style={labelStyle}>Learning Objectives (one per line)</label>
              <textarea
                value={pObjectives}
                onChange={e => setPObjectives(e.target.value)}
                rows={3}
                style={textareaStyle}
                placeholder={"Master foundational strategic planning\nComplete capstone assessment"}
              />
            </div>

            <div style={threeCol}>
              <div>
                <label style={labelStyle}>Enrollment Mode</label>
                <select
                  value={pEnrollmentMode}
                  onChange={e => setPEnrollmentMode(e.target.value as SpecialProgramEnrollmentMode)}
                  style={selectStyle}
                >
                  <option value="open_to_eligible">Open to Eligible Students</option>
                  <option value="approval_required">Approval Required</option>
                  <option value="admin_only">Main Admin Assignment Only</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Max Enrollments (blank = unlimited)</label>
                <Input
                  type="number"
                  value={pMaxEnrollments}
                  onChange={setPMaxEnrollments}
                  placeholder="e.g. 100"
                />
              </div>
              <div>
                <label style={labelStyle}>Minimum Average Quiz Score (%)</label>
                <Input
                  type="number"
                  value={pMinAvgScore}
                  onChange={setPMinAvgScore}
                  placeholder="0"
                />
              </div>
            </div>

            <div style={twoCol}>
              <div>
                <label style={labelStyle}>Enrollment Opens (WAT)</label>
                <Input type="datetime-local" value={pEnrollOpens} onChange={setPEnrollOpens} />
              </div>
              <div>
                <label style={labelStyle}>Enrollment Closes (WAT)</label>
                <Input type="datetime-local" value={pEnrollCloses} onChange={setPEnrollCloses} />
              </div>
            </div>

            <div style={twoCol}>
              <div>
                <label style={labelStyle}>Program Starts (WAT)</label>
                <Input type="datetime-local" value={pStartsAt} onChange={setPStartsAt} />
              </div>
              <div>
                <label style={labelStyle}>Program Ends (WAT)</label>
                <Input type="datetime-local" value={pEndsAt} onChange={setPEndsAt} />
              </div>
            </div>

            <div>
              <label style={labelStyle}>
                Eligible Academic Levels (leave unchecked to allow all levels)
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                {(data?.levels ?? []).map((lvl: any) => {
                  const checked = pEligibleLevels.includes(lvl.id);
                  return (
                    <label key={lvl.id} style={chipLabel}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setPEligibleLevels(prev =>
                            checked ? prev.filter(id => id !== lvl.id) : [...prev, lvl.id]
                          )
                        }
                      />
                      {lvl.name}
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
              <label style={chipLabel}>
                <input
                  type="checkbox"
                  checked={pIsSelfPaced}
                  onChange={e => setPIsSelfPaced(e.target.checked)}
                />
                Self-Paced Learning
              </label>
              <label style={chipLabel}>
                <input
                  type="checkbox"
                  checked={pCertEnabled}
                  onChange={e => setPCertEnabled(e.target.checked)}
                />
                Automatic Certificate on Completion
              </label>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <Button type="submit" disabled={busy}>
                {busy ? "Saving..." : editingProgramId ? "Update Program" : "Create Program"}
              </Button>
              <Button variant="secondary" onClick={() => setShowProgramForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {visiblePrograms.length === 0 ? (
        <Card>
          <p style={{ margin: 0, color: C.muted }}>
            No Special Programs found yet.
            {isMainAdmin ? ' Click "+ New Special Program" to create your first program.' : ""}
          </p>
        </Card>
      ) : (
        <>
          <Card>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: 260, flex: 1 }}>
                <label style={labelStyle}>Active Special Program</label>
                <select
                  value={selectedProgram?.id ?? ""}
                  onChange={e => setSelectedProgramId(e.target.value)}
                  style={selectStyle}
                >
                  {visiblePrograms.map(prog => (
                    <option key={prog.id} value={prog.id}>
                      {prog.title} [{prog.status.toUpperCase()}]
                    </option>
                  ))}
                </select>
              </div>

              {selectedProgram && isMainAdmin && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {STATUS_TRANSITIONS[selectedProgram.status].map(nextSt => (
                    <Button
                      key={nextSt}
                      variant="secondary"
                      disabled={busy}
                      onClick={() => handleStatusTransition(selectedProgram.id, nextSt)}
                    >
                      Set {nextSt.replace("_", " ")}
                    </Button>
                  ))}
                  <Button variant="secondary" onClick={() => openEditProgram(selectedProgram)}>
                    Edit Settings
                  </Button>
                  <Button
                    variant="danger"
                    disabled={busy}
                    onClick={() => handleDeleteProgram(selectedProgram)}
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>

            {selectedProgram && (
              <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <span style={badgeStyle}>Status: {selectedProgram.status}</span>
                <span style={badgeStyle}>Mode: {selectedProgram.enrollmentMode}</span>
                <span style={badgeStyle}>
                  {selectedProgram.isSelfPaced ? "Self-Paced" : "Scheduled"}
                </span>
                <span style={badgeStyle}>
                  Courses: {programCourses.length}
                </span>
                <span style={badgeStyle}>
                  Enrolled: {programEnrollments.length}
                  {selectedProgram.maxEnrollments ? ` / ${selectedProgram.maxEnrollments}` : ""}
                </span>
              </div>
            )}
          </Card>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {(
              [
                ["programs", "Leadership & Structure"],
                ["curriculum", "Program Courses"],
                ["enrollments", "Enrollments"],
                ["analytics", "Program Analytics"],
                ["certificates", "Certificates"],
              ] as const
            ).map(([tabKey, label]) => (
              <Button
                key={tabKey}
                variant={activeTab === tabKey ? "primary" : "secondary"}
                onClick={() => setActiveTab(tabKey)}
              >
                {label}
              </Button>
            ))}
          </div>

          {selectedProgram && activeTab === "programs" && (
            <Card>
              <h3 style={{ margin: "0 0 8px", color: C.text }}>Program Details & Program Leads</h3>
              <p style={{ margin: "0 0 16px", color: C.muted, lineHeight: 1.6 }}>
                {selectedProgram.description || "No description provided."}
              </p>

              {selectedProgram.objectives.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontWeight: 800, marginBottom: 6, color: C.text }}>Objectives</div>
                  <ul style={{ margin: 0, paddingLeft: 20, color: C.text }}>
                    {selectedProgram.objectives.map((obj, idx) => (
                      <li key={idx}>{obj}</li>
                    ))}
                  </ul>
                </div>
              )}

              <h4 style={{ margin: "0 0 10px", color: C.text }}>Assigned Program Leads</h4>
              {isMainAdmin && (
                <form
                  onSubmit={handleAssignLead}
                  style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}
                >
                  <select
                    value={leadInstructorId}
                    onChange={e => setLeadInstructorId(e.target.value)}
                    style={{ ...selectStyle, maxWidth: 320 }}
                  >
                    <option value="">Select Instructor / Staff...</option>
                    {instructorCandidates.map((u: any) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                  <select
                    value={leadRole}
                    onChange={e => setLeadRole(e.target.value as "program_lead" | "co_lead")}
                    style={{ ...selectStyle, maxWidth: 180 }}
                  >
                    <option value="program_lead">Program Lead</option>
                    <option value="co_lead">Co-Lead</option>
                  </select>
                  <Button type="submit" disabled={busy || !leadInstructorId}>
                    Assign Lead
                  </Button>
                </form>
              )}

              <div style={{ display: "grid", gap: 8 }}>
                {programLeads.length === 0 ? (
                  <div style={{ color: C.muted }}>No Program Leads assigned yet.</div>
                ) : (
                  programLeads.map(lead => {
                    const person = allUsersMap[lead.instructorId];
                    return (
                      <div key={lead.id} style={rowBox}>
                        <div>
                          <div style={{ fontWeight: 800, color: C.text }}>
                            {person?.name || lead.instructorId}
                          </div>
                          <div style={{ fontSize: 12, color: C.muted }}>
                            {person?.email || ""} • Role: {lead.role.replace("_", " ")}
                          </div>
                        </div>
                        {isMainAdmin && (
                          <Button
                            variant="danger"
                            disabled={busy}
                            onClick={() => handleRemoveLead(lead.id)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </Card>
          )}

          {selectedProgram && activeTab === "curriculum" && (
            <div style={{ display: "grid", gap: 16 }}>
              {isMainAdmin && (
                <Card>
                  <h3 style={{ margin: "0 0 12px", color: C.text }}>Add Course to Program</h3>
                  <form onSubmit={handleCreateCourse} style={{ display: "grid", gap: 12 }}>
                    <div style={twoCol}>
                      <div>
                        <label style={labelStyle}>Course Title *</label>
                        <Input
                          value={cTitle}
                          onChange={setCTitle}
                          placeholder="e.g. Module 1: Governance & Strategic Execution"
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Assigned Course Instructor *</label>
                        <select
                          value={cInstructorId}
                          onChange={e => setCInstructorId(e.target.value)}
                          style={selectStyle}
                        >
                          <option value="">Select Course Instructor...</option>
                          {instructorCandidates.map((u: any) => (
                            <option key={u.id} value={u.id}>
                              {u.name} ({u.email})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Course Description</label>
                      <Input
                        value={cDescription}
                        onChange={setCDescription}
                        placeholder="Brief course summary"
                      />
                    </div>

                    <div style={threeCol}>
                      <div>
                        <label style={labelStyle}>Sequence Order</label>
                        <Input type="number" value={cOrder} onChange={setCOrder} />
                      </div>
                      <div>
                        <label style={labelStyle}>Course Deadline (Optional, WAT)</label>
                        <Input type="datetime-local" value={cDeadline} onChange={setCDeadline} />
                      </div>
                      <div style={{ display: "flex", alignItems: "end" }}>
                        <label style={chipLabel}>
                          <input
                            type="checkbox"
                            checked={cRequired}
                            onChange={e => setCRequired(e.target.checked)}
                          />
                          Required for Completion
                        </label>
                      </div>
                    </div>

                    {programCourses.length > 0 && (
                      <div>
                        <label style={labelStyle}>Prerequisite Courses (Optional)</label>
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                          {programCourses.map(existing => {
                            const checked = cPrereqIds.includes(existing.id);
                            return (
                              <label key={existing.id} style={chipLabel}>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    setCPrereqIds(prev =>
                                      checked
                                        ? prev.filter(id => id !== existing.id)
                                        : [...prev, existing.id]
                                    )
                                  }
                                />
                                {existing.title}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div>
                      <Button type="submit" disabled={busy}>
                        {busy ? "Creating..." : "Create Program Course"}
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              <Card>
                <h3 style={{ margin: "0 0 12px", color: C.text }}>Program Courses</h3>
                {programCourses.length === 0 ? (
                  <div style={{ color: C.muted }}>No courses added to this program yet.</div>
                ) : (
                  <div style={{ display: "grid", gap: 10 }}>
                    {programCourses.map(course => {
                      const inst = allUsersMap[course.instructorId];
                      return (
                        <div key={course.id} style={rowBox}>
                          <div>
                            <div style={{ fontWeight: 800, color: C.text }}>
                              #{course.displayOrder} — {course.title}
                            </div>
                            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                              Instructor: {inst?.name || course.instructorId} • Status:{" "}
                              <strong>{course.status.toUpperCase()}</strong> •{" "}
                              {course.isRequired ? "Required" : "Elective"}
                            </div>
                          </div>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {onOpenCourseStudio && (
                              <Button
                                variant="secondary"
                                onClick={() => onOpenCourseStudio(course.id)}
                              >
                                Open Studio
                              </Button>
                            )}
                            {isMainAdmin && course.status !== "published" && (
                              <Button
                                variant="secondary"
                                disabled={busy}
                                onClick={() => handleCourseStatusChange(course.id, "published")}
                              >
                                Publish
                              </Button>
                            )}
                            {isMainAdmin && course.status === "published" && (
                              <Button
                                variant="secondary"
                                disabled={busy}
                                onClick={() => handleCourseStatusChange(course.id, "draft")}
                              >
                                Unpublish
                              </Button>
                            )}
                            {isMainAdmin && (
                              <Button
                                variant="danger"
                                disabled={busy}
                                onClick={() => handleDeleteCourse(course)}
                              >
                                Delete
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}

          {selectedProgram && activeTab === "enrollments" && (
            <Card>
              <h3 style={{ margin: "0 0 12px", color: C.text }}>Program Enrollments</h3>

              {isMainAdmin && (
                <form
                  onSubmit={handleManualEnroll}
                  style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}
                >
                  <select
                    value={enrollStudentId}
                    onChange={e => setEnrollStudentId(e.target.value)}
                    style={{ ...selectStyle, maxWidth: 360 }}
                  >
                    <option value="">Select Student to Enroll...</option>
                    {studentCandidates.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.regNo || s.email})
                      </option>
                    ))}
                  </select>
                  <Button type="submit" disabled={busy || !enrollStudentId}>
                    Enroll Student
                  </Button>
                </form>
              )}

              {programEnrollments.length === 0 ? (
                <div style={{ color: C.muted }}>No students enrolled in this program yet.</div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {programEnrollments.map(enr => {
                    const student = allUsersMap[enr.studentId];
                    return (
                      <div key={enr.id} style={rowBox}>
                        <div>
                          <div style={{ fontWeight: 800, color: C.text }}>
                            {student?.name || enr.studentId}
                          </div>
                          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                            Reg No: {student?.reg_no || student?.regNo || "-"} • Status:{" "}
                            <strong>{enr.status.toUpperCase()}</strong> • Progress:{" "}
                            <strong>{enr.progressPercent}%</strong>
                          </div>
                        </div>

                        {isMainAdmin && (
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {enr.status === "pending" && (
                              <Button
                                disabled={busy}
                                onClick={() => handleEnrollmentAction(enr.studentId, "approve")}
                              >
                                Approve
                              </Button>
                            )}
                            {enr.status === "active" && (
                              <Button
                                variant="danger"
                                disabled={busy}
                                onClick={() => handleEnrollmentAction(enr.studentId, "suspend")}
                              >
                                Suspend
                              </Button>
                            )}
                            {(enr.status === "suspended" || enr.status === "withdrawn") && (
                              <Button
                                variant="secondary"
                                disabled={busy}
                                onClick={() => handleEnrollmentAction(enr.studentId, "reactivate")}
                              >
                                Reactivate
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {selectedProgram && activeTab === "analytics" && (
            <div style={{ display: "grid", gap: 16 }}>
              <div style={statsGrid}>
                <MetricCard
                  label="Total Enrolled"
                  value={String(analytics?.metrics?.totalEnrolled ?? programEnrollments.length)}
                />
                <MetricCard
                  label="Active Learners"
                  value={String(analytics?.metrics?.activeCount ?? 0)}
                />
                <MetricCard
                  label="Inactive (>7 Days)"
                  value={String(analytics?.metrics?.inactiveCount ?? 0)}
                />
                <MetricCard
                  label="Completed"
                  value={String(analytics?.metrics?.completedCount ?? 0)}
                />
                <MetricCard
                  label="Avg Completion"
                  value={`${analytics?.metrics?.averageProgressPercent ?? 0}%`}
                />
                <MetricCard
                  label="Avg Quiz Score"
                  value={`${analytics?.metrics?.averageQuizScorePercent ?? 0}%`}
                />
                <MetricCard
                  label="Certificates Issued"
                  value={String(analytics?.metrics?.certificatesIssued ?? 0)}
                />
              </div>

              <Card>
                <h3 style={{ margin: "0 0 12px", color: C.text }}>Recent Program Activity</h3>
                {(analytics?.activityLogs ?? []).length === 0 ? (
                  <div style={{ color: C.muted }}>No activity events recorded yet.</div>
                ) : (
                  <div style={{ display: "grid", gap: 8 }}>
                    {(analytics.activityLogs as any[]).slice(0, 20).map((log: any) => {
                      const actor = allUsersMap[log.student_id];
                      return (
                        <div key={log.id} style={rowBox}>
                          <div>
                            <div style={{ fontWeight: 700, color: C.text }}>
                              {actor?.name || log.student_id} —{" "}
                              {String(log.event_type).replace(/_/g, " ")}
                            </div>
                            <div style={{ fontSize: 12, color: C.muted }}>
                              {new Date(log.created_at).toLocaleString()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          )}

          {selectedProgram && activeTab === "certificates" && (
            <Card>
              <h3 style={{ margin: "0 0 12px", color: C.text }}>
                Issued Special Program Certificates
              </h3>
              {programCertificates.length === 0 ? (
                <div style={{ color: C.muted }}>
                  No certificates have been issued for this program yet.
                </div>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {programCertificates.map(cert => (
                    <div key={cert.id} style={rowBox}>
                      <div>
                        <div style={{ fontWeight: 800, color: C.text }}>
                          {cert.studentName} ({cert.regNo || "No Reg No"})
                        </div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>
                          Cert No: <strong>{cert.certificateNo}</strong> • Token:{" "}
                          <strong>{cert.verificationToken}</strong> • Status:{" "}
                          <strong>{cert.status.toUpperCase()}</strong> • Issued:{" "}
                          {new Date(cert.issuedAt).toLocaleDateString()}
                        </div>
                      </div>
                      {isMainAdmin && cert.status === "valid" && (
                        <Button
                          variant="danger"
                          disabled={busy}
                          onClick={() => handleRevokeCert(cert)}
                        >
                          Revoke
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <div style={{ fontSize: 12, color: C.muted, fontWeight: 800 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, color: C.text, marginTop: 6 }}>{value}</div>
    </Card>
  );
}

const twoCol: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12,
};

const threeCol: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: 12,
};

const statsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
  gap: 12,
};

const labelStyle: CSSProperties = {
  display: "block",
  fontSize: 12,
  fontWeight: 800,
  color: C.text,
  marginBottom: 6,
};

const selectStyle: CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid " + C.border,
  borderRadius: 10,
  background: "#fff",
  color: C.text,
};

const textareaStyle: CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  border: "1px solid " + C.border,
  borderRadius: 10,
  fontFamily: "inherit",
};

const chipLabel: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 10px",
  border: "1px solid " + C.border,
  borderRadius: 10,
  background: "#f8fafc",
  fontSize: 13,
  fontWeight: 700,
};

const badgeStyle: CSSProperties = {
  padding: "5px 10px",
  borderRadius: 999,
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  color: "#166534",
  fontSize: 12,
  fontWeight: 800,
};

const rowBox: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
  padding: 14,
  border: "1px solid " + C.border,
  borderRadius: 12,
  background: "#f8fafc",
};