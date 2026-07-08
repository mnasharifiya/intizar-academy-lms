import { useEffect, useState } from "react";
import LoginPage from "./pages/auth/LoginPage";
import AppLayout from "./components/layout/AppLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import UsersPage from "./pages/admin/Users";
import CoursesPage from "./pages/admin/Courses";
import GroupsPage from "./pages/admin/Groups";
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
import { loadAllData } from "./lib/api";

function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [page, setPage] = useState("dashboard");
  const [data, setData] = useState<any>({
    users: [],
    levels: [],
    courses: [],
    levelCourses: [],
    groups: [],
    groupStudents: [],
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
    return <LoginPage onLogin={handleLogin} />;
  }

  function renderPage() {
    if (currentUser.role === "student") {
      if (page === "courses") {
        return <StudentLearning user={currentUser} data={data} />;
      }

      if (page === "assignments") {
        return <StudentAssignments user={currentUser} data={data} setData={setData} />;
      }

      if (page === "attendance") {
        return <StudentAttendance user={currentUser} data={data} />;
      }

      if (page === "grades") {
        return <StudentGrades user={currentUser} data={data} />;
      }

      return <StudentDashboard user={currentUser} data={data} />;
    }

    if (currentUser.role === "instructor") {
      if (page === "teaching") {
        return <InstructorTeaching user={currentUser} data={data} setData={setData} />;
      }

      if (page === "groups") {
        return <InstructorGroups user={currentUser} data={data} />;
      }

      if (page === "assignments") {
        return <InstructorAssignments user={currentUser} data={data} setData={setData} />;
      }

      if (page === "attendance") {
        return <InstructorAttendance user={currentUser} data={data} setData={setData} />;
      }

      if (page === "grades") {
        return <GradeManagement user={currentUser} data={data} setData={setData} />;
      }
    }

    if (page === "dashboard") {
      return <AdminDashboard data={data} />;
    }

    if (page === "users" && currentUser.role === "admin") {
      return <UsersPage data={data} setData={setData} />;
    }

    if (page === "courses") {
      return <CoursesPage data={data} setData={setData} />;
    }

    if (page === "groups") {
      return <GroupsPage data={data} setData={setData} />;
    }

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



