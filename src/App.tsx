import { useEffect, useState } from "react";
import LoginPage from "./pages/auth/LoginPage";
import AppLayout from "./components/layout/AppLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import UsersPage from "./pages/admin/Users";
import CoursesPage from "./pages/admin/Courses";
import GroupsPage from "./pages/admin/Groups";
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
      {page === "dashboard" && <AdminDashboard data={data} />}
      {page === "users" && <UsersPage data={data} setData={setData} />}
      {page === "courses" && <CoursesPage data={data} setData={setData} />}
      {page === "groups" && <GroupsPage data={data} setData={setData} />}
      {page !== "dashboard" && page !== "users" && page !== "courses" && page !== "groups" && <h1>{page}</h1>}
    </AppLayout>
  );
}

export default App;



