import { useMemo, useState, type CSSProperties } from "react";
import { PageHeader, Card, Button, Input } from "../../components/common/ui";
import { C } from "../../lib/theme";
import {
  createGroup,
  updateGroup,
  addGroupStudent,
  removeGroupStudent,
  loadAllData,
  addAdminGroup,
} from "../../lib/api";

const emptyForm = {
  id: "",
  name: "",
  levelId: "",
  instructorId: "",
  maxStudents: 15,
  isActive: true,
};

export default function GroupsPage({ user, data, setData }: { user?: any; data: any; setData: any }) {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [studentModal, setStudentModal] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const groups = data?.groups ?? [];
  const levels = data?.levels ?? [];
  const users = data?.users ?? [];
  const groupStudents = data?.groupStudents ?? [];
  const adminGroups = data?.adminGroups ?? [];
  const currentAdminGroupLinks = adminGroups.filter((ag: any) => ag.adminId === user?.id);

  const instructors = users.filter((u: any) => u.role === "instructor");
  const students = users.filter((u: any) => u.role === "student");

  async function refreshFromSupabase() {
    const fresh = await loadAllData();
    setData(fresh);

    if (studentModal?.id) {
      const updatedModalGroup = fresh.groups.find((g: any) => g.id === studentModal.id);
      if (updatedModalGroup) setStudentModal(updatedModalGroup);
    }
  }

  const filteredGroups = useMemo(() => {
    const s = search.toLowerCase();
    return groups.filter((g: any) => {
      const level = levels.find((l: any) => l.id === g.levelId);
      const instructor = users.find((u: any) => u.id === g.instructorId);
      return (
        g.name?.toLowerCase().includes(s) ||
        level?.name?.toLowerCase().includes(s) ||
        instructor?.name?.toLowerCase().includes(s)
      );
    });
  }, [groups, levels, users, search]);

  function openAdd() {
    setForm(emptyForm);
    setModal("add");
  }

  function openEdit(group: any) {
    setForm({
      id: group.id,
      name: group.name || "",
      levelId: group.levelId || "",
      instructorId: group.instructorId || "",
      maxStudents: group.maxStudents || 15,
      isActive: group.isActive !== false,
    });
    setModal("edit");
  }

  async function saveGroup() {
    if (!form.name || !form.levelId || !form.instructorId) {
      alert("Group name, level, and instructor are required.");
      return;
    }

    try {
      setBusy(true);

      if (modal === "add") {
        const newGroup = await createGroup({
          name: form.name,
          levelId: form.levelId,
          instructorId: form.instructorId,
          maxStudents: Number(form.maxStudents) || 15,
          isActive: form.isActive,
        });

        if (user?.role === "admin" && currentAdminGroupLinks.length > 0) {
          await addAdminGroup(user.id, newGroup.id);
        }
      } else {
        await updateGroup(form.id, {
          name: form.name,
          levelId: form.levelId,
          instructorId: form.instructorId,
          maxStudents: Number(form.maxStudents) || 15,
          isActive: form.isActive,
        });
      }

      await refreshFromSupabase();
      setModal(null);
      setForm(emptyForm);
    } catch (err: any) {
      alert(err?.message || "Failed to save group.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(group: any) {
    try {
      setBusy(true);
      await updateGroup(group.id, {
        isActive: !group.isActive,
      });
      await refreshFromSupabase();
    } catch (err: any) {
      alert(err?.message || "Failed to update group status.");
    } finally {
      setBusy(false);
    }
  }

  async function addStudentToGroup(group: any, student: any) {
    try {
      setBusy(true);
      await addGroupStudent(group.id, student.id);
      await refreshFromSupabase();
    } catch (err: any) {
      alert(err?.message || "Failed to add student to group.");
    } finally {
      setBusy(false);
    }
  }

  async function removeStudentFromGroup(group: any, student: any) {
    try {
      setBusy(true);
      await removeGroupStudent(group.id, student.id);
      await refreshFromSupabase();
    } catch (err: any) {
      alert(err?.message || "Failed to remove student from group.");
    } finally {
      setBusy(false);
    }
  }

  async function autoAssign() {
    try {
      setBusy(true);

      let assigned = 0;
      const current = [...groupStudents];

      for (const student of students) {
        if (!student.levelId) continue;
        if (current.some((gs: any) => gs.studentId === student.id)) continue;

        const availableGroups = groups
          .filter((g: any) => g.levelId === student.levelId && g.isActive)
          .filter((g: any) => current.filter((gs: any) => gs.groupId === g.id).length < g.maxStudents)
          .sort((a: any, b: any) => {
            const ac = current.filter((gs: any) => gs.groupId === a.id).length;
            const bc = current.filter((gs: any) => gs.groupId === b.id).length;
            return ac - bc;
          });

        const target = availableGroups[0];
        if (!target) continue;

        await addGroupStudent(target.id, student.id);
        current.push({ groupId: target.id, studentId: student.id });
        assigned++;
      }

      await refreshFromSupabase();

      if (assigned === 0) {
        alert("No students assigned. Make sure groups are active and students have the same program as the group.");
      } else {
        alert(assigned + " student(s) assigned.");
      }
    } catch (err: any) {
      alert(err?.message || "Auto-assign failed.");
    } finally {
      setBusy(false);
    }
  }

  function groupMembers(group: any) {
    return groupStudents
      .filter((gs: any) => gs.groupId === group.id)
      .map((gs: any) => users.find((u: any) => u.id === gs.studentId))
      .filter(Boolean);
  }

  function availableStudents(group: any) {
    return students.filter((s: any) => {
      const sameLevel = s.levelId === group.levelId;
      const alreadyInAnyGroup = groupStudents.some((gs: any) => gs.studentId === s.id);
      return sameLevel && !alreadyInAnyGroup;
    });
  }

  function assignedElsewhereStudents(group: any) {
    return students.filter((s: any) => {
      const sameLevel = s.levelId === group.levelId;
      const alreadyInOtherGroup = groupStudents.some(
        (gs: any) => gs.studentId === s.id && gs.groupId !== group.id
      );
      return sameLevel && alreadyInOtherGroup;
    });
  }

  function studentsInLevel(group: any) {
    return students.filter((s: any) => s.levelId === group.levelId);
  }

  const activeGroups = groups.filter((g: any) => g.isActive).length;
  const inactiveGroups = groups.length - activeGroups;

  return (
    <div>
      <PageHeader
        title="Groups"
        sub={groups.length + " groups · " + activeGroups + " active · " + inactiveGroups + " inactive"}
        action={
          <div style={{display:"flex",gap:10}}>
            <Button variant="secondary" onClick={refreshFromSupabase} disabled={busy}>Refresh</Button>
            <Button variant="secondary" onClick={autoAssign} disabled={busy}>Auto-Assign</Button>
            <Button onClick={openAdd} disabled={busy}>+ New Group</Button>
          </div>
        }
      />

      <Card>
        <div style={{display:"grid",gap:10}}>
          <Input
            value={search}
            onChange={setSearch}
            placeholder="Search by group, level, or instructor"
          />

          <div style={{
            padding:12,
            borderRadius:12,
            background:"#f8fafc",
            color:C.muted,
            fontSize:13,
            lineHeight:1.7,
          }}>
            <strong style={{color:C.text}}>Note:</strong> Auto-Assign only uses active groups. 
            Manual student assignment still works from “Manage Students”, but students only appear if they are in the same level and not already assigned to another group.
          </div>
        </div>
      </Card>

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(330px,1fr))",gap:18,marginTop:18}}>
        {filteredGroups.map((group: any) => {
          const level = levels.find((l: any) => l.id === group.levelId);
          const instructor = users.find((u: any) => u.id === group.instructorId);
          const members = groupMembers(group);
          const pct = Math.min(100, Math.round((members.length / group.maxStudents) * 100));

          return (
            <Card key={group.id}>
              <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
                <div>
                  <h3 style={{margin:"0 0 6px",fontSize:19,color:C.text}}>{group.name}</h3>
                  <div style={{fontSize:13,color:C.muted}}>
                    Level: <strong>{level?.name || "No level"}</strong>
                  </div>
                  <div style={{fontSize:13,color:C.muted}}>
                    Instructor: <strong>{instructor?.name || "Not assigned"}</strong>
                  </div>
                </div>

                <span style={{
                  color: group.isActive ? C.primary : C.danger,
                  fontWeight: 800,
                  fontSize: 13,
                }}>
                  {group.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div style={{marginTop:18}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:6}}>
                  <strong>Students</strong>
                  <span>{members.length}/{group.maxStudents}</span>
                </div>

                <div style={{height:8,background:"#f1f5f9",borderRadius:99,overflow:"hidden"}}>
                  <div style={{height:"100%",width:pct+"%",background:C.primary,borderRadius:99}} />
                </div>

                <div style={{fontSize:12,color:C.muted,marginTop:8}}>
                  {studentsInLevel(group).length} student(s) in this level · {availableStudents(group).length} available
                </div>
              </div>

              <div style={{display:"flex",gap:8,marginTop:18,flexWrap:"wrap"}}>
                <Button variant="secondary" onClick={() => openEdit(group)} disabled={busy}>Edit</Button>
                <Button variant="secondary" onClick={() => setStudentModal(group)} disabled={busy}>Manage Students</Button>
                <Button variant={group.isActive ? "danger" : "primary"} onClick={() => toggleActive(group)} disabled={busy}>
                  {group.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {filteredGroups.length === 0 && (
        <div style={{marginTop:18}}>
          <Card>
            <p style={{color:C.muted,margin:0}}>No groups found.</p>
          </Card>
        </div>
      )}

      {modal && (
        <div style={overlay}>
          <div style={modalStyle}>
            <h2 style={{marginTop:0}}>{modal === "add" ? "Create Group" : "Edit Group"}</h2>

            <div style={{display:"grid",gap:12}}>
              <Input
                value={form.name}
                onChange={v => setForm(f => ({...f,name:v}))}
                placeholder="Group name e.g. Ghaliboun Group A"
              />

              <select value={form.levelId} onChange={e => setForm(f => ({...f,levelId:e.target.value}))} style={selectStyle}>
                <option value="">Select level</option>
                {levels.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>

              <select value={form.instructorId} onChange={e => setForm(f => ({...f,instructorId:e.target.value}))} style={selectStyle}>
                <option value="">Assign instructor</option>
                {instructors.map((i: any) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>

              <Input
                value={String(form.maxStudents)}
                onChange={v => setForm(f => ({...f,maxStudents:Number(v)}))}
                placeholder="Max students"
                type="number"
              />

              <label style={{display:"flex",alignItems:"center",gap:8}}>
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({...f,isActive:e.target.checked}))}
                />
                Active group
              </label>
            </div>

            <div style={{display:"flex",gap:10,marginTop:18}}>
              <Button onClick={saveGroup} disabled={busy}>{busy ? "Saving..." : "Save Group"}</Button>
              <Button variant="secondary" onClick={() => setModal(null)} disabled={busy}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {studentModal && (
        <div style={overlay}>
          <div style={modalStyle}>
            <h2 style={{marginTop:0}}>Manage Students</h2>
            <p style={{color:C.muted,marginTop:-8}}>{studentModal.name}</p>

            <div style={{
              background:"#f8fafc",
              borderRadius:12,
              padding:12,
              marginBottom:16,
              fontSize:13,
              color:C.muted,
              lineHeight:1.7,
            }}>
              <div><strong style={{color:C.text}}>Program students:</strong> {studentsInLevel(studentModal).length}</div>
              <div><strong style={{color:C.text}}>Members here:</strong> {groupMembers(studentModal).length}</div>
              <div><strong style={{color:C.text}}>Available:</strong> {availableStudents(studentModal).length}</div>
              <div><strong style={{color:C.text}}>Already assigned elsewhere:</strong> {assignedElsewhereStudents(studentModal).length}</div>
            </div>

            <h3>Members</h3>
            {groupMembers(studentModal).length === 0 && <p style={{color:C.muted}}>No students in this group yet.</p>}

            {groupMembers(studentModal).map((student: any) => (
              <div key={student.id} style={studentRow}>
                <div>
                  <strong>{student.name}</strong>
                  <div style={{fontSize:12,color:C.muted}}>{student.email}</div>
                </div>
                <button disabled={busy} onClick={() => removeStudentFromGroup(studentModal, student)}>
                  Remove
                </button>
              </div>
            ))}

            <h3 style={{marginTop:20}}>Available Students</h3>
            {availableStudents(studentModal).length === 0 && (
              <p style={{color:C.muted}}>
                No available students for this level. This means there are no students in this level, or the students are already assigned to another group.
              </p>
            )}

            {availableStudents(studentModal).map((student: any) => (
              <div key={student.id} style={studentRow}>
                <div>
                  <strong>{student.name}</strong>
                  <div style={{fontSize:12,color:C.muted}}>{student.email}</div>
                </div>
                <button disabled={busy} onClick={() => addStudentToGroup(studentModal, student)}>
                  Add
                </button>
              </div>
            ))}

            <div style={{marginTop:18,display:"flex",gap:10}}>
              <Button variant="secondary" onClick={refreshFromSupabase} disabled={busy}>Refresh</Button>
              <Button variant="secondary" onClick={() => setStudentModal(null)} disabled={busy}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const selectStyle: CSSProperties = {
  padding:"12px 14px",
  border:"1px solid "+C.border,
  borderRadius:10,
};

const overlay: CSSProperties = {
  position:"fixed",
  inset:0,
  background:"rgba(0,0,0,.35)",
  display:"flex",
  alignItems:"center",
  justifyContent:"center",
  zIndex:50,
};

const modalStyle: CSSProperties = {
  width:560,
  maxHeight:"90vh",
  overflowY:"auto",
  background:"#fff",
  borderRadius:18,
  padding:24,
  boxShadow:"0 20px 60px rgba(0,0,0,.25)",
};

const studentRow: CSSProperties = {
  display:"flex",
  alignItems:"center",
  justifyContent:"space-between",
  gap:10,
  padding:"10px 0",
  borderBottom:"1px solid "+C.border,
};

