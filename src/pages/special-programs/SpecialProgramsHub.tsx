import { useEffect, useMemo, useState } from "react";
import { Button, Card, PageHeader } from "../../components/common/ui";
import { C } from "../../lib/theme";
import {
  loadSpecialProgramsOverviewList,
  type ProgramCourse,
  type ProgramInstructorAssignment,
} from "../../lib/specialProgramsApi";
import AdminSpecialProgramsView from "./AdminSpecialProgramsView";
import InstructorCourseStudio from "./InstructorCourseStudio";
import StudentSpecialProgramsView from "./StudentSpecialProgramsView";

export default function SpecialProgramsHub({
  user,
  data,
}: {
  user: any;
  data: any;
}) {
  const role = String(user?.role || "").toLowerCase();
  const isMainAdmin = Boolean(
    role === "admin" &&
      (user?.isMainAdmin || (data?.systemAdminIds ?? []).includes(user?.id))
  );

  const [loadingRoleMeta, setLoadingRoleMeta] = useState(role !== "student");
  const [courses, setCourses] = useState<ProgramCourse[]>([]);
  const [leads, setLeads] = useState<ProgramInstructorAssignment[]>([]);
  const [studioCourseId, setStudioCourseId] = useState<string | null>(null);
  const [instructorMode, setInstructorMode] = useState<"studio" | "lead">("studio");

  useEffect(() => {
    if (role === "student") return;
    let cancelled = false;

    async function loadMeta() {
      try {
        setLoadingRoleMeta(true);
        const res = await loadSpecialProgramsOverviewList();
        if (!cancelled) {
          setCourses(res.courses);
          setLeads(res.leads);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!cancelled) setLoadingRoleMeta(false);
      }
    }

    loadMeta();
    return () => {
      cancelled = true;
    };
  }, [role, user?.id]);

  const leadProgramIds = useMemo(
    () => leads.filter(l => l.instructorId === user?.id).map(l => l.programId),
    [leads, user?.id]
  );

  const managedCourses = useMemo(() => {
    if (isMainAdmin) return courses;
    const leadSet = new Set(leadProgramIds);
    return courses.filter(
      c => c.instructorId === user?.id || leadSet.has(c.programId)
    );
  }, [courses, isMainAdmin, leadProgramIds, user?.id]);

  if (role === "student") {
    return <StudentSpecialProgramsView user={user} data={data} />;
  }

  if (loadingRoleMeta) {
    return (
      <div style={{ display: "grid", gap: 20 }}>
        <PageHeader
          title="Special Programs"
          sub="Loading Special Programs workspace..."
        />
        <Card>Please wait while your Special Programs permissions are loaded...</Card>
      </div>
    );
  }

  if (role === "admin") {
    if (studioCourseId) {
      return (
        <InstructorCourseStudio
          user={user}
          data={data}
          availableCourses={managedCourses}
          initialCourseId={studioCourseId}
          onBack={() => setStudioCourseId(null)}
        />
      );
    }

    return (
      <AdminSpecialProgramsView
        user={user}
        data={data}
        isMainAdmin={isMainAdmin}
        leadProgramIds={leadProgramIds}
        onOpenCourseStudio={courseId => setStudioCourseId(courseId)}
      />
    );
  }

  if (role === "instructor") {
    const isProgramLead = leadProgramIds.length > 0;

    if (!isProgramLead && managedCourses.length === 0) {
      return (
        <div style={{ display: "grid", gap: 20 }}>
          <PageHeader
            title="Special Programs"
            sub="Instructor Course Studio & Program Lead Workspace"
          />
          <Card>
            <p style={{ margin: 0, color: C.muted }}>
              You have not been assigned to any Special Program courses or lead roles yet.
            </p>
          </Card>
        </div>
      );
    }

    if (isProgramLead && instructorMode === "lead") {
      if (studioCourseId) {
        return (
          <InstructorCourseStudio
            user={user}
            data={data}
            availableCourses={managedCourses}
            initialCourseId={studioCourseId}
            onBack={() => setStudioCourseId(null)}
          />
        );
      }

      return (
        <div style={{ display: "grid", gap: 14 }}>
          {managedCourses.length > 0 && (
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Button
                variant="secondary"
                onClick={() => setInstructorMode("studio")}
              >
                Switch to Course Content Studio
              </Button>
            </div>
          )}
          <AdminSpecialProgramsView
            user={user}
            data={data}
            isMainAdmin={false}
            leadProgramIds={leadProgramIds}
            onOpenCourseStudio={courseId => setStudioCourseId(courseId)}
          />
        </div>
      );
    }

    return (
      <div style={{ display: "grid", gap: 14 }}>
        {isProgramLead && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="secondary"
              onClick={() => setInstructorMode("lead")}
            >
              Switch to Program Lead Console
            </Button>
          </div>
        )}
        <InstructorCourseStudio
          user={user}
          data={data}
          availableCourses={managedCourses}
          initialCourseId={studioCourseId || managedCourses[0]?.id}
          onBack={isProgramLead ? () => setInstructorMode("lead") : undefined}
        />
      </div>
    );
  }

  return null;
}