import { PageHeader, Card } from "../../components/common/ui";
import { C } from "../../lib/theme";

export default function AdminDashboard({ data }: { data: any }) {
  const users = data?.users ?? [];
  const students = users.filter((u: any) => u.role === "student");
  const instructors = users.filter((u: any) => u.role === "instructor");
  const groups = data?.groups ?? [];
  const activeGroups = groups.filter((g: any) => g.isActive);

  return (
    <div>
      <PageHeader title="Admin Dashboard" sub="Full platform overview" />

      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:16,marginBottom:24}}>
        <Card><h2 style={{color:C.primary}}>{students.length}</h2><p>Students</p></Card>
        <Card><h2 style={{color:C.info}}>{instructors.length}</h2><p>Instructors</p></Card>
        <Card><h2 style={{color:C.purple}}>{activeGroups.length}</h2><p>Active Groups</p></Card>
        <Card><h2>{data?.courses?.length ?? 0}</h2><p>Courses</p></Card>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:18}}>
        <Card>
          <h3>Group Occupancy</h3>
          {groups.length === 0 && <p style={{color:C.muted}}>No groups yet.</p>}
          {groups.map((g: any) => {
            const count = (data?.groupStudents ?? []).filter((gs: any) => gs.groupId === g.id).length;
            return (
              <div key={g.id} style={{marginTop:14}}>
                <strong>{g.name}</strong>
                <div style={{fontSize:13,color:C.muted}}>{count}/{g.maxStudents} students</div>
              </div>
            );
          })}
        </Card>

        <Card>
          <h3>Upcoming Sessions</h3>
          <p style={{color:C.muted}}>No upcoming sessions yet.</p>
        </Card>
      </div>
    </div>
  );
}
