import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Card, Button } from "../../components/common/ui";
import { C } from "../../lib/theme";
import { sendChat, subscribeToChats } from "../../lib/api";

export default function GroupChat({
  user,
  data,
  setData,
}: {
  user: any;
  data: any;
  setData: any;
}) {
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const groups = data?.groups ?? [];
  const users = data?.users ?? [];
  const groupStudents = data?.groupStudents ?? [];
  const chats = data?.chats ?? [];

  const role = String(user?.role || "").toLowerCase();

  const visibleGroups = useMemo(() => {
    if (role === "admin") return groups;

    if (role === "instructor") {
      return groups.filter((g: any) => g.instructorId === user.id);
    }

    const membership = groupStudents.find((gs: any) => gs.studentId === user.id);
    if (!membership) return [];

    return groups.filter((g: any) => g.id === membership.groupId);
  }, [role, groups, groupStudents, user.id]);

  useEffect(() => {
    if (!selectedGroupId && visibleGroups.length > 0) {
      setSelectedGroupId(visibleGroups[0].id);
    }

    if (
      selectedGroupId &&
      visibleGroups.length > 0 &&
      !visibleGroups.some((g: any) => g.id === selectedGroupId)
    ) {
      setSelectedGroupId(visibleGroups[0].id);
    }
  }, [visibleGroups, selectedGroupId]);

  useEffect(() => {
    if (!selectedGroupId) return;

    const channel = subscribeToChats(selectedGroupId, (chat: any) => {
      setData((d: any) => {
        if (d.chats.some((c: any) => c.id === chat.id)) return d;
        return { ...d, chats: [...d.chats, chat] };
      });
    });

    return () => {
      channel.unsubscribe();
    };
  }, [selectedGroupId, setData]);

  const selectedGroup = groups.find((g: any) => g.id === selectedGroupId);

  const messages = chats
    .filter((c: any) => c.groupId === selectedGroupId)
    .sort(
      (a: any, b: any) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function sender(id: string) {
    return users.find((u: any) => u.id === id);
  }

  function groupMembers(groupId: string) {
    const group = groups.find((g: any) => g.id === groupId);
    const instructor = users.find((u: any) => u.id === group?.instructorId);

    const students = groupStudents
      .filter((gs: any) => gs.groupId === groupId)
      .map((gs: any) => users.find((u: any) => u.id === gs.studentId))
      .filter(Boolean);

    return [instructor, ...students].filter(Boolean);
  }

  async function submitMessage() {
    const text = message.trim();

    if (!selectedGroupId || !text) return;

    setSending(true);

    try {
      const chat = await sendChat(selectedGroupId, user.id, text);

      setData((d: any) => {
        if (d.chats.some((c: any) => c.id === chat.id)) return d;
        return { ...d, chats: [...d.chats, chat] };
      });

      setMessage("");
    } catch (err: any) {
      alert(err?.message || "Could not send message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div style={hero}>
        <div>
          <div style={eyebrow}>Group Chat</div>
          <h1 style={heroTitle}>Learning Discussion</h1>
          <p style={heroSub}>
            Communicate with your group, instructor, students, and administrators.
          </p>
        </div>

        <div style={summaryBox}>
          <div style={{fontSize:13,color:"rgba(255,255,255,.75)",fontWeight:800}}>
            Groups
          </div>
          <div style={{fontSize:42,fontWeight:900,lineHeight:1}}>
            {visibleGroups.length}
          </div>
        </div>
      </div>

      {visibleGroups.length === 0 && (
        <Card>
          <div style={emptyState}>
            <strong>No chat group available</strong>
            <p>
              Students need to be assigned to a group. Instructors need a group assigned by admin.
            </p>
          </div>
        </Card>
      )}

      {visibleGroups.length > 0 && (
        <div style={layout}>
          <Card>
            <h2 style={sectionTitle}>Groups</h2>
            <p style={sectionSub}>Select a group conversation</p>

            <div style={{display:"grid",gap:10,marginTop:18}}>
              {visibleGroups.map((group: any) => {
                const active = selectedGroupId === group.id;
                const count = chats.filter((c: any) => c.groupId === group.id).length;

                return (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    style={groupButton(active)}
                  >
                    <div style={{textAlign:"left"}}>
                      <strong>{group.name}</strong>
                      <div style={{fontSize:12,color:active ? "rgba(255,255,255,.75)" : C.muted}}>
                        {groupMembers(group.id).length} members
                      </div>
                    </div>

                    <span style={countBadge(active)}>{count}</span>
                  </button>
                );
              })}
            </div>

            {selectedGroup && (
              <div style={{marginTop:22}}>
                <h3 style={smallTitle}>Members</h3>

                <div style={{display:"grid",gap:10}}>
                  {groupMembers(selectedGroup.id).map((member: any) => (
                    <div key={member.id} style={memberRow}>
                      <Avatar name={member.name} photo={member.photo} />
                      <div style={{minWidth:0}}>
                        <strong style={{color:C.text}}>{member.name}</strong>
                        <div style={meta}>{member.role}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card>
            <div style={chatHeader}>
              <div>
                <h2 style={sectionTitle}>{selectedGroup?.name || "Group Chat"}</h2>
                <p style={sectionSub}>
                  {messages.length} message{messages.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>

            <div style={messagesBox}>
              {messages.length === 0 && (
                <div style={emptyState}>
                  <strong>No messages yet</strong>
                  <p>Start the discussion by sending the first message.</p>
                </div>
              )}

              {messages.map((chat: any) => {
                const s = sender(chat.senderId);
                const mine = chat.senderId === user.id;

                return (
                  <div
                    key={chat.id}
                    style={{
                      display:"flex",
                      justifyContent:mine ? "flex-end" : "flex-start",
                    }}
                  >
                    <div style={bubble(mine)}>
                      <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:6}}>
                        {!mine && <Avatar name={s?.name || "User"} photo={s?.photo} size={30} />}

                        <div>
                          <div style={{
                            fontWeight:900,
                            fontSize:13,
                            color:mine ? "#fff" : C.text,
                          }}>
                            {mine ? "You" : s?.name || "User"}
                          </div>

                          <div style={{
                            fontSize:11,
                            color:mine ? "rgba(255,255,255,.72)" : C.muted,
                          }}>
                            {formatDate(chat.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div style={{lineHeight:1.6,whiteSpace:"pre-wrap"}}>
                        {chat.message}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div ref={endRef} />
            </div>

            <div style={composer}>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Write your message..."
                style={textareaStyle}
              />

              <Button onClick={submitMessage} disabled={sending || !message.trim()}>
                {sending ? "Sending..." : "Send"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function Avatar({
  name,
  photo,
  size = 40,
}: {
  name: string;
  photo?: string;
  size?: number;
}) {
  const initials = (name || "?")
    .split(" ")
    .map(x => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div style={{
      width:size,
      height:size,
      borderRadius:"50%",
      background:C.surface,
      color:C.primary,
      display:"flex",
      alignItems:"center",
      justifyContent:"center",
      overflow:"hidden",
      fontWeight:900,
      flexShrink:0,
      border:"1px solid rgba(22,163,74,.14)",
    }}>
      {photo ? (
        <img src={photo} style={{width:"100%",height:"100%",objectFit:"cover"}} />
      ) : initials}
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "";
  return new Date(value).toLocaleString();
}

function groupButton(active: boolean): CSSProperties {
  return {
    border:"1px solid " + (active ? C.primary : "#e2e8f0"),
    background:active ? C.primary : "#fff",
    color:active ? "#fff" : C.text,
    borderRadius:16,
    padding:14,
    display:"flex",
    justifyContent:"space-between",
    gap:12,
    alignItems:"center",
    cursor:"pointer",
    fontWeight:900,
  };
}

function countBadge(active: boolean): CSSProperties {
  return {
    background:active ? "rgba(255,255,255,.18)" : "#f1f5f9",
    color:active ? "#fff" : C.muted,
    borderRadius:999,
    padding:"5px 9px",
    fontSize:12,
    fontWeight:900,
  };
}

function bubble(mine: boolean): CSSProperties {
  return {
    maxWidth:"72%",
    background:mine ? C.primary : "#f8fafc",
    color:mine ? "#fff" : C.text,
    border:"1px solid " + (mine ? C.primary : "#e2e8f0"),
    borderRadius:18,
    padding:14,
    marginBottom:12,
    boxShadow:"0 6px 18px rgba(15,23,42,.04)",
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

const layout: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"320px minmax(0,1fr)",
  gap:18,
};

const sectionTitle: CSSProperties = {
  margin:0,
  fontSize:20,
  color:C.text,
  fontWeight:900,
};

const sectionSub: CSSProperties = {
  margin:"5px 0 0",
  color:C.muted,
  fontSize:13,
};

const smallTitle: CSSProperties = {
  margin:"0 0 12px",
  fontSize:15,
  color:C.text,
  fontWeight:900,
};

const memberRow: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"40px 1fr",
  gap:10,
  alignItems:"center",
  padding:10,
  border:"1px solid #e2e8f0",
  borderRadius:14,
};

const meta: CSSProperties = {
  fontSize:12,
  color:C.muted,
  marginTop:2,
  textTransform:"capitalize",
};

const chatHeader: CSSProperties = {
  display:"flex",
  justifyContent:"space-between",
  alignItems:"center",
  marginBottom:14,
};

const messagesBox: CSSProperties = {
  height:520,
  overflowY:"auto",
  background:"#fff",
  border:"1px solid #e2e8f0",
  borderRadius:18,
  padding:16,
};

const composer: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"1fr auto",
  gap:12,
  marginTop:14,
  alignItems:"end",
};

const textareaStyle: CSSProperties = {
  width:"100%",
  minHeight:58,
  maxHeight:130,
  padding:"12px 14px",
  border:"1px solid #e2e8f0",
  borderRadius:14,
  resize:"vertical",
};

const emptyState: CSSProperties = {
  minHeight:150,
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
};
