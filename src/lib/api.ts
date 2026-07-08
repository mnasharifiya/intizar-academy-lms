// @ts-nocheck
import { supabase } from './supabase';
import type {
  AppUser, Level, Course, LevelCourse, Group, GroupStudent,
  Lecture, Attendance, Assignment, AssignmentFile, Submission,
  Grade, Chat, Notification, Video, AppData
} from './types';

// ─── Row mappers (DB → App) ───────────────────────────────────

function mapProfile(row: Record<string, unknown>): AppUser {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    role: row.role as AppUser['role'],
    levelId: (row.level_id as string | null) ?? null,
    photo: (row.photo as string | null) ?? null,
    isActive: row.is_active as boolean,
    rank: (row.rank as string) ?? '',
    background: (row.background as string) ?? '',
    about: (row.about as string) ?? '',
    contacts: {
      email: (row.email as string) ?? '',
      phone: (row.phone as string) ?? '',
      office: (row.office as string) ?? '',
    },
  };
}

function mapLevel(row: Record<string, unknown>): Level {
  return {
    id: row.id as string,
    name: row.name as string,
    category: row.category as Level['category'],
    description: (row.description as string) ?? '',
  };
}

function mapCourse(row: Record<string, unknown>): Course {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) ?? '',
  };
}

function mapGroup(row: Record<string, unknown>): Group {
  return {
    id: row.id as string,
    name: row.name as string,
    levelId: (row.level_id as string) ?? '',
    instructorId: (row.instructor_id as string) ?? '',
    maxStudents: (row.max_students as number) ?? 20,
    isActive: row.is_active as boolean,
  };
}

function mapLecture(row: Record<string, unknown>): Lecture {
  return {
    id: row.id as string,
    groupId: (row.group_id as string) ?? '',
    courseId: (row.course_id as string) ?? '',
    instructorId: (row.instructor_id as string) ?? '',
    hostStudentId: (row.host_student_id as string | null) ?? null,
    title: row.title as string,
    type: row.type as Lecture['type'],
    scheduledTime: row.scheduled_time as string,
    status: row.status as Lecture['status'],
    meetingUrl: (row.meeting_url as string) ?? '',
  };
}

function mapAttendance(row: Record<string, unknown>): Attendance {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    lectureId: row.lecture_id as string,
    status: row.status as Attendance['status'],
    markedAt: row.marked_at as string,
  };
}

function mapAssignment(
  row: Record<string, unknown>,
  files: AssignmentFile[]
): Assignment {
  return {
    id: row.id as string,
    groupId: (row.group_id as string) ?? '',
    courseId: (row.course_id as string) ?? '',
    title: row.title as string,
    description: (row.description as string) ?? '',
    dueDate: row.due_date as string,
    createdBy: (row.created_by as string) ?? '',
    createdAt: row.created_at as string,
    files,
  };
}

function mapSubmission(row: Record<string, unknown>): Submission {
  return {
    id: row.id as string,
    assignmentId: row.assignment_id as string,
    studentId: row.student_id as string,
    fileName: (row.file_name as string) ?? '',
    fileSize: (row.file_size as string) ?? '',
    submittedAt: row.submitted_at as string,
  };
}

function mapGrade(row: Record<string, unknown>): Grade {
  return {
    id: row.id as string,
    studentId: row.student_id as string,
    lectureId: (row.lecture_id as string | null) ?? null,
    assignmentId: (row.assignment_id as string | null) ?? null,
    type: row.type as Grade['type'],
    score: row.score as number,
    feedback: (row.feedback as string) ?? '',
    gradedBy: (row.graded_by as string) ?? '',
    createdAt: row.created_at as string,
  };
}

function mapChat(row: Record<string, unknown>): Chat {
  return {
    id: row.id as string,
    groupId: row.group_id as string,
    senderId: row.sender_id as string,
    message: row.message as string,
    createdAt: row.created_at as string,
  };
}

