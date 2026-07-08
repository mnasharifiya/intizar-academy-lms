import { type ReactNode } from "react";
import { C, APP_NAME } from "../../lib/theme";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Layers,
  BarChart3,
  MessageCircle,
  LogOut,
  ClipboardList,
  CalendarCheck,
  Award,
} from "lucide-react";

const adminNav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "groups", label: "Groups", icon: Layers },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "chat", label: "Group Chat", icon: MessageCircle },
];

const instructorNav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "groups", label: "My Groups", icon: Layers },
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
  { id: "grades", label: "Grades", icon: Award },
  { id: "chat", label: "Group Chat", icon: MessageCircle },
];

const studentNav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "courses", label: "My Courses", icon: BookOpen },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
  { id: "grades", label: "Grades", icon: Award },
  { id: "chat", label: "Group Chat", icon: MessageCircle },
];

export default function AppLayout({
  user,
  page,
  setPage,
  onLogout,
  children,
}: {
  user: any;
  page: string;
  setPage: (p: string) => void;
  onLogout: () => void;
  children: ReactNode;
}) {
  const role = String(user?.role || "student").toLowerCase();

  const nav =
    role === "admin"
      ? adminNav
      : role === "instructor"
      ? instructorNav
      : studentNav;

  const portalName =
    role === "admin"
      ? "Admin Portal"
      : role === "instructor"
      ? "Instructor Portal"
      : "Student Portal";

  return (
    <div style={{minHeight:"100vh",display:"flex",background:"#f8fafc"}}>
      <aside style={{
        width:260,
        background:"linear-gradient(180deg,#052e16,#063b1c)",
        color:"#fff",
        display:"flex",
        flexDirection:"column",
        boxShadow:"8px 0 30px rgba(15,23,42,.08)",
      }}>
        <div style={{padding:24,borderBottom:"1px solid rgba(255,255,255,.08)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{
              width:46,
              height:46,
              borderRadius:"50%",
              background:"#fff",
              color:C.primary,
              display:"flex",
              alignItems:"center",
              justifyContent:"center",
              fontWeight:900,
              fontSize:18,
              boxShadow:"0 10px 25px rgba(0,0,0,.15)",
            }}>
              IA
            </div>

            <div>
              <div style={{fontWeight:900,letterSpacing:.5,fontSize:18}}>INTIZAR</div>
              <div style={{fontSize:10,letterSpacing:3,color:C.light}}>ACADEMY</div>
            </div>
          </div>

          <div style={{
            marginTop:22,
            padding:14,
            borderRadius:16,
            background:"rgba(255,255,255,.08)",
            border:"1px solid rgba(255,255,255,.10)",
          }}>
            <div style={{fontWeight:900,fontSize:14}}>{user?.name || "User"}</div>
            <div style={{fontSize:12,color:C.light,textTransform:"capitalize",marginTop:3}}>
              {role}
            </div>
          </div>
        </div>

        <nav style={{padding:14,flex:1}}>
          {nav.map(item => {
            const Icon = item.icon;
            const active = page === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                style={{
                  width:"100%",
                  display:"flex",
                  alignItems:"center",
                  gap:12,
                  padding:"12px 14px",
                  borderRadius:13,
                  border:"none",
                  marginBottom:6,
                  cursor:"pointer",
                  background:active ? "rgba(34,197,94,.22)" : "transparent",
                  color:active ? "#fff" : "rgba(220,252,231,.78)",
                  fontWeight:800,
                  textAlign:"left",
                }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{padding:16,borderTop:"1px solid rgba(255,255,255,.08)"}}>
          <button
            onClick={onLogout}
            style={{
              width:"100%",
              display:"flex",
              alignItems:"center",
              gap:10,
              padding:"12px 14px",
              borderRadius:13,
              border:"none",
              background:"rgba(255,255,255,.09)",
              color:"#fff",
              cursor:"pointer",
              fontWeight:800,
            }}
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      <main style={{flex:1,minWidth:0}}>
        <header style={{
          height:72,
          background:"#fff",
          borderBottom:"1px solid "+C.border,
          display:"flex",
          alignItems:"center",
          justifyContent:"space-between",
          padding:"0 32px",
          position:"sticky",
          top:0,
          zIndex:10,
        }}>
          <div>
            <div style={{fontWeight:900,color:C.text,fontSize:18}}>{APP_NAME}</div>
            <div style={{fontSize:12,color:C.muted,marginTop:3}}>{portalName}</div>
          </div>

          <div style={{
            display:"flex",
            alignItems:"center",
            gap:10,
            fontWeight:800,
            color:C.text,
          }}>
            {user?.name}
          </div>
        </header>

        <div style={{padding:32}}>
          {children}
        </div>
      </main>
    </div>
  );
}

