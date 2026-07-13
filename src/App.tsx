import { useEffect, useMemo, useState } from "react";
import LoginPage from "./pages/auth/LoginPage";
import ApplicationForm from "./pages/public/ApplicationForm";
import AppLayout from "./components/layout/AppLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import UsersPage from "./pages/admin/Users";
import AdminApplications from "./pages/admin/Applications";
import CoursesPage from "./pages/admin/Courses";
import GroupsPage from "./pages/admin/Groups";
import AdminReports from "./pages/admin/Reports";
import GradeManagement from "./pages/admin/GradeManagement";
import StudentDashboard from "./pages/student/Dashboard";
import StudentGrades from "./pages/student/Grades";
import StudentLearning from "./pages/student/Learning";
import StudentAssignments from "./pages/student/Assignments";
import StudentAttendance from "./pages/student/Attendance";
import InstructorTeaching from "./pages/instructor/Teaching";
import InstructorGroups from "./pages/instructor/Groups";
import InstructorAssignments from "./pages/instructor/Assignments";
import InstructorAttendance from "./pages/instructor/Attendance";
import GroupChat from "./pages/common/GroupChat";
import NotificationsPage from "./pages/common/Notifications";
import { loadAllData } from "./lib/api";

function isApproved(value: any) {
  return !value || value === "approved";
}

function scopeData(user: any, data: any) {
  if (!user) return data;

  if (user.role === "student") {
    const approvedMemberships = (data.groupStudents ?? []).filter(
      (gs: any) => gs.studentId === user.id && isApproved(gs.status)
    );
    const groupIds = new Set(approvedMemberships.map((gs: any) => gs.groupId));
    const groups = (data.groups ?? []).filter((g: any) => groupIds.has(g.id));
    const levelIds = new Set(groups.map((g: any) => g.levelId));
    const lectures = (data.lectures ?? []).filter((l: any) => groupIds.has(l.groupId));
    const lectureIds = new Set(lectures.map((l: any) => l.id));
    const assignments = (data.assignments ?? []).filter((a: any) => groupIds.has(a.groupId));

    return {
      ...data,
      groups,
      groupStudents: approvedMemberships,
      levels: (data.levels ?? []).filter((l: any) => levelIds.has(l.id)),
      lectures,
      assignments,
      submissions: (data.submissions ?? []).filter((s: any) => s.studentId === user.id),
      attendance: (data.attendance ?? []).filter((a: any) => a.studentId === user.id || lectureIds.has(a.lectureId)),
      grades: (data.grades ?? []).filter((g: any) => g.studentId === user.id),
      chats: (data.chats ?? []).filter((c: any) => groupIds.has(c.groupId)),
      videos: (data.videos ?? []).filter((v: any) => groupIds.has(v.groupId)),
      learningMaterials: (data.learningMaterials ?? []).filter((m: any) => groupIds.has(m.groupId)),
      notifications: (data.notifications ?? []).filter((n: any) => n.userId === user.id),
    };
  }

  if (user.role === "instructor") {
    const groups = (data.groups ?? []).filter(
      (g: any) => g.instructorId === user.id && isApproved(g.instructorStatus)
    );
    const groupIds = new Set(groups.map((g: any) => g.id));
    const approvedGroupStudents = (data.groupStudents ?? []).filter(
      (gs: any) => groupIds.has(gs.groupId) && isApproved(gs.status)
    );
    const studentIds = new Set(approvedGroupStudents.map((gs: any) => gs.studentId));
    const lectures = (data.lectures ?? []).filter((l: any) => groupIds.has(l.groupId));
    const lectureIds = new Set(lectures.map((l: any) => l.id));
    const assignments = (data.assignments ?? []).filter((a: any) => groupIds.has(a.groupId));

    return {
      ...data,
      groups,
      groupStudents: approvedGroupStudents,
      users: (data.users ?? []).filter((u: any) => u.id === user.id || studentIds.has(u.id)),
      lectures,
      assignments,
      submissions: (data.submissions ?? []).filter((s: any) => new Set(assignments.map((a: any) => a.id)).has(s.assignmentId)),
      attendance: (data.attendance ?? []).filter((a: any) => lectureIds.has(a.lectureId) || studentIds.has(a.studentId)),
      grades: (data.grades ?? []).filter((g: any) => studentIds.has(g.studentId)),
      chats: (data.chats ?? []).filter((c: any) => groupIds.has(c.groupId)),
      videos: (data.videos ?? []).filter((v: any) => groupIds.has(v.groupId)),
      learningMaterials: (data.learningMaterials ?? []).filter((m: any) => groupIds.has(m.groupId)),
      notifications: (data.notifications ?? []).filter((n: any) => n.userId === user.id),
    };
  }

  if (user.role === "admin") {
    const myAdminGroups = (data.adminGroups ?? []).filter((ag: any) => ag.adminId === user.id);

    // Main Controller rule: no rows in admin_groups = all groups.
    if (myAdminGroups.length === 0) return data;

    const groupIds = new Set(myAdminGroups.map((ag: any) => ag.groupId));
    const groups = (data.groups ?? []).filter((g: any) => groupIds.has(g.id));
    const levelIds = new Set(groups.map((g: any) => g.levelId).filter(Boolean));
    const instructorIds = new Set(groups.map((g: any) => g.instructorId).filter(Boolean));

    const groupStudents = (data.groupStudents ?? []).filter((gs: any) => groupIds.has(gs.groupId));
    const studentIds = new Set(groupStudents.map((gs: any) => gs.studentId));

    const visibleUserIds = new Set([
      user.id,
      ...Array.from(instructorIds),
      ...Array.from(studentIds),
    ]);

    const levelCourses = (data.levelCourses ?? []).filter((lc: any) => levelIds.has(lc.levelId));
    const courseIds = new Set(levelCourses.map((lc: any) => lc.courseId));

    const lectures = (data.lectures ?? []).filter((l: any) => groupIds.has(l.groupId));
    const lectureIds = new Set(lectures.map((l: any) => l.id));

    const assignments = (data.assignments ?? []).filter((a: any) => groupIds.has(a.groupId));

    return {
      ...data,
      adminGroups: myAdminGroups,
      groups,
      groupStudents,
      levels: (data.levels ?? []).filter((l: any) => levelIds.has(l.id)),
      courses: (data.courses ?? []).filter((c: any) => courseIds.has(c.id)),
      levelCourses,
      users: (data.users ?? []).filter((u: any) => visibleUserIds.has(u.id)),
      lectures,
      assignments,
      submissions: (data.submissions ?? []).filter((s: any) => new Set(assignments.map((a: any) => a.id)).has(s.assignmentId)),
      attendance: (data.attendance ?? []).filter((a: any) => lectureIds.has(a.lectureId) || studentIds.has(a.studentId)),
      grades: (data.grades ?? []).filter((g: any) => studentIds.has(g.studentId)),
      chats: (data.chats ?? []).filter((c: any) => groupIds.has(c.groupId)),
      videos: (data.videos ?? []).filter((v: any) => groupIds.has(v.groupId)),
      learningMaterials: (data.learningMaterials ?? []).filter((m: any) => groupIds.has(m.groupId)),
      notifications: (data.notifications ?? []).filter((n: any) => n.userId === user.id),
    };
  }

  return data;
}

