import { useMemo, useState, type CSSProperties } from "react";
import { Card, Button, Input } from "../../components/common/ui";
import { C } from "../../lib/theme";
import { createLecture, createVideo } from "../../lib/api";
import { InstructorMaterialsManager } from "../../components/learning/Materials";

const emptyLecture = {
  groupId: "",
  courseId: "",
  title: "",
  scheduledTime: "",
  meetingUrl: "",
};

const emptyVideo = {
  groupId: "",
  courseId: "",
  title: "",
  description: "",
  videoUrl: "",
};

export default function InstructorTeaching({
  user,
  data,
  setData,
}: {
  user: any;
  data: any;
  setData: any;
}) {
  const [lectureForm, setLectureForm] = useState(emptyLecture);
  const [videoForm, setVideoForm] = useState(emptyVideo);
  const [filterGroup, setFilterGroup] = useState("all");

  const groups = data?.groups ?? [];
  const courses = data?.courses ?? [];
  const levelCourses = data?.levelCourses ?? [];
  const lectures = data?.lectures ?? [];
  const videos = data?.videos ?? [];

  const myGroups = groups.filter((g: any) => g.instructorId === user.id);

  const filteredLectures = useMemo(() => {
    return lectures
      .filter((l: any) => myGroups.some((g: any) => g.id === l.groupId))
      .filter((l: any) => filterGroup === "all" || l.groupId === filterGroup)
      .sort((a: any, b: any) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  }, [lectures, myGroups, filterGroup]);

  const filteredVideos = useMemo(() => {
    return videos
      .filter((v: any) => myGroups.some((g: any) => g.id === v.groupId))
      .filter((v: any) => filterGroup === "all" || v.groupId === filterGroup)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [videos, myGroups, filterGroup]);

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

  async function scheduleLecture() {
    if (!lectureForm.groupId || !lectureForm.courseId || !lectureForm.title || !lectureForm.scheduledTime) {
      alert("Group, course, title, and date/time are required.");
      return;
    }

    const newLecture = await createLecture({
      groupId: lectureForm.groupId,
      courseId: lectureForm.courseId,
      instructorId: user.id,
      hostStudentId: null,
      title: lectureForm.title,
      type: "online_discussion",
      scheduledTime: new Date(lectureForm.scheduledTime).toISOString(),
      status: "scheduled",
      meetingUrl: lectureForm.meetingUrl,
    });

    setData((d: any) => ({
      ...d,
      lectures: [...d.lectures, newLecture],
    }));

    setLectureForm(emptyLecture);
    alert("Online lecture scheduled.");
  }

  async function publishVideo() {
    if (!videoForm.groupId || !videoForm.courseId || !videoForm.title || !videoForm.videoUrl) {
      alert("Group, course, title, and video link are required.");
      return;
    }

    const nextOrder =
      videos.filter((v: any) => v.groupId === videoForm.groupId).length + 1;

    const newVideo = await createVideo({
      groupId: videoForm.groupId,
      courseId: videoForm.courseId,
      instructorId: user.id,
      title: videoForm.title,
      description: videoForm.description,
      videoUrl: videoForm.videoUrl,
      order: nextOrder,
    });

    setData((d: any) => ({
      ...d,
      videos: [...d.videos, newVideo],
    }));

    setVideoForm(emptyVideo);
    alert("Video lecture published.");
  }

  return (
    <div>
      <div style={hero}>
        <div>
          <div style={eyebrow}>Instructor Teaching</div>
          <h1 style={heroTitle}>Lectures & Learning Resources</h1>
          <p style={heroSub}>
            Schedule online classes, publish recorded video lectures, and prepare materials for students.
          </p>
        </div>
      </div>

      <div style={topFilters}>
        <button
          onClick={() => setFilterGroup("all")}
          style={chip(filterGroup === "all")}
        >
          All Groups
        </button>

        {myGroups.map((g: any) => (
          <button
            key={g.id}
            onClick={() => setFilterGroup(g.id)}
            style={chip(filterGroup === g.id)}
          >
            {g.name}
          </button>
        ))}
      </div>

      <div style={grid}>
        <Card>
          <h2 style={sectionTitle}>Schedule Online Lecture</h2>
          <p style={sectionSub}>Create live online class with meeting link</p>

          <div style={{display:"grid",gap:12,marginTop:18}}>
            <select
              value={lectureForm.groupId}
              onChange={e => setLectureForm(f => ({...f,groupId:e.target.value,courseId:""}))}
              style={selectStyle}
            >
              <option value="">Select group</option>
              {myGroups.map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>

            <select
              value={lectureForm.courseId}
              onChange={e => setLectureForm(f => ({...f,courseId:e.target.value}))}
              style={selectStyle}
              disabled={!lectureForm.groupId}
            >
              <option value="">Select course</option>
              {coursesForGroup(lectureForm.groupId).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <Input
              value={lectureForm.title}
              onChange={v => setLectureForm(f => ({...f,title:v}))}
              placeholder="Lecture title"
            />

            <Input
              value={lectureForm.scheduledTime}
              onChange={v => setLectureForm(f => ({...f,scheduledTime:v}))}
              type="datetime-local"
            />

            <Input
              value={lectureForm.meetingUrl}
              onChange={v => setLectureForm(f => ({...f,meetingUrl:v}))}
              placeholder="Online meeting link e.g. Zoom / Google Meet"
            />

            <Button onClick={scheduleLecture}>Schedule Lecture</Button>
          </div>
        </Card>

        <Card>
          <h2 style={sectionTitle}>Publish Video Lecture</h2>
          <p style={sectionSub}>Add recorded lesson using YouTube, Drive, Vimeo, or MP4 link</p>

          <div style={{display:"grid",gap:12,marginTop:18}}>
            <select
              value={videoForm.groupId}
              onChange={e => setVideoForm(f => ({...f,groupId:e.target.value,courseId:""}))}
              style={selectStyle}
            >
              <option value="">Select group</option>
              {myGroups.map((g: any) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>

            <select
              value={videoForm.courseId}
              onChange={e => setVideoForm(f => ({...f,courseId:e.target.value}))}
              style={selectStyle}
              disabled={!videoForm.groupId}
            >
              <option value="">Select course</option>
              {coursesForGroup(videoForm.groupId).map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <Input
              value={videoForm.title}
              onChange={v => setVideoForm(f => ({...f,title:v}))}
              placeholder="Video lecture title"
            />

            <Input
              value={videoForm.videoUrl}
              onChange={v => setVideoForm(f => ({...f,videoUrl:v}))}
              placeholder="Video URL"
            />

            <textarea
              value={videoForm.description}
              onChange={e => setVideoForm(f => ({...f,description:e.target.value}))}
              placeholder="Video description"
              style={textareaStyle}
            />

            <Button onClick={publishVideo}>Publish Video</Button>
          </div>
        </Card>
      </div>

      <div style={grid}>
        <Card>
          <h2 style={sectionTitle}>Scheduled Online Lectures</h2>
          <p style={sectionSub}>Upcoming and previous live sessions</p>

          <div style={{display:"grid",gap:12,marginTop:18}}>
            {filteredLectures.length === 0 && (
              <div style={emptyState}>
                <strong>No online lectures yet</strong>
                <p>Scheduled lectures will appear here.</p>
              </div>
            )}

            {filteredLectures.map((lecture: any) => (
              <div key={lecture.id} style={itemCard}>
                <div style={{display:"flex",justifyContent:"space-between",gap:12}}>
                  <div>
                    <h3 style={{margin:"0 0 5px",color:C.text}}>{lecture.title}</h3>
                    <div style={meta}>{groupName(lecture.groupId)} • {courseName(lecture.courseId)}</div>
                    <div style={meta}>{formatDate(lecture.scheduledTime)}</div>

                    {lecture.meetingUrl && (
                      <a href={lecture.meetingUrl} target="_blank" rel="noreferrer" style={linkStyle}>
                        Join lecture link
                      </a>
                    )}
                  </div>

                  <span style={statusBadge}>{lecture.status}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 style={sectionTitle}>Recorded Video Lectures</h2>
          <p style={sectionSub}>Videos published for your students</p>

          <div style={{display:"grid",gap:12,marginTop:18}}>
            {filteredVideos.length === 0 && (
              <div style={emptyState}>
                <strong>No video lectures yet</strong>
                <p>Published videos will appear here.</p>
              </div>
            )}

            {filteredVideos.map((video: any) => (
              <div key={video.id} style={itemCard}>
                <div style={{display:"flex",gap:12}}>
                  <div style={videoIcon}>{video.title?.slice(0,2).toUpperCase()}</div>

                  <div style={{flex:1}}>
                    <h3 style={{margin:"0 0 5px",color:C.text}}>{video.title}</h3>
                    <div style={meta}>{groupName(video.groupId)} • {courseName(video.courseId)}</div>
                    <p style={{margin:"8px 0",fontSize:13,color:C.muted,lineHeight:1.6}}>
                      {video.description || "No description added."}
                    </p>

                    <a href={video.videoUrl} target="_blank" rel="noreferrer" style={linkStyle}>
                      Open video
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
      <InstructorMaterialsManager user={user} data={data} setData={setData} />
    </div>
  );
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function chip(active: boolean): CSSProperties {
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

const hero: CSSProperties = {
  background:"linear-gradient(135deg,#052e16,#166534)",
  color:"#fff",
  borderRadius:24,
  padding:28,
  marginBottom:18,
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
  letterSpacing:"-0.04em",
};

const heroSub: CSSProperties = {
  margin:"10px 0 0",
  maxWidth:720,
  color:"rgba(255,255,255,.78)",
  fontSize:15,
  lineHeight:1.7,
};

const topFilters: CSSProperties = {
  display:"flex",
  gap:10,
  flexWrap:"wrap",
  marginBottom:18,
};

const grid: CSSProperties = {
  display:"grid",
  gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))",
  gap:18,
  marginBottom:20,
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

const selectStyle: CSSProperties = {
  padding:"12px 14px",
  border:"1px solid #e2e8f0",
  borderRadius:10,
  background:"#fff",
};

const textareaStyle: CSSProperties = {
  width:"100%",
  minHeight:96,
  padding:"12px 14px",
  border:"1px solid #e2e8f0",
  borderRadius:10,
  resize:"vertical",
};

const emptyState: CSSProperties = {
  minHeight:130,
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

const itemCard: CSSProperties = {
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

const linkStyle: CSSProperties = {
  display:"inline-block",
  marginTop:8,
  color:C.primary,
  fontWeight:900,
  textDecoration:"none",
  fontSize:13,
};

const statusBadge: CSSProperties = {
  display:"inline-flex",
  height:28,
  alignItems:"center",
  padding:"0 10px",
  borderRadius:999,
  background:C.surface,
  color:C.primary,
  fontSize:12,
  fontWeight:900,
  textTransform:"capitalize",
};

const videoIcon: CSSProperties = {
  width:48,
  height:48,
  borderRadius:14,
  background:C.surface,
  color:C.primary,
  display:"flex",
  alignItems:"center",
  justifyContent:"center",
  fontWeight:900,
  flexShrink:0,
};


