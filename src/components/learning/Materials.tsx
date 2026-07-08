import { useMemo, useState, type CSSProperties } from "react";
import { Card, Button, Input } from "../common/ui";
import { C } from "../../lib/theme";
import {
  createLearningMaterialLink,
  deleteLearningMaterial,
  getLearningMaterialUrl,
  uploadLearningMaterialFile,
} from "../../lib/api";

const emptyForm = {
  groupId: "",
  courseId: "",
  title: "",
  description: "",
  externalUrl: "",
};

export function InstructorMaterialsManager({
  user,
  data,
  setData,
}: {
  user: any;
  data: any;
  setData: any;
}) {
  const [mode, setMode] = useState<"file" | "link">("file");
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);

  const groups = data?.groups ?? [];
  const courses = data?.courses ?? [];
  const levelCourses = data?.levelCourses ?? [];
  const materials = data?.learningMaterials ?? [];

  const myGroups = groups.filter((g: any) => g.instructorId === user.id);

  const myMaterials = useMemo(() => {
    return materials
      .filter((m: any) => myGroups.some((g: any) => g.id === m.groupId))
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [materials, myGroups]);

  function coursesForGroup(groupId: string) {
    const group = myGroups.find((g: any) => g.id === groupId);
    if (!group) return [];

    const courseIds = levelCourses
      .filter((lc: any) => lc.levelId === group.levelId)
      .map((lc: any) => lc.courseId);

    return courses.filter((c: any) => courseIds.includes(c.id));
  }

  function groupName(id: string) {
    return groups.find((g: any) => g.id === id)?.name || "-";
  }

  function courseName(id: string) {
    return courses.find((c: any) => c.id === id)?.name || "-";
  }

  async function saveMaterial() {
    if (!form.groupId || !form.courseId || !form.title) {
      alert("Group, course, and title are required.");
      return;
    }

    if (mode === "file") {
      if (!file) {
        alert("Please select a file.");
        return;
      }

      const material = await uploadLearningMaterialFile({
        groupId: form.groupId,
        courseId: form.courseId,
        instructorId: user.id,
        title: form.title,
        description: form.description,
        file,
      });

      setData((d: any) => ({
        ...d,
        learningMaterials: [...d.learningMaterials, material],
      }));
    } else {
      if (!form.externalUrl) {
        alert("Please provide the material link.");
        return;
      }

      const material = await createLearningMaterialLink({
        groupId: form.groupId,
        courseId: form.courseId,
        instructorId: user.id,
        title: form.title,
        description: form.description,
        externalUrl: form.externalUrl,
      });

      setData((d: any) => ({
        ...d,
        learningMaterials: [...d.learningMaterials, material],
      }));
    }

    setForm(emptyForm);
    setFile(null);
    alert("Learning material saved.");
  }

  async function openMaterial(material: any) {
    const url = await getLearningMaterialUrl(material);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  async function removeMaterial(material: any) {
    if (!confirm("Delete this material?")) return;

    await deleteLearningMaterial(material);

    setData((d: any) => ({
      ...d,
      learningMaterials: d.learningMaterials.filter((m: any) => m.id !== material.id),
    }));
  }

  return (
    <Card>
      <h2 style={sectionTitle}>Learning Materials</h2>
      <p style={sectionSub}>Upload PDF, PPTX, DOCX, images, video/audio files, or add external links.</p>

      <div style={modeTabs}>
        <button style={tab(mode === "file")} onClick={() => setMode("file")}>Upload File</button>
        <button style={tab(mode === "link")} onClick={() => setMode("link")}>Add Link</button>
      </div>

      <div style={formGrid}>
        <select
          value={form.groupId}
          onChange={e => setForm(f => ({...f, groupId:e.target.value, courseId:""}))}
          style={selectStyle}
        >
          <option value="">Select group</option>
          {myGroups.map((g: any) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        <select
          value={form.courseId}
          onChange={e => setForm(f => ({...f, courseId:e.target.value}))}
          style={selectStyle}
          disabled={!form.groupId}
        >
          <option value="">Select course</option>
          {coursesForGroup(form.groupId).map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <Input
          value={form.title}
          onChange={v => setForm(f => ({...f,title:v}))}
          placeholder="Material title"
        />

        <textarea
          value={form.description}
          onChange={e => setForm(f => ({...f,description:e.target.value}))}
          placeholder="Material description"
          style={textareaStyle}
        />

        {mode === "file" && (
          <input
            type="file"
            accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg,.webp,.mp4,.mp3,.txt"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            style={fileInputStyle}
          />
        )}

        {mode === "link" && (
          <Input
            value={form.externalUrl}
            onChange={v => setForm(f => ({...f,externalUrl:v}))}
            placeholder="External link e.g. Google Drive / website / YouTube"
          />
        )}

        <Button onClick={saveMaterial}>Save Material</Button>
      </div>

      <div style={{marginTop:24}}>
        <h3 style={smallTitle}>Published Materials</h3>

        {myMaterials.length === 0 && (
          <div style={emptyState}>
            <strong>No materials yet</strong>
            <p>Uploaded files and links will appear here.</p>
          </div>
        )}

        <div style={{display:"grid",gap:12}}>
          {myMaterials.map((material: any) => (
            <div key={material.id} style={materialCard}>
              <div>
                <strong style={{color:C.text}}>{material.title}</strong>
                <div style={meta}>
                  {groupName(material.groupId)} - {courseName(material.courseId)}
                </div>
                <div style={meta}>
                  {material.kind === "file"
                    ? `${material.fileType?.toUpperCase()} - ${formatSize(material.fileSize)}`
                    : "External link"}
                </div>
              </div>

              <div style={{display:"flex",gap:8}}>
                <button style={miniButton} onClick={() => openMaterial(material)}>Open</button>
                <button style={dangerButton} onClick={() => removeMaterial(material)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function StudentMaterialsList({
  user,
  data,
}: {
  user: any;
  data: any;
}) {
  const groups = data?.groups ?? [];
  const groupStudents = data?.groupStudents ?? [];
  const courses = data?.courses ?? [];
  const materials = data?.learningMaterials ?? [];

  const myMembership = groupStudents.find((gs: any) => gs.studentId === user.id);
  const myGroup = groups.find((g: any) => g.id === myMembership?.groupId);

  const myMaterials = myGroup
    ? materials
        .filter((m: any) => m.groupId === myGroup.id && m.isActive !== false)
        .sort((a: any, b: any) => Number(a.displayOrder || 0) - Number(b.displayOrder || 0))
    : [];

  function courseName(id: string) {
    return courses.find((c: any) => c.id === id)?.name || "-";
  }

  async function openMaterial(material: any) {
    const url = await getLearningMaterialUrl(material);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Card>
      <h2 style={sectionTitle}>Learning Materials</h2>
      <p style={sectionSub}>Download files and open useful learning links shared by your instructor.</p>

      {!myGroup && (
        <div style={emptyState}>
          <strong>No group assigned</strong>
          <p>Materials will appear after you are assigned to a group.</p>
        </div>
      )}

      {myGroup && myMaterials.length === 0 && (
        <div style={emptyState}>
          <strong>No materials yet</strong>
          <p>Your instructor has not shared materials yet.</p>
        </div>
      )}

      <div style={{display:"grid",gap:12,marginTop:18}}>
        {myMaterials.map((material: any) => (
          <div key={material.id} style={materialCard}>
            <div>
              <strong style={{color:C.text}}>{material.title}</strong>
              <div style={meta}>{courseName(material.courseId)}</div>
              <div style={meta}>
                {material.kind === "file"
                  ? `${material.fileType?.toUpperCase()} - ${formatSize(material.fileSize)}`
                  : "External link"}
              </div>
              {material.description && (
                <p style={{margin:"6px 0 0",fontSize:13,color:C.muted,lineHeight:1.6}}>
                  {material.description}
                </p>
              )}
            </div>

            <button style={miniButton} onClick={() => openMaterial(material)}>
              {material.kind === "file" ? "Download" : "Open"}
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function formatSize(size?: number | null) {
  if (!size) return "-";
  if (size < 1024 * 1024) return Math.round(size / 1024) + " KB";
  return (size / (1024 * 1024)).toFixed(1) + " MB";
}

function tab(active: boolean): CSSProperties {
  return {
    border:"1px solid " + (active ? C.primary : "#e2e8f0"),
    background: active ? C.primary : "#fff",
    color: active ? "#fff" : C.text,
    borderRadius:999,
    padding:"8px 14px",
    fontWeight:900,
    cursor:"pointer",
  };
}

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
  fontSize:16,
  color:C.text,
  fontWeight:900,
};

const modeTabs: CSSProperties = {
  display:"flex",
  gap:10,
  marginTop:18,
};

const formGrid: CSSProperties = {
  display:"grid",
  gap:12,
  marginTop:18,
};

const selectStyle: CSSProperties = {
  padding:"12px 14px",
  border:"1px solid #e2e8f0",
  borderRadius:10,
  background:"#fff",
};

const textareaStyle: CSSProperties = {
  width:"100%",
  minHeight:90,
  padding:"12px 14px",
  border:"1px solid #e2e8f0",
  borderRadius:10,
  resize:"vertical",
};

const fileInputStyle: CSSProperties = {
  padding:"12px 14px",
  border:"1px solid #e2e8f0",
  borderRadius:10,
  background:"#fff",
};

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
  marginTop:18,
};

const materialCard: CSSProperties = {
  display:"flex",
  justifyContent:"space-between",
  gap:14,
  alignItems:"center",
  border:"1px solid #e2e8f0",
  borderRadius:16,
  padding:14,
  background:"#fff",
};

const meta: CSSProperties = {
  fontSize:13,
  color:C.muted,
  marginTop:3,
};

const miniButton: CSSProperties = {
  border:"none",
  background:C.primary,
  color:"#fff",
  borderRadius:10,
  padding:"8px 12px",
  fontWeight:900,
  cursor:"pointer",
};

const dangerButton: CSSProperties = {
  border:"none",
  background:"#fee2e2",
  color:"#991b1b",
  borderRadius:10,
  padding:"8px 12px",
  fontWeight:900,
  cursor:"pointer",
};
