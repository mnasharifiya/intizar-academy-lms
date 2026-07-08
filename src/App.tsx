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

  return (
    <AppLayout
      user={currentUser}
      page={page}
      setPage={setPage}
      onLogout={() => setCurrentUser(null)}
    >
      {currentUser.role === "student" && page === "dashboard" && (
        <StudentDashboard user={currentUser} data={data} />
      )}

      {currentUser.role === "student" && page === "grades" && (
        <StudentGrades user={currentUser} data={data} />
      )}

      {currentUser.role === "student" &&
        page !== "dashboard" &&
        page !== "grades" && (
          <StudentDashboard user={currentUser} data={data} />
        )}

      {currentUser.role !== "student" && page === "dashboard" && (
        <AdminDashboard data={data} />
      )}

      {currentUser.role !== "student" && page === "users" && (
        <UsersPage data={data} setData={setData} />
      )}

      {currentUser.role !== "student" && page === "courses" && (
        <CoursesPage data={data} setData={setData} />
      )}

      {currentUser.role !== "student" && page === "groups" && (
        <GroupsPage data={data} setData={setData} />
      )}

      {currentUser.role !== "student" && page === "grades" && (
        <GradeManagement user={currentUser} data={data} setData={setData} />
      )}

      {currentUser.role !== "student" &&
        page !== "dashboard" &&
        page !== "users" &&
        page !== "courses" &&
        page !== "groups" &&
        page !== "grades" && <h1>{page}</h1>}
    </AppLayout>
  );
}

export default App;


