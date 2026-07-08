import { C, APP_NAME } from "../../lib/theme";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Layers,
  BarChart3,
  MessageCircle,
  LogOut,
} from "lucide-react";

const adminNav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "groups", label: "Groups", icon: Layers },
  { id: "reports", label: "Reports", icon: BarChart3 },
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
  children: React.ReactNode;
}) {
  return (
    <div style={{minHeight:"100vh",display:"flex",background:"#f8fafc"}}>
      <aside style={{width:240,background:C.sidebar,color:"#fff",display:"flex",flexDirection:"column"}}>
        <div style={{padding:22,borderBottom:"1px solid rgba(255,255,255,.08)"}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div style={{
              width:44,height:44,borderRadius:"50%",background:"#fff",
              color:C.primary,display:"flex",alignItems:"center",justifyContent:"center",
              fontWeight:900,fontSize:18
            }}>
              IA
            </div>
            <div>
              <div style={{fontWeight:900,letterSpacing:1}}>INTIZAR</div>
              <div style={{fontSize:10,letterSpacing:3,color:C.light}}>ACADEMY</div>
            </div>
          </div>

          <div style={{marginTop:18}}>
            <div style={{fontWeight:800,fontSize:14}}>{user?.name || "User"}</div>
            <div style={{fontSize:12,color:C.light,textTransform:"capitalize"}}>{user?.role}</div>
          </div>
        </div>

        <nav style={{padding:12,flex:1}}>
          {adminNav.map(item => {
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
                  padding:"11px 13px",
                  borderRadius:10,
                  border:"none",
                  marginBottom:4,
                  cursor:"pointer",
                  background:active ? "rgba(34,197,94,.18)" : "transparent",
                  color:active ? "#fff" : "rgba(220,252,231,.75)",
                  fontWeight:700,
                  textAlign:"left",
                }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{padding:14,borderTop:"1px solid rgba(255,255,255,.08)"}}>
          <button
            onClick={onLogout}
            style={{
              width:"100%",
              display:"flex",
              alignItems:"center",
              gap:10,
              padding:"10px 12px",
              borderRadius:10,
              border:"none",
              background:"rgba(255,255,255,.08)",
              color:"#fff",
              cursor:"pointer",
              fontWeight:700,
            }}
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>

      <main style={{flex:1}}>
        <header style={{
          height:64,
          background:"#fff",
          borderBottom:"1px solid "+C.border,
          display:"flex",
          alignItems:"center",
          justifyContent:"space-between",
          padding:"0 28px",
        }}>
          <div>
            <div style={{fontWeight:800,color:C.text}}>{APP_NAME}</div>
            <div style={{fontSize:12,color:C.muted}}>Admin Portal</div>
          </div>
          <div style={{fontWeight:700,color:C.text}}>
            {user?.name}
          </div>
        </header>

        <div style={{padding:28}}>
          {children}
        </div>
      </main>
    </div>
  );
}