function mapNotification(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    type: row.type as Notification['type'],
    title: row.title as string,
    body: (row.body as string) ?? '',
    isRead: row.is_read as boolean,
    createdAt: row.created_at as string,
  };
}

function mapVideo(row: Record<string, unknown>): Video {
  return {
    id: row.id as string,
    groupId: (row.group_id as string) ?? '',
    courseId: (row.course_id as string) ?? '',
    instructorId: (row.instructor_id as string) ?? '',
    title: row.title as string,
    description: (row.description as string) ?? '',
    videoUrl: (row.video_url as string) ?? '',
    order: (row.order as number) ?? 0,
    createdAt: row.created_at as string,
  };
}

// ─── AUTH ─────────────────────────────────────────────────────

export async function signIn(email: string, password: string): Promise<AppUser> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.user) throw new Error('No user returned');

  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!profile) throw new Error('Profile not found');
  if (!profile.is_active) throw new Error('Account is deactivated');

  return mapProfile(profile as Record<string, unknown>);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle();

  return profile ? mapProfile(profile as Record<string, unknown>) : null;
}

// ─── LOAD ALL DATA ────────────────────────────────────────────

export async function loadAllData(): Promise<AppData> {
  const [
    profilesRes, levelsRes, coursesRes, levelCoursesRes,
    groupsRes, groupStudentsRes, lecturesRes, attendanceRes,
    assignmentsRes, assignmentFilesRes, submissionsRes,
    gradesRes, chatsRes, notifsRes, videosRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').order('name'),
    supabase.from('levels').select('*').order('name'),
    supabase.from('courses').select('*').order('name'),
    supabase.from('level_courses').select('*'),
    supabase.from('groups').select('*').order('name'),
    supabase.from('group_students').select('*'),
    supabase.from('lectures').select('*').order('scheduled_time'),
    supabase.from('attendance').select('*'),
    supabase.from('assignments').select('*').order('due_date'),
    supabase.from('assignment_files').select('*'),
    supabase.from('submissions').select('*').order('submitted_at'),
    supabase.from('grades').select('*').order('created_at'),
    supabase.from('chats').select('*').order('created_at'),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }),
    supabase.from('videos').select('*').order('order'),
  ]);

  const filesMap = new Map<string, AssignmentFile[]>();
  (assignmentFilesRes.data ?? []).forEach((f) => {
    const row = f as Record<string, unknown>;
    const aId = row.assignment_id as string;
    if (!filesMap.has(aId)) filesMap.set(aId, []);
    filesMap.get(aId)!.push({ name: row.name as string, type: (row.type as string) ?? '', size: (row.size as string) ?? '' });
  });

  return {
    users: (profilesRes.data ?? []).map((r) => mapProfile(r as Record<string, unknown>)),
    levels: (levelsRes.data ?? []).map((r) => mapLevel(r as Record<string, unknown>)),
    courses: (coursesRes.data ?? []).map((r) => mapCourse(r as Record<string, unknown>)),
    levelCourses: (levelCoursesRes.data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return { levelId: row.level_id as string, courseId: row.course_id as string } as LevelCourse;
    }),
    groups: (groupsRes.data ?? []).map((r) => mapGroup(r as Record<string, unknown>)),
    groupStudents: (groupStudentsRes.data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return { groupId: row.group_id as string, studentId: row.student_id as string } as GroupStudent;
    }),
    lectures: (lecturesRes.data ?? []).map((r) => mapLecture(r as Record<string, unknown>)),
    attendance: (attendanceRes.data ?? []).map((r) => mapAttendance(r as Record<string, unknown>)),
    assignments: (assignmentsRes.data ?? []).map((r) => {
      const row = r as Record<string, unknown>;
      return mapAssignment(row, filesMap.get(row.id as string) ?? []);
    }),
    submissions: (submissionsRes.data ?? []).map((r) => mapSubmission(r as Record<string, unknown>)),
    grades: (gradesRes.data ?? []).map((r) => mapGrade(r as Record<string, unknown>)),
    chats: (chatsRes.data ?? []).map((r) => mapChat(r as Record<string, unknown>)),
    notifications: (notifsRes.data ?? []).map((r) => mapNotification(r as Record<string, unknown>)),
    videos: (videosRes.data ?? []).map((r) => mapVideo(r as Record<string, unknown>)),
  };
}

