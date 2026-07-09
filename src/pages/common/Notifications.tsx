import { useEffect, useState, type CSSProperties } from "react";
import { Card, Button } from "../../components/common/ui";
import { C } from "../../lib/theme";
import {
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from "../../lib/api";

export default function NotificationsPage({
  user,
  data,
  setData,
}: {
  user: any;
  data: any;
  setData: any;
}) {
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");

  const notifications = (data?.notifications ?? [])
    .filter((n: any) => n.userId === user.id)
    .sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const unread = notifications.filter((n: any) => !n.isRead);
  const read = notifications.filter((n: any) => n.isRead);

  const visible =
    filter === "unread" ? unread : filter === "read" ? read : notifications;

  useEffect(() => {
    const channel = subscribeToNotifications(user.id, (notif: any) => {
      setData((d: any) => {
        if (d.notifications.some((n: any) => n.id === notif.id)) return d;
        return { ...d, notifications: [notif, ...d.notifications] };
      });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [user.id, setData]);

  async function markOne(id: string) {
    await markNotificationRead(id);

    setData((d: any) => ({
      ...d,
      notifications: d.notifications.map((n: any) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    }));
  }

  async function markAll() {
    await markAllNotificationsRead(user.id);

    setData((d: any) => ({
      ...d,
      notifications: d.notifications.map((n: any) =>
        n.userId === user.id ? { ...n, isRead: true } : n
      ),
    }));
  }

  return (
    <div>
      <div style={hero}>
        <div>
          <div style={eyebrow}>Notifications</div>
          <h1 style={heroTitle}>Activity Center</h1>
          <p style={heroSub}>
            Track assignments, submissions, grades, system updates, and important learning activity.
          </p>
        </div>

        <div style={summaryBox}>
          <div style={{fontSize:13,color:"rgba(255,255,255,.75)",fontWeight:800}}>
            Unread
          </div>
          <div style={{fontSize:42,fontWeight:900,lineHeight:1}}>
            {unread.length}
          </div>
        </div>
      </div>

      <div style={statsGrid}>
        <Stat label="All" value={String(notifications.length)} />
        <Stat label="Unread" value={String(unread.length)} danger={unread.length > 0} />
        <Stat label="Read" value={String(read.length)} />
      </div>

      <Card>
        <div style={toolbar}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <button style={tab(filter === "all")} onClick={() => setFilter("all")}>
              All
            </button>
            <button style={tab(filter === "unread")} onClick={() => setFilter("unread")}>
              Unread
            </button>
            <button style={tab(filter === "read")} onClick={() => setFilter("read")}>
              Read
            </button>
          </div>

          <Button onClick={markAll} disabled={unread.length === 0}>
            Mark All Read
          </Button>
        </div>

        {visible.length === 0 && (
          <div style={emptyState}>
            <strong>No notifications</strong>
            <p>New activity will appear here.</p>
          </div>
        )}

        <div style={{display:"grid",gap:12,marginTop:18}}>
          {visible.map((notif: any) => (
            <div key={notif.id} style={notificationCard(!notif.isRead)}>
              <div style={iconBox(notif.type)}>
                {iconFor(notif.type)}
              </div>

              <div style={{minWidth:0}}>
                <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                  <h3 style={titleStyle}>{notif.title}</h3>

                  {!notif.isRead && <span style={unreadBadge}>Unread</span>}
                </div>

                <p style={bodyStyle}>{notif.body || "No details provided."}</p>

                <div style={dateStyle}>{formatDate(notif.createdAt)}</div>
              </div>

              {!notif.isRead && (
                <button style={smallButton} onClick={() => markOne(notif.id)}>
                  Mark Read
                </button>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div style={statCard}>
      <div style={statLabel}>{label}</div>
      <div style={{...statValue,color:danger ? "#dc2626" : C.text}}>{value}</div>
    </div>
  );
}

function iconFor(type: string) {
  const t = String(type || "").toLowerCase();

  if (t.includes("grade")) return "★";
  if (t.includes("assignment")) return "✓";
  if (t.includes("chat")) return "💬";
  if (t.includes("lecture")) return "▶";
  if (t.includes("material")) return "📄";
  if (t.includes("attendance")) return "●";

  return "!";
}

function iconBox(type: string): CSSProperties {
  const t = String(type || "").toLowerCase();

  const bg =
    t.includes("grade") ? "#fef3c7" :
    t.includes("assignment") ? "#dcfce7" :
    t.includes("chat") ? "#e0f2fe" :
    t.includes("lecture") ? "#ede9fe" :
    t.includes("material") ? "#f1f5f9" :
    "#fee2e2";

  const color =
    t.includes("grade") ? "#92400e" :
    t.includes("assignment") ? "#166534" :
    t.includes("chat") ? "#075985" :
    t.includes("lecture") ? "#5b21b6" :
    t.includes("material") ? "#334155" :
    "#991b1b";

  return {
    width:44,
    height:44,
    borderRadius:14,
    background:bg,
    color,
    display:"flex",
    alignItems:"center",
    justifyContent:"center",
    fontWeight:900,
    flexShrink:0,
  };
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function tab(active: boolean): CSSProperties {
  return {
    border:"1px solid " + (active ? C.primary : "#e2e8f0"),
    background:active ? C.primary : "#fff",
    color:active ? "#fff" : C.text,
    borderRadius:999,
    padding:"9px 14px",
    fontWeight:900,
    cursor:"pointer",
  };
}

const hero: CSSProperties = {
  background:"linear-gradient(135deg,#052e16,#166534)",
  color:"#fff",
  borderRadius:24,
  padding:28,
  display:"flex",
  justifyContent:"space-between",
  gap:22,
  marginBottom:22,
  boxShadow:"0 18px 45px rgba(5,46,22,.22)",
};

const eyebrow: CSSProperties = {
  fontSize:12,
  fontWeight:900,
  textTransform:"uppercase",
  letterSpacing:1.8,
  color:"#bbf7d0",
  marginBottom:8,
};

const heroTitle: CSSProperties = {
  margin:0,
  fontSize:34,
  lineHeight:1.15,
  fontWeight:900,
};

const heroSub: CSSProperties = {
  margin:"10px 0 0",
  maxWidth:720,
  color:"rgba(255,255,255,.78)",
  fontSize:15,
  lineHeight:1.7,
};

const summaryBox: CSSProperties = {
  minWidth:170,
  background:"rgba(255,255,255,.1)",
  border:"1px solid rgba(255,255,255,.18)",
  borderRadius:18,
  padding:18,
  textAlign:"center",
};

const statsGrid: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",
  gap:16,
  marginBottom:20,
};

const statCard: CSSProperties = {
  background:"#fff",
  border:"1px solid #e2e8f0",
  borderRadius:18,
  padding:18,
  boxShadow:"0 6px 20px rgba(15,23,42,.04)",
};

const statLabel: CSSProperties = {
  color:C.muted,
  fontSize:13,
  fontWeight:900,
};

const statValue: CSSProperties = {
  fontSize:26,
  fontWeight:900,
  marginTop:5,
};

const toolbar: CSSProperties = {
  display:"flex",
  justifyContent:"space-between",
  alignItems:"center",
  gap:14,
  flexWrap:"wrap",
};

const emptyState: CSSProperties = {
  minHeight:160,
  display:"flex",
  flexDirection:"column",
  alignItems:"center",
  justifyContent:"center",
  textAlign:"center",
  color:C.muted,
  background:"#f8fafc",
  border:"1px dashed #cbd5e1",
  borderRadius:16,
  padding:20,
  marginTop:18,
};

const notificationCard = (unread: boolean): CSSProperties => ({
  display:"grid",
  gridTemplateColumns:"44px minmax(0,1fr) auto",
  gap:14,
  alignItems:"start",
  padding:16,
  border:"1px solid " + (unread ? "#86efac" : "#e2e8f0"),
  background:unread ? "#f0fdf4" : "#fff",
  borderRadius:18,
});

const titleStyle: CSSProperties = {
  margin:0,
  fontSize:16,
  color:C.text,
  fontWeight:900,
};

const bodyStyle: CSSProperties = {
  margin:"6px 0",
  color:C.muted,
  fontSize:14,
  lineHeight:1.6,
};

const dateStyle: CSSProperties = {
  color:C.muted,
  fontSize:12,
  fontWeight:800,
};

const unreadBadge: CSSProperties = {
  background:"#dcfce7",
  color:"#166534",
  borderRadius:999,
  padding:"4px 8px",
  fontSize:11,
  fontWeight:900,
};

const smallButton: CSSProperties = {
  border:"none",
  background:C.primary,
  color:"#fff",
  borderRadius:10,
  padding:"8px 11px",
  fontWeight:900,
  cursor:"pointer",
  whiteSpace:"nowrap",
};
