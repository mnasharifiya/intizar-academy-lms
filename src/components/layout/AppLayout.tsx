import { type ReactNode } from "react";
import { C, APP_NAME } from "../../lib/theme";
import type { BreadcrumbItem } from "../../context/SubNavigationContext";
import {
  LayoutDashboard,
  Users,
  BookOpen,
  Layers,
  BarChart3,
  MessageCircle,
  Bell,
  LogOut,
  ClipboardList,
  CalendarCheck,
  Award,
  Settings,
  ArrowLeft,
} from "lucide-react";

const adminNav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "applications", label: "Applications", icon: ClipboardList },
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "special-programs", label: "Special Programs", icon: Award },
  { id: "groups", label: "Groups", icon: Layers },
  { id: "assessment", label: "Assessment Scheme", icon: Users },
  { id: "certificates", label: "Certificates", icon: Users },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "admin-cbt-exams", label: "CBT Results", icon: ClipboardList },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "chat", label: "Group Chat", icon: MessageCircle },
];

const instructorNav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "score-entry", label: "Score Entry", icon: Users },
  { id: "cbt-exams", label: "CBT Exams", icon: ClipboardList },
  { id: "teaching", label: "Teaching", icon: BookOpen },
  { id: "special-programs", label: "Special Programs", icon: Award },
  { id: "groups", label: "My Groups", icon: Layers },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "chat", label: "Group Chat", icon: MessageCircle },
];

const studentNav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "courses", label: "My Courses", icon: BookOpen },
  { id: "special-programs", label: "Special Programs", icon: Award },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
  { id: "grades", label: "Grades", icon: Award },
  { id: "student-cbt-exams", label: "CBT Exams", icon: ClipboardList },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "chat", label: "Group Chat", icon: MessageCircle },
];

