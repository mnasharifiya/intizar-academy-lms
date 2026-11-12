import { useMemo, useRef, useState, type CSSProperties } from "react";
import { PageHeader, Card, Button, Input } from "../../components/common/ui";
import { C } from "../../lib/theme";
import {
  createUser,
  updateUser,
  addAdminGroup,
  removeAdminGroup,
  loadAllData,
  addGroupStudentPending,
  approveGroupStudent,
  rejectGroupStudent,
  assignInstructorToGroupPending,
  approveGroupInstructor,
  rejectGroupInstructor,
} from "../../lib/api";

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "student",
  levelId: "",
  photo: "",
  rank: "",
  background: "",
  about: "",
  phone: "",
  office: "",
  adminGroupIds: [] as string[],
  studentGroupId: "",
  instructorGroupIds: [] as string[],
};

export default function UsersPage({
  user,
  data,
  setData,
}: {
  user?: any;
  data: any;
  setData: any;
}) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [accessUser, setAccessUser] = useState<any | null>(null);
  const [accessGroupIds, setAccessGroupIds] = useState<string[]>([]);
  const photoRef = useRef<HTMLInputElement | null>(null);

  const users = data?.users ?? [];
  const levels = data?.levels ?? [];
  const groups = data?.groups ?? [];
  const adminGroups = data?.adminGroups ?? [];
  const groupStudents = data?.groupStudents ?? [];

  const systemAdminIds: string[] = data?.systemAdminIds ?? [];
  const currentAdminIsMainController =
    user?.role === "admin" &&
    Boolean(user?.isMainAdmin || systemAdminIds.includes(user.id));
  const currentAdminIsRestricted = user?.role === "admin" && !currentAdminIsMainController;

  const pendingStudents = groupStudents.filter((gs: any) => gs.status === "pending");
  const pendingInstructors = groups.filter((g: any) => g.instructorId && g.instructorStatus === "pending");

  const filtered = useMemo(() => {
    return users.filter((u: any) => {
      const s = search.toLowerCase();
      const matchesSearch =
        u.name?.toLowerCase().includes(s) ||
        u.email?.toLowerCase().includes(s) ||
        u.background?.toLowerCase().includes(s);
      const matchesRole = role === "all" || u.role === role;
      return matchesSearch && matchesRole;
    });
  }, [users, search, role]);

  async function refreshFromSupabase() {
    const fresh = await loadAllData();
    setData(fresh);
  }

  function handlePhoto(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setForm(f => ({ ...f, photo: String(e.target?.result || "") }));
    reader.readAsDataURL(file);
  }

  function toggleArray(value: string, list: string[]) {
    return list.includes(value) ? list.filter(x => x !== value) : [...list, value];
  }

  function groupName(id: string) {
    return groups.find((g: any) => g.id === id)?.name || "-";
  }

  function levelName(id: string) {
    return levels.find((l: any) => l.id === id)?.name || "-";
  }

  function userName(id: string) {
    return users.find((u: any) => u.id === id)?.name || "-";
  }

  function adminAccessText(adminId: string) {
    if (systemAdminIds.includes(adminId)) return "Main Admin / all groups";
    const links = adminGroups.filter((ag: any) => ag.adminId === adminId);
    if (links.length === 0) return "No groups assigned (Restricted)";
    return links.map((ag: any) => groupName(ag.groupId)).join(", ");
  }

  function openAccessModal(admin: any) {
    if (!currentAdminIsMainController) {
      alert("Only the Main Controller can manage admin group access.");
      return;
    }

    if (admin.id === user?.id || systemAdminIds.includes(admin.id)) {
      alert("Main Admin accounts have global access managed via system_admins.");
      return;
    }

    setAccessUser(admin);
    setAccessGroupIds(
      adminGroups
        .filter((ag: any) => ag.adminId === admin.id)
        .map((ag: any) => ag.groupId)
    );
  }

  async function saveAccess() {
    if (!accessUser) return;

    try {
      setBusy(true);

      const existing = adminGroups
        .filter((ag: any) => ag.adminId === accessUser.id)
        .map((ag: any) => ag.groupId);

      for (const groupId of existing) {
        if (!accessGroupIds.includes(groupId)) {
          await removeAdminGroup(accessUser.id, groupId);
        }
      }

      for (const groupId of accessGroupIds) {
        if (!existing.includes(groupId)) {
          await addAdminGroup(accessUser.id, groupId);
        }
      }

      await refreshFromSupabase();
      setAccessUser(null);
      setAccessGroupIds([]);
      alert("Admin group access updated.");
    } catch (err: any) {
      console.error("Admin access update failed:", err);
      alert(err?.message || "Failed to update admin access.");
    } finally {
      setBusy(false);
    }
  }

  async function addUser() {
    if (!currentAdminIsMainController) {
      alert("Only the Main Controller can create users.");
      return;
    }

    if (!form.name || !form.email || !form.password) {
      alert("Name, email and password are required.");
      return;
    }

    if (form.role === "student" && !form.levelId) {
      alert("Please select a program for this student.");
      return;
    }

    try {
      setBusy(true);

      const newUser = await createUser({
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role as any,
        levelId: form.role === "student" ? form.levelId || null : null,
        rank: form.rank,
        background: form.background,
        about: form.about,
        phone: form.phone,
        office: form.office,
      });

      let finalUser = newUser;

      if (form.photo) {
        finalUser = await updateUser(newUser.id, { photo: form.photo });
      }

      if (form.role === "admin") {
        for (const groupId of form.adminGroupIds) {
          await addAdminGroup(finalUser.id, groupId);
        }
      }

      if (form.role === "student" && form.studentGroupId) {
        const groupHasRestrictedAdmin = adminGroups.some((ag: any) => ag.groupId === form.studentGroupId);
        await addGroupStudentPending(
          form.studentGroupId,
          finalUser.id,
          user.id,
          groupHasRestrictedAdmin ? "pending" : "approved"
        );
      }

      if (form.role === "instructor" && form.instructorGroupIds.length > 0) {
        for (const groupId of form.instructorGroupIds) {
          const groupHasRestrictedAdmin = adminGroups.some((ag: any) => ag.groupId === groupId);
          await assignInstructorToGroupPending(
            groupId,
            finalUser.id,
            user.id,
            groupHasRestrictedAdmin ? "pending" : "approved"
          );
        }
      }

      await refreshFromSupabase();

      setShowAdd(false);
      setForm(emptyForm);

      alert("User created successfully.");
    } catch (err: any) {
      console.error("Create user failed:", err);
      alert(err?.message || "Failed to create user.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(targetUser: any) {
    try {
      setBusy(true);
      const updated = await updateUser(targetUser.id, { isActive: !targetUser.isActive });
      setData((d: any) => ({
        ...d,
        users: d.users.map((u: any) => (u.id === targetUser.id ? updated : u)),
      }));
    } catch (err: any) {
      alert(err?.message || "Failed to update user.");
    } finally {
      setBusy(false);
    }
  }

  async function approveStudent(gs: any) {
    try {
      setBusy(true);
      await approveGroupStudent(gs.groupId, gs.studentId, user.id);
      await refreshFromSupabase();
      alert("Student approved.");
    } catch (err: any) {
      alert(err?.message || "Failed to approve student.");
    } finally {
      setBusy(false);
    }
  }

  async function rejectStudent(gs: any) {
    try {
      setBusy(true);
      await rejectGroupStudent(gs.groupId, gs.studentId, user.id);
      await refreshFromSupabase();
      alert("Student rejected.");
    } catch (err: any) {
      alert(err?.message || "Failed to reject student.");
    } finally {
      setBusy(false);
    }
  }

  async function approveInstructor(group: any) {
    try {
      setBusy(true);
      await approveGroupInstructor(group.id, user.id);
      await refreshFromSupabase();
      alert("Instructor approved.");
    } catch (err: any) {
      alert(err?.message || "Failed to approve instructor.");
    } finally {
      setBusy(false);
    }
  }

  async function rejectInstructor(group: any) {
    try {
      setBusy(true);
      await rejectGroupInstructor(group.id, user.id);
      await refreshFromSupabase();
      alert("Instructor rejected.");
    } catch (err: any) {
      alert(err?.message || "Failed to reject instructor.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        sub={currentAdminIsRestricted ? "Restricted admin: assigned groups only" : users.length + " users in the system"}
        action={
          currentAdminIsMainController
            ? <Button onClick={() => setShowAdd(true)} disabled={busy}>+ Add User</Button>
            : undefined
        }
      />

      {currentAdminIsRestricted && (
        <Card>
          <h2 style={sectionTitle}>Pending Approvals</h2>
          <p style={sectionSub}>
            Approve or reject students and instructors assigned to your groups.
          </p>

          {pendingStudents.length === 0 && pendingInstructors.length === 0 && (
            <div style={emptyState}>
              <strong>No pending approvals</strong>
              <p>New students or instructors assigned to your groups will appear here.</p>
            </div>
          )}

          <div style={{display:"grid",gap:12,marginTop:16}}>
            {pendingStudents.map((gs: any) => (
              <div key={gs.groupId + gs.studentId} style={approvalCard}>
                <div>
                  <strong>{userName(gs.studentId)}</strong>
                  <div style={meta}>Student pending for {groupName(gs.groupId)}</div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button style={approveBtn} disabled={busy} onClick={() => approveStudent(gs)}>Approve</button>
                  <button style={rejectBtn} disabled={busy} onClick={() => rejectStudent(gs)}>Reject</button>
                </div>
              </div>
            ))}

            {pendingInstructors.map((g: any) => (
              <div key={g.id} style={approvalCard}>
                <div>
                  <strong>{userName(g.instructorId)}</strong>
                  <div style={meta}>Instructor pending for {g.name}</div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <button style={approveBtn} disabled={busy} onClick={() => approveInstructor(g)}>Approve</button>
                  <button style={rejectBtn} disabled={busy} onClick={() => rejectInstructor(g)}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <div style={{display:"grid",gridTemplateColumns:"1fr 180px",gap:12,marginBottom:18}}>
          <Input value={search} onChange={setSearch} placeholder="Search by name, email, speciality" />
          <select value={role} onChange={e => setRole(e.target.value)} style={selectStyle}>
            <option value="all">All roles</option>
            <option value="admin">Admin</option>
            <option value="instructor">Instructor</option>
            <option value="student">Student</option>
          </select>
        </div>

        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead>
              <tr style={{background:"#f8fafc",textAlign:"left"}}>
                <th style={th}>User</th>
                <th style={th}>Role</th>
                <th style={th}>Program</th>
                <th style={th}>Speciality</th>
                <th style={th}>Admin Group Access</th>
                <th style={th}>Status</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u: any) => {
                const level = levels.find((l: any) => l.id === u.levelId);
                return (
                  <tr key={u.id} style={{borderBottom:"1px solid "+C.border}}>
                    <td style={td}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <Avatar name={u.name} photo={u.photo} />
                        <div>
                          <strong>{u.name}</strong>
                          <div style={{fontSize:12,color:C.muted}}>{u.email}</div>
                          {u.rank && <div style={{fontSize:12,color:C.primary,fontWeight:700}}>{u.rank}</div>}
                        </div>
                      </div>
                    </td>
                    <td style={td}>{u.role}</td>
                    <td style={td}>{level?.name || "-"}</td>
                    <td style={td}>{u.background || "-"}</td>
                    <td style={td}>
                      {u.role === "admin" ? (
                        <div>
                          <div style={{fontSize:12,color:C.muted,maxWidth:260,lineHeight:1.5}}>
                            {adminAccessText(u.id)}
                          </div>
                          {currentAdminIsMainController && u.id !== user?.id && !systemAdminIds.includes(u.id) && (
                            <button style={smallButton} disabled={busy} onClick={() => openAccessModal(u)}>
                              Manage Access
                            </button>
                          )}
                        </div>
                      ) : "-"}
                    </td>
                    <td style={td}>
                      <span style={{color:u.isActive ? C.primary : C.danger,fontWeight:700}}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={td}>
                      <button disabled={busy || !currentAdminIsMainController} onClick={() => toggleActive(u)}>
                        {u.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {showAdd && currentAdminIsMainController && (
        <div style={overlay}>
          <div style={modal}>
            <h2 style={{marginTop:0}}>Add User</h2>

            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
              <Avatar name={form.name || "New User"} photo={form.photo} size={58} />
              <div>
                <input ref={photoRef} type="file" accept="image/*" hidden onChange={e => handlePhoto(e.target.files?.[0])} />
                <Button variant="secondary" onClick={() => photoRef.current?.click()} disabled={busy}>Upload Photo</Button>
              </div>
            </div>

            <div style={{display:"grid",gap:12}}>
              <Input value={form.name} onChange={v => setForm(f => ({...f,name:v}))} placeholder="Full name" />
              <Input value={form.email} onChange={v => setForm(f => ({...f,email:v}))} placeholder="Email" type="email" />
              <Input value={form.password} onChange={v => setForm(f => ({...f,password:v}))} placeholder="Temporary password" type="password" />

              <select
                value={form.role}
                onChange={e => setForm(f => ({
                  ...f,
                  role:e.target.value,
                  levelId:"",
                  adminGroupIds:[],
                  studentGroupId:"",
                  instructorGroupIds:[],
                }))}
                style={selectStyle}
                disabled={busy}
              >
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </select>

              {form.role === "student" && (
                <>
                  <select value={form.levelId} onChange={e => setForm(f => ({...f,levelId:e.target.value}))} style={selectStyle} disabled={busy}>
                    <option value="">Select program</option>
                    {levels.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>

                  <select value={form.studentGroupId} onChange={e => setForm(f => ({...f,studentGroupId:e.target.value}))} style={selectStyle} disabled={busy}>
                    <option value="">Assign to group now optional</option>
                    {groups.map((g: any) => <option key={g.id} value={g.id}>{g.name} - {levelName(g.levelId)}</option>)}
                  </select>
                </>
              )}

              {(form.role === "instructor" || form.role === "admin") && (
                <>
                  <Input value={form.rank} onChange={v => setForm(f => ({...f,rank:v}))} placeholder="Rank / title e.g. Senior Instructor" />
                  <Input value={form.background} onChange={v => setForm(f => ({...f,background:v}))} placeholder="Speciality e.g. Fiqh and Aqeedah" />
                  <textarea value={form.about} onChange={e => setForm(f => ({...f,about:e.target.value}))} placeholder="Biography" style={textareaStyle} disabled={busy} />
                  <Input value={form.phone} onChange={v => setForm(f => ({...f,phone:v}))} placeholder="Phone" />
                  <Input value={form.office} onChange={v => setForm(f => ({...f,office:v}))} placeholder="Office / location" />
                </>
              )}

              {form.role === "instructor" && (
                <div style={accessBox}>
                  <strong style={{color:C.text}}>Instructor Group Assignment</strong>
                  <p style={helpText}>
                    Select groups for this instructor. If a selected group belongs to a restricted admin, approval will be required.
                  </p>

                  <div style={checkGrid}>
                    {groups.map((g: any) => (
                      <label key={g.id} style={checkRow}>
                        <input
                          type="checkbox"
                          checked={form.instructorGroupIds.includes(g.id)}
                          onChange={() => setForm(f => ({...f,instructorGroupIds:toggleArray(g.id,f.instructorGroupIds)}))}
                          disabled={busy}
                        />
                        <span>{g.name} - {levelName(g.levelId)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {form.role === "admin" && (
                <div style={accessBox}>
                  <strong style={{color:C.text}}>Admin Group Access</strong>
                  <p style={helpText}>
                    Select the groups this Restricted Admin can manage. New admins are created as Restricted Admins; Main Admin status is granted separately in system_admins.
                  </p>

                  <div style={checkGrid}>
                    {groups.map((g: any) => (
                      <label key={g.id} style={checkRow}>
                        <input
                          type="checkbox"
                          checked={form.adminGroupIds.includes(g.id)}
                          onChange={() => setForm(f => ({...f,adminGroupIds:toggleArray(g.id,f.adminGroupIds)}))}
                          disabled={busy}
                        />
                        <span>{g.name} - {levelName(g.levelId)}</span>
                      </label>
                    ))}
                  </div>

                  {form.adminGroupIds.length === 0 && (
                    <div style={warningBox}>
                      No group selected: this Restricted Admin will have no group access until groups are assigned.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{display:"flex",gap:10,marginTop:18}}>
              <Button onClick={addUser} disabled={busy}>{busy ? "Saving..." : "Save User"}</Button>
              <Button variant="secondary" onClick={() => setShowAdd(false)} disabled={busy}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {accessUser && (
        <div style={overlay}>
          <div style={modal}>
            <h2 style={{marginTop:0}}>Manage Admin Group Access</h2>
            <p style={{color:C.muted,marginTop:-8}}>
              {accessUser.name} — {accessUser.email}
            </p>

            <div style={accessBox}>
              <strong style={{color:C.text}}>Assigned Groups</strong>
              <p style={helpText}>
                This admin can perform all admin work only inside selected groups.
              </p>

              <div style={checkGrid}>
                {groups.map((g: any) => (
                  <label key={g.id} style={checkRow}>
                    <input
                      type="checkbox"
                      checked={accessGroupIds.includes(g.id)}
                      onChange={() => setAccessGroupIds(ids => toggleArray(g.id, ids))}
                      disabled={busy}
                    />
                    <span>{g.name} - {levelName(g.levelId)}</span>
                  </label>
                ))}
              </div>

              {accessGroupIds.length === 0 && (
                <div style={warningBox}>
                  No group selected: this Restricted Admin will have no group access until groups are assigned.
                </div>
              )}
            </div>

            <div style={{display:"flex",gap:10,marginTop:18}}>
              <Button onClick={saveAccess} disabled={busy}>{busy ? "Saving..." : "Save Access"}</Button>
              <Button variant="secondary" onClick={() => setAccessUser(null)} disabled={busy}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ name, photo, size = 42 }: { name: string; photo?: string; size?: number }) {
  const initials = (name || "?").split(" ").map(x => x[0]).join("").slice(0,2).toUpperCase();
  return (
    <div style={{width:size,height:size,borderRadius:"50%",background:C.surface,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",fontWeight:800,color:C.primary}}>
      {photo ? <img src={photo} style={{width:"100%",height:"100%",objectFit:"cover"}} /> : initials}
    </div>
  );
}

const selectStyle: CSSProperties = {padding:"12px 14px",border:"1px solid "+C.border,borderRadius:10};
const textareaStyle: CSSProperties = {width:"100%",padding:"12px 14px",border:"1px solid "+C.border,borderRadius:10,minHeight:90};
const th: CSSProperties = {padding:"12px",fontSize:13,color:C.muted};
const td: CSSProperties = {padding:"13px 12px",fontSize:14,verticalAlign:"top"};
const overlay: CSSProperties = {position:"fixed",inset:0,background:"rgba(0,0,0,.35)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50};
const modal: CSSProperties = {width:660,maxHeight:"90vh",overflowY:"auto",background:"#fff",borderRadius:18,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,.25)"};

const sectionTitle: CSSProperties = {margin:0,fontSize:20,color:C.text,fontWeight:900};
const sectionSub: CSSProperties = {margin:"5px 0 0",color:C.muted,fontSize:13};
const meta: CSSProperties = {fontSize:13,color:C.muted,marginTop:4};
const helpText: CSSProperties = {margin:"6px 0 10px",fontSize:13,color:C.muted,lineHeight:1.6};

const emptyState: CSSProperties = {
  minHeight:120,
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
  marginTop:16,
};

const approvalCard: CSSProperties = {
  display:"flex",
  justifyContent:"space-between",
  alignItems:"center",
  gap:14,
  border:"1px solid "+C.border,
  borderRadius:14,
  padding:14,
  background:"#fff",
};

const accessBox: CSSProperties = {
  border:"1px solid "+C.border,
  borderRadius:14,
  padding:14,
  background:"#f8fafc",
};

const checkGrid: CSSProperties = {
  display:"grid",
  gap:8,
  maxHeight:190,
  overflowY:"auto",
};

const checkRow: CSSProperties = {
  display:"flex",
  alignItems:"center",
  gap:10,
  background:"#fff",
  border:"1px solid "+C.border,
  borderRadius:10,
  padding:"9px 10px",
  fontSize:14,
};

const warningBox: CSSProperties = {
  marginTop:10,
  borderRadius:10,
  padding:10,
  background:"#fef3c7",
  color:"#92400e",
  fontSize:13,
  fontWeight:700,
};

const smallButton: CSSProperties = {
  marginTop:6,
  border:"1px solid "+C.border,
  background:"#fff",
  color:C.text,
  borderRadius:8,
  padding:"5px 8px",
  fontSize:12,
  fontWeight:800,
  cursor:"pointer",
};

const approveBtn: CSSProperties = {
  border:"none",
  background:"#dcfce7",
  color:"#166534",
  borderRadius:9,
  padding:"8px 11px",
  fontWeight:900,
  cursor:"pointer",
};

const rejectBtn: CSSProperties = {
  border:"none",
  background:"#fee2e2",
  color:"#991b1b",
  borderRadius:9,
  padding:"8px 11px",
  fontWeight:900,
  cursor:"pointer",
};