// ─── USERS ────────────────────────────────────────────────────

export async function createUser(data: {
  name: string; email: string; password: string; role: AppUser['role'];
  levelId?: string | null; rank?: string; background?: string; about?: string;
  phone?: string; office?: string;
}): Promise<AppUser> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;

  const res = await fetch(`${supabaseUrl}/functions/v1/admin-ops/create-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.error ?? 'Failed to create user');
  return result as AppUser;
}

export async function deleteUserAdmin(userId: string): Promise<void> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;

  const res = await fetch(`${supabaseUrl}/functions/v1/admin-ops/delete-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ userId }),
  });

  const result = await res.json();
  if (!res.ok) throw new Error(result.error ?? 'Failed to delete user');
}

export async function seedDatabase(): Promise<{ success: boolean; message: string }> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token;

  const res = await fetch(`${supabaseUrl}/functions/v1/admin-ops/seed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  return res.json();
}

export async function updateUser(id: string, updates: Partial<{
  name: string; email: string; role: AppUser['role']; levelId: string | null;
  photo: string | null; isActive: boolean; rank: string; background: string;
  about: string; phone: string; office: string;
}>): Promise<AppUser> {
  const dbUpdates: Record<string, unknown> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.email !== undefined) dbUpdates.email = updates.email;
  if (updates.role !== undefined) dbUpdates.role = updates.role;
  if (updates.levelId !== undefined) dbUpdates.level_id = updates.levelId;
  if (updates.photo !== undefined) dbUpdates.photo = updates.photo;
  if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
  if (updates.rank !== undefined) dbUpdates.rank = updates.rank;
  if (updates.background !== undefined) dbUpdates.background = updates.background;
  if (updates.about !== undefined) dbUpdates.about = updates.about;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.office !== undefined) dbUpdates.office = updates.office;

  const { data, error } = await supabase
    .from('profiles')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapProfile(data as Record<string, unknown>);
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;
}

// ─── LEVELS ───────────────────────────────────────────────────

export async function createLevel(data: Omit<Level, 'id'>): Promise<Level> {
  const { data: row, error } = await supabase
    .from('levels')
    .insert({ name: data.name, category: data.category, description: data.description })
    .select()
    .single();
  if (error) throw error;
  return mapLevel(row as Record<string, unknown>);
}

export async function updateLevel(id: string, data: Partial<Omit<Level, 'id'>>): Promise<Level> {
  const { data: row, error } = await supabase
    .from('levels')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapLevel(row as Record<string, unknown>);
}

// ─── COURSES ──────────────────────────────────────────────────

export async function createCourse(data: Omit<Course, 'id'>): Promise<Course> {
  const { data: row, error } = await supabase
    .from('courses')
    .insert({ name: data.name, description: data.description })
    .select()
    .single();
  if (error) throw error;
  return mapCourse(row as Record<string, unknown>);
}

// ─── LEVEL COURSES ────────────────────────────────────────────

export async function addLevelCourse(levelId: string, courseId: string): Promise<void> {
  const { error } = await supabase
    .from('level_courses')
    .insert({ level_id: levelId, course_id: courseId });
  if (error && !error.message.includes('duplicate')) throw error;
}

export async function removeLevelCourse(levelId: string, courseId: string): Promise<void> {
  const { error } = await supabase
    .from('level_courses')
    .delete()
    .eq('level_id', levelId)
    .eq('course_id', courseId);
  if (error) throw error;
}

// ─── GROUPS ───────────────────────────────────────────────────

export async function createGroup(data: Omit<Group, 'id'>): Promise<Group> {
  const { data: row, error } = await supabase
    .from('groups')
    .insert({
      name: data.name,
      level_id: data.levelId || null,
      instructor_id: data.instructorId || null,
      max_students: data.maxStudents,
      is_active: data.isActive,
    })
    .select()
    .single();
  if (error) throw error;
  return mapGroup(row as Record<string, unknown>);
}

export async function updateGroup(id: string, data: Partial<Omit<Group, 'id'>>): Promise<Group> {
  const dbData: Record<string, unknown> = {};
  if (data.name !== undefined) dbData.name = data.name;
  if (data.levelId !== undefined) dbData.level_id = data.levelId;
  if (data.instructorId !== undefined) dbData.instructor_id = data.instructorId;
  if (data.maxStudents !== undefined) dbData.max_students = data.maxStudents;
  if (data.isActive !== undefined) dbData.is_active = data.isActive;

  const { data: row, error } = await supabase
    .from('groups')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapGroup(row as Record<string, unknown>);
}

export async function deleteGroup(id: string): Promise<void> {
  const { error } = await supabase.from('groups').delete().eq('id', id);
  if (error) throw error;
}

// ─── GROUP STUDENTS ───────────────────────────────────────────

export async function addGroupStudent(groupId: string, studentId: string): Promise<void> {
  const { error } = await supabase
    .from('group_students')
    .insert({ group_id: groupId, student_id: studentId });
  if (error && !error.message.includes('duplicate')) throw error;
}

export async function removeGroupStudent(groupId: string, studentId: string): Promise<void> {
  const { error } = await supabase
    .from('group_students')
    .delete()
    .eq('group_id', groupId)
    .eq('student_id', studentId);
  if (error) throw error;
}

// ─── LECTURES ─────────────────────────────────────────────────

export async function createLecture(data: Omit<Lecture, 'id'>): Promise<Lecture> {
  const { data: row, error } = await supabase
    .from('lectures')
    .insert({
      group_id: data.groupId || null,
      course_id: data.courseId || null,
      instructor_id: data.instructorId || null,
      host_student_id: data.hostStudentId || null,
      title: data.title,
      type: data.type,
      scheduled_time: data.scheduledTime,
      status: data.status,
      meeting_url: data.meetingUrl,
    })
    .select()
    .single();
  if (error) throw error;
  return mapLecture(row as Record<string, unknown>);
}

export async function updateLecture(id: string, data: Partial<Omit<Lecture, 'id'>>): Promise<Lecture> {
  const dbData: Record<string, unknown> = {};
  if (data.groupId !== undefined) dbData.group_id = data.groupId;
  if (data.courseId !== undefined) dbData.course_id = data.courseId;
  if (data.instructorId !== undefined) dbData.instructor_id = data.instructorId;
  if (data.hostStudentId !== undefined) dbData.host_student_id = data.hostStudentId;
  if (data.title !== undefined) dbData.title = data.title;
  if (data.type !== undefined) dbData.type = data.type;
  if (data.scheduledTime !== undefined) dbData.scheduled_time = data.scheduledTime;
  if (data.status !== undefined) dbData.status = data.status;
  if (data.meetingUrl !== undefined) dbData.meeting_url = data.meetingUrl;

  const { data: row, error } = await supabase
    .from('lectures')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapLecture(row as Record<string, unknown>);
}

export async function deleteLecture(id: string): Promise<void> {
  const { error } = await supabase.from('lectures').delete().eq('id', id);
  if (error) throw error;
}

// ─── ATTENDANCE ───────────────────────────────────────────────

export async function upsertAttendance(
  studentId: string,
  lectureId: string,
  status: Attendance['status']
): Promise<Attendance> {
  const { data, error } = await supabase
    .from('attendance')
    .upsert(
      { student_id: studentId, lecture_id: lectureId, status, marked_at: new Date().toISOString() },
      { onConflict: 'student_id,lecture_id' }
    )
    .select()
    .single();
  if (error) throw error;
  return mapAttendance(data as Record<string, unknown>);
}

// ─── ASSIGNMENTS ──────────────────────────────────────────────

export async function createAssignment(
  data: Omit<Assignment, 'id' | 'createdAt'>,
): Promise<Assignment> {
  const { data: row, error } = await supabase
    .from('assignments')
    .insert({
      group_id: data.groupId || null,
      course_id: data.courseId || null,
      title: data.title,
      description: data.description,
      due_date: data.dueDate,
      created_by: data.createdBy || null,
    })
    .select()
    .single();
  if (error) throw error;

  const aId = (row as Record<string, unknown>).id as string;
  let files: AssignmentFile[] = [];

  if (data.files.length > 0) {
    const fileInserts = data.files.map((f) => ({
      assignment_id: aId,
      name: f.name,
      type: f.type,
      size: f.size,
    }));
    await supabase.from('assignment_files').insert(fileInserts);
    files = data.files;
  }

  return mapAssignment(row as Record<string, unknown>, files);
}

export async function updateAssignment(
  id: string,
  data: Partial<Omit<Assignment, 'id' | 'createdAt'>>
): Promise<Assignment> {
  const dbData: Record<string, unknown> = {};
  if (data.groupId !== undefined) dbData.group_id = data.groupId;
  if (data.courseId !== undefined) dbData.course_id = data.courseId;
  if (data.title !== undefined) dbData.title = data.title;
  if (data.description !== undefined) dbData.description = data.description;
  if (data.dueDate !== undefined) dbData.due_date = data.dueDate;

  const { data: row, error } = await supabase
    .from('assignments')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;

  let files: AssignmentFile[] = data.files ?? [];
  if (data.files !== undefined) {
    await supabase.from('assignment_files').delete().eq('assignment_id', id);
    if (data.files.length > 0) {
      await supabase.from('assignment_files').insert(
        data.files.map((f) => ({ assignment_id: id, name: f.name, type: f.type, size: f.size }))
      );
    }
    files = data.files;
  } else {
    const { data: fileRows } = await supabase
      .from('assignment_files')
      .select('*')
      .eq('assignment_id', id);
    files = (fileRows ?? []).map((f) => {
      const fr = f as Record<string, unknown>;
      return { name: fr.name as string, type: (fr.type as string) ?? '', size: (fr.size as string) ?? '' };
    });
  }

  return mapAssignment(row as Record<string, unknown>, files);
}

export async function deleteAssignment(id: string): Promise<void> {
  const { error } = await supabase.from('assignments').delete().eq('id', id);
  if (error) throw error;
}

// ─── SUBMISSIONS ──────────────────────────────────────────────

export async function createSubmission(data: Omit<Submission, 'id' | 'submittedAt'>): Promise<Submission> {
  const { data: row, error } = await supabase
    .from('submissions')
    .insert({
      assignment_id: data.assignmentId,
      student_id: data.studentId,
      file_name: data.fileName,
      file_size: data.fileSize,
    })
    .select()
    .single();
  if (error) throw error;
  return mapSubmission(row as Record<string, unknown>);
}

export async function deleteSubmission(id: string): Promise<void> {
  const { error } = await supabase.from('submissions').delete().eq('id', id);
  if (error) throw error;
}

// ─── GRADES ───────────────────────────────────────────────────

export async function createGrade(data: Omit<Grade, 'id' | 'createdAt'>): Promise<Grade> {
  const { data: row, error } = await supabase
    .from('grades')
    .insert({
      student_id: data.studentId,
      lecture_id: data.lectureId || null,
      assignment_id: data.assignmentId || null,
      type: data.type,
      score: data.score,
      feedback: data.feedback,
      graded_by: data.gradedBy || null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapGrade(row as Record<string, unknown>);
}

export async function updateGrade(id: string, data: Partial<Pick<Grade, 'score' | 'feedback' | 'type'>>): Promise<Grade> {
  const { data: row, error } = await supabase
    .from('grades')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapGrade(row as Record<string, unknown>);
}

export async function deleteGrade(id: string): Promise<void> {
  const { error } = await supabase.from('grades').delete().eq('id', id);
  if (error) throw error;
}

// ─── CHATS ────────────────────────────────────────────────────

export async function sendChat(groupId: string, senderId: string, message: string): Promise<Chat> {
  const { data, error } = await supabase
    .from('chats')
    .insert({ group_id: groupId, sender_id: senderId, message })
    .select()
    .single();
  if (error) throw error;
  return mapChat(data as Record<string, unknown>);
}

export async function loadChats(groupId: string): Promise<Chat[]> {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at');
  if (error) throw error;
  return (data ?? []).map((r) => mapChat(r as Record<string, unknown>));
}

// ─── NOTIFICATIONS ────────────────────────────────────────────

export async function createNotification(data: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Promise<Notification> {
  const { data: row, error } = await supabase
    .from('notifications')
    .insert({
      user_id: data.userId,
      type: data.type,
      title: data.title,
      body: data.body,
    })
    .select()
    .single();
  if (error) throw error;
  return mapNotification(row as Record<string, unknown>);
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId);
  if (error) throw error;
}

export async function loadNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => mapNotification(r as Record<string, unknown>));
}

// ─── VIDEOS ───────────────────────────────────────────────────

export async function createVideo(data: Omit<Video, 'id' | 'createdAt'>): Promise<Video> {
  const { data: row, error } = await supabase
    .from('videos')
    .insert({
      group_id: data.groupId || null,
      course_id: data.courseId || null,
      instructor_id: data.instructorId || null,
      title: data.title,
      description: data.description,
      video_url: data.videoUrl,
      order: data.order,
    })
    .select()
    .single();
  if (error) throw error;
  return mapVideo(row as Record<string, unknown>);
}

export async function updateVideo(id: string, data: Partial<Omit<Video, 'id' | 'createdAt'>>): Promise<Video> {
  const dbData: Record<string, unknown> = {};
  if (data.groupId !== undefined) dbData.group_id = data.groupId;
  if (data.courseId !== undefined) dbData.course_id = data.courseId;
  if (data.instructorId !== undefined) dbData.instructor_id = data.instructorId;
  if (data.title !== undefined) dbData.title = data.title;
  if (data.description !== undefined) dbData.description = data.description;
  if (data.videoUrl !== undefined) dbData.video_url = data.videoUrl;
  if (data.order !== undefined) dbData.order = data.order;

  const { data: row, error } = await supabase
    .from('videos')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return mapVideo(row as Record<string, unknown>);
}

export async function deleteVideo(id: string): Promise<void> {
  const { error } = await supabase.from('videos').delete().eq('id', id);
  if (error) throw error;
}

// ─── REAL-TIME SUBSCRIPTIONS ──────────────────────────────────

export function subscribeToChats(groupId: string, callback: (chat: Chat) => void) {
  return supabase
    .channel(`chats:${groupId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'chats', filter: `group_id=eq.${groupId}` },
      (payload) => callback(mapChat(payload.new as Record<string, unknown>))
    )
    .subscribe();
}

export function subscribeToNotifications(userId: string, callback: (notif: Notification) => void) {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
      (payload) => callback(mapNotification(payload.new as Record<string, unknown>))
    )
    .subscribe();
}

export function subscribeToLectures(callback: (lecture: Lecture) => void) {
  return supabase
    .channel('lectures')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'lectures' },
      (payload) => callback(mapLecture(payload.new as Record<string, unknown>))
    )
    .subscribe();
}