export default function AppLayout({
  user,
  page,
  setPage,
  canGoBack = false,
  backLabel,
  breadcrumbs = [],
  onBack,
  onLogout,
  onChangePassword,
  children,
}: {
  user: any;
  page: string;
  setPage: (page: string) => void;
  canGoBack?: boolean;
  backLabel?: string;
  breadcrumbs?: BreadcrumbItem[];
  onBack?: () => void;
  onLogout: () => void;
  onChangePassword?: () => void;
  children: ReactNode;
}) {
  const role = String(user?.role || "").toLowerCase();

  const nav =
    role === "admin" ? adminNav :
    role === "instructor" ? instructorNav :
    studentNav;

  const portalName =
    role === "admin" ? "Admin Portal" :
    role === "instructor" ? "Instructor Portal" :
    "Student Portal";

  const currentNavLabel =
    nav.find((item) => item.id === page)?.label || page;

  return (
    <div style={{
      minHeight: "100vh",
      display: "grid",
      gridTemplateColumns: "280px minmax(0,1fr)",
      background: "#f8fafc",
    }}>
      <aside style={{
        background: "linear-gradient(180deg,#052e16,#064e3b)",
        color: "#fff",
        padding: 20,
        position: "sticky",
        top: 0,
        height: "100vh",
        overflowY: "auto",
      }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 28 }}>
          <img
            src="/intizar-logo.jpg"
            alt="INTIZAR Academy Logo"
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              objectFit: "contain",
              background: "#fff",
              padding: 5,
              flexShrink: 0,
            }}
          />

          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>{APP_NAME}</div>
            <div style={{ fontSize: 11, letterSpacing: 2.5, color: C.light }}>ACADEMY</div>
          </div>
        </div>

        <div style={{
          padding: "12px 14px",
          border: "1px solid rgba(255,255,255,.12)",
          background: "rgba(255,255,255,.08)",
          borderRadius: 16,
          marginBottom: 18,
        }}>
          <div style={{ fontWeight: 900 }}>{portalName}</div>
          <div style={{ fontSize: 12, color: C.light, textTransform: "capitalize", marginTop: 3 }}>
            {role}
          </div>
        </div>

        <nav style={{ display: "grid", gap: 8 }}>
          {nav.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                style={{
                  border: "none",
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "12px 14px",
                  borderRadius: 14,
                  cursor: "pointer",
                  color: "#fff",
                  fontWeight: 800,
                  textAlign: "left",
                  background: active ? "rgba(255,255,255,.18)" : "transparent",
                }}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main style={{ minWidth: 0 }}>
        <header style={{
          minHeight: 74,
          background: "#fff",
          borderBottom: "1px solid " + C.border,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "10px 26px",
          position: "sticky",
          top: 0,
          zIndex: 20,
          flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                disabled={!canGoBack}
                title={canGoBack ? (backLabel ? `Go back to ${backLabel}` : "Go back") : "At home screen"}
                style={{
                  border: "1px solid " + (canGoBack ? "#bbf7d0" : "#e2e8f0"),
                  background: canGoBack ? "#f0fdf4" : "#f8fafc",
                  color: canGoBack ? "#166534" : "#94a3b8",
                  borderRadius: 12,
                  padding: "9px 14px",
                  fontWeight: 900,
                  fontSize: 13,
                  cursor: canGoBack ? "pointer" : "default",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flexShrink: 0,
                }}
              >
                <ArrowLeft size={16} />
                <span>{canGoBack && backLabel ? `Back to ${backLabel}` : "Back"}</span>
              </button>
            )}

            <div>
              <div style={{ fontWeight: 900, color: C.text, fontSize: 18 }}>{APP_NAME}</div>
              <nav
                aria-label="Breadcrumb"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 12,
                  color: C.muted,
                  marginTop: 3,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => setPage("dashboard")}
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    color: page === "dashboard" ? C.muted : "#166534",
                    fontWeight: page === "dashboard" ? 600 : 800,
                    cursor: page === "dashboard" ? "default" : "pointer",
                    fontSize: 12,
                  }}
                >
                  {portalName}
                </button>

                {page !== "dashboard" && (
                  <>
                    <span style={{ color: "#94a3b8" }}>/</span>
                    {breadcrumbs.length > 0 ? (
                      breadcrumbs.map((crumb, idx) => {
                        const isLast = idx === breadcrumbs.length - 1;
                        return (
                          <span key={crumb.id} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                            {idx > 0 && <span style={{ color: "#94a3b8" }}>/</span>}
                            {crumb.onClick && !isLast ? (
                              <button
                                type="button"
                                onClick={crumb.onClick}
                                style={{
                                  border: "none",
                                  background: "transparent",
                                  padding: 0,
                                  color: "#166534",
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  fontSize: 12,
                                }}
                              >
                                {crumb.label}
                              </button>
                            ) : (
                              <span style={{ fontWeight: isLast ? 800 : 600, color: isLast ? C.text : C.muted }}>
                                {crumb.label}
                              </span>
                            )}
                          </span>
                        );
                      })
                    ) : (
                      <span style={{ fontWeight: 800, color: C.text }}>{currentNavLabel}</span>
                    )}
                  </>
                )}
              </nav>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 900, color: C.text, fontSize: 14 }}>{user?.name}</div>
              <div style={{ fontSize: 12, color: C.muted, textTransform: "capitalize" }}>{role}</div>
            </div>

            {onChangePassword && (
              <button
                onClick={onChangePassword}
                style={{
                  border: "1px solid #bbf7d0",
                  background: "#f0fdf4",
                  color: "#166534",
                  borderRadius: 12,
                  padding: "10px 12px",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Change Password
              </button>
            )}

            <button
              onClick={onLogout}
              style={{
                border: "1px solid #e2e8f0",
                background: "#fff",
                color: C.text,
                borderRadius: 12,
                padding: "10px 12px",
                fontWeight: 900,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <LogOut size={17} />
              Sign out
            </button>
          </div>
        </header>

        <div style={{ padding: 26 }}>
          {children}
        </div>
      </main>
    </div>
  );
}