function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [page, setPage] = useState("dashboard");
  const [publicPage, setPublicPage] = useState<"login" | "apply">("login");
  const [data, setData] = useState<any>({
    users: [],
    levels: [],
    courses: [],
    levelCourses: [],
    groups: [],
    groupStudents: [],
    adminGroups: [],
    lectures: [],
    assignments: [],
    submissions: [],
    grades: [],
    attendance: [],
    chats: [],
    notifications: [],
    videos: [],
    learningMaterials: [],
  });

  const scopedData = useMemo(() => scopeData(currentUser, data), [currentUser, data]);

  async function refreshData() {
    const fresh = await loadAllData();
    setData(fresh);
  }

  async function handleLogin(user: any) {
    setCurrentUser(user);
    setPage("dashboard");
    await refreshData();
  }

  useEffect(() => {
    if (currentUser) refreshData();
  }, [currentUser]);

  if (!currentUser) {
    if (publicPage === "apply") {
      return <ApplicationForm onBackToLogin={() => setPublicPage("login")} />;
    }

    return <LoginPage onLogin={handleLogin} onApply={() => setPublicPage("apply")} />;
  }

  function renderPage() {
    if (currentUser.role === "student") {
      if (page === "courses") return <StudentLearning user={currentUser} data={scopedData} />;
      if (page === "assignments") return <StudentAssignments user={currentUser} data={scopedData} setData={setData} />;
      if (page === "attendance") return <StudentAttendance user={currentUser} data={scopedData} />;
      if (page === "grades") return <StudentGrades user={currentUser} data={scopedData} />;
      if (page === "notifications") return <NotificationsPage user={currentUser} data={scopedData} setData={setData} />;
      if (page === "chat") return <GroupChat user={currentUser} data={scopedData} setData={setData} />;
      return <StudentDashboard user={currentUser} data={scopedData} />;
    }

    if (currentUser.role === "instructor") {
      if (page === "teaching") return <InstructorTeaching user={currentUser} data={scopedData} setData={setData} />;
      if (page === "groups") return <InstructorGroups user={currentUser} data={scopedData} />;
      if (page === "assignments") return <InstructorAssignments user={currentUser} data={scopedData} setData={setData} />;
      if (page === "attendance") return <InstructorAttendance user={currentUser} data={scopedData} setData={setData} />;
      if (page === "grades") return <GradeManagement user={currentUser} data={scopedData} setData={setData} />;
      if (page === "notifications") return <NotificationsPage user={currentUser} data={scopedData} setData={setData} />;
      if (page === "chat") return <GroupChat user={currentUser} data={scopedData} setData={setData} />;
      return <InstructorGroups user={currentUser} data={scopedData} />;
    }

    if (page === "dashboard") return <AdminDashboard data={scopedData} />;
    if (page === "applications") return <AdminApplications user={currentUser} data={scopedData} />;
    if (page === "users") return <UsersPage user={currentUser} data={scopedData} setData={setData} />;
    if (page === "courses") return <CoursesPage data={scopedData} setData={setData} />;
    if (page === "groups") return <GroupsPage user={currentUser} data={scopedData} setData={setData} />;
    if (page === "reports") return <AdminReports user={currentUser} data={scopedData} />;
    if (page === "notifications") return <NotificationsPage user={currentUser} data={scopedData} setData={setData} />;
    if (page === "chat") return <GroupChat user={currentUser} data={scopedData} setData={setData} />;

    return <h1>{page}</h1>;
  }

  return (
    <AppLayout
      user={currentUser}
      page={page}
      setPage={setPage}
      onLogout={() => setCurrentUser(null)}
    >
      {renderPage()}
    </AppLayout>
  );
}

export default App;






