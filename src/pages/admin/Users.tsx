import { useMemo, useRef, useState } from "react";
import { PageHeader, Card, Button, Input } from "../../components/common/ui";
import { C } from "../../lib/theme";
import { createUser, updateUser } from "../../lib/api";

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
};

export default function UsersPage({ data, setData }: { data: any; setData: any }) {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const photoRef = useRef<HTMLInputElement | null>(null);

  const users = data?.users ?? [];
  const levels = data?.levels ?? [];

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

  function handlePhoto(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setForm(f => ({ ...f, photo: String(e.target?.result || "") }));
    reader.readAsDataURL(file);
  }

  async function addUser() {
    if (!form.name || !form.email || !form.password) {
      alert("Name, email and password are required.");
      return;
    }

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

    if (form.photo) {
      const updated = await updateUser(newUser.id, { photo: form.photo });
      setData((d: any) => ({ ...d, users: [...d.users, updated] }));
    } else {
      setData((d: any) => ({ ...d, users: [...d.users, newUser] }));
    }

    setShowAdd(false);
    setForm(emptyForm);
  }

  async function toggleActive(user: any) {
    const updated = await updateUser(user.id, { isActive: !user.isActive });
    setData((d: any) => ({
      ...d,
      users: d.users.map((u: any) => (u.id === user.id ? updated : u)),
    }));
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        sub={users.length + " users in the system"}
        action={<Button onClick={() => setShowAdd(true)}>+ Add User</Button>}
      />

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
                <th style={th}>Level</th>
                <th style={th}>Speciality</th>
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
                      <span style={{color:u.isActive ? C.primary : C.danger,fontWeight:700}}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td style={td}>
                      <button onClick={() => toggleActive(u)}>
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

      {showAdd && (
        <div style={overlay}>
          <div style={modal}>
            <h2 style={{marginTop:0}}>Add User</h2>

            <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
              <Avatar name={form.name || "New User"} photo={form.photo} size={58} />
              <div>
                <input ref={photoRef} type="file" accept="image/*" hidden onChange={e => handlePhoto(e.target.files?.[0])} />
                <Button variant="secondary" onClick={() => photoRef.current?.click()}>Upload Photo</Button>
              </div>
            </div>

            <div style={{display:"grid",gap:12}}>
              <Input value={form.name} onChange={v => setForm(f => ({...f,name:v}))} placeholder="Full name" />
              <Input value={form.email} onChange={v => setForm(f => ({...f,email:v}))} placeholder="Email" type="email" />
              <Input value={form.password} onChange={v => setForm(f => ({...f,password:v}))} placeholder="Temporary password" type="password" />

              <select value={form.role} onChange={e => setForm(f => ({...f,role:e.target.value}))} style={selectStyle}>
                <option value="student">Student</option>
                <option value="instructor">Instructor</option>
                <option value="admin">Admin</option>
              </select>

              {form.role === "student" && (
                <select value={form.levelId} onChange={e => setForm(f => ({...f,levelId:e.target.value}))} style={selectStyle}>
                  <option value="">Select level</option>
                  {levels.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              )}

              {(form.role === "instructor" || form.role === "admin") && (
                <>
                  <Input value={form.rank} onChange={v => setForm(f => ({...f,rank:v}))} placeholder="Rank / title e.g. Senior Instructor" />
                  <Input value={form.background} onChange={v => setForm(f => ({...f,background:v}))} placeholder="Speciality e.g. Fiqh and Aqeedah" />
                  <textarea value={form.about} onChange={e => setForm(f => ({...f,about:e.target.value}))} placeholder="Biography" style={textareaStyle} />
                  <Input value={form.phone} onChange={v => setForm(f => ({...f,phone:v}))} placeholder="Phone" />
                  <Input value={form.office} onChange={v => setForm(f => ({...f,office:v}))} placeholder="Office / location" />
                </>
              )}
            </div>

            <div style={{display:"flex",gap:10,marginTop:18}}>
              <Button onClick={addUser}>Save User</Button>
              <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
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

const selectStyle: React.CSSProperties = {padding:"12px 14px",border:"1px solid "+C.border,borderRadius:10};
const textareaStyle: React.CSSProperties = {width:"100%",padding:"12px 14px",border:"1px solid "+C.border,borderRadius:10,minHeight:90};
const th: React.CSSProperties = {padding:"12px",fontSize:13,color:C.muted};
const td: React.CSSProperties = {padding:"13px 12px",fontSize:14};
const overlay: React.CSSProperties = {position:"fixed",inset:0,background:"rgba(0,0,0,.35)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50};
const modal: React.CSSProperties = {width:560,maxHeight:"90vh",overflowY:"auto",background:"#fff",borderRadius:18,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,.25)"};
