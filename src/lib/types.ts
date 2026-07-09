export type UserRole = 'admin' | 'instructor' | 'student';
export type LevelCategory = 'general' | 'managers' | 'proposal' | 'sisters';
export type LectureType = 'online_discussion' | 'recorded';
export type LectureStatus = 'scheduled' | 'live' | 'completed' | 'cancelled';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export type GradeType = 'participation' | 'presentation' | 'communication' | 'leadership' | 'assignment';
export type NotificationType = 'lecture' | 'grade' | 'assignment' | 'system';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  levelId: string | null;
  photo: string | null;
  isActive: boolean;
  rank: string;
  background: string;
  about: string;
  contacts: { email: string; phone: string; office: string };
}

export interface Level {
  id: string;
  name: string;
  category: LevelCategory;
  description: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
}

export interface LevelCourse {
  levelId: string;
  courseId: string;
}

export interface Group {
  id: string;
  name: string;
  levelId: string;
  instructorId: string;
  maxStudents: number;
  isActive: boolean;
}

export interface GroupStudent {
  groupId: string;
  studentId: string;
}

export interface Lecture {
  id: string;
  groupId: string;
  courseId: string;
  instructorId: string;
  hostStudentId: string | null;
  title: string;
  type: LectureType;
  scheduledTime: string;
  status: LectureStatus;
  meetingUrl: string;
}

export interface Attendance {
  id: string;
  studentId: string;
  lectureId: string;
  status: AttendanceStatus;
  markedAt: string;
}

export interface AssignmentFile {
  name: string;
  type: string;
  size: string;
  storagePath?: string | null;
  mimeType?: string | null;
}

export interface Assignment {
  id: string;
  groupId: string;
  courseId: string;
  title: string;
  description: string;
  dueDate: string;
  createdBy: string;
  createdAt: string;
  files: AssignmentFile[];
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  fileName: string;
  fileSize: string;
  storagePath?: string | null;
  mimeType?: string | null;
  submittedAt: string;
}

export interface Grade {
  id: string;
  studentId: string;
  lectureId: string | null;
  assignmentId: string | null;
  type: GradeType;
  score: number;
  feedback: string;
  gradedBy: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  groupId: string;
  senderId: string;
  message: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface Video {
  id: string;
  groupId: string;
  courseId: string;
  instructorId: string;
  title: string;
  description: string;
  videoUrl: string;
  order: number;
  createdAt: string;
}

export type LearningMaterialKind = "file" | "link";

export type LearningMaterialFileType =
  | "pdf"
  | "pptx"
  | "docx"
  | "image"
  | "video"
  | "audio"
  | "link"
  | "other";

export interface LearningMaterial {
  id: string;
  groupId: string;
  courseId: string;
  instructorId: string;
  title: string;
  description: string;
  kind: LearningMaterialKind;
  fileType: LearningMaterialFileType;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  storagePath: string | null;
  externalUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppData {
  users: AppUser[];
  levels: Level[];
  courses: Course[];
  levelCourses: LevelCourse[];
  groups: Group[];
  groupStudents: GroupStudent[];
  lectures: Lecture[];
  attendance: Attendance[];
  assignments: Assignment[];
  submissions: Submission[];
  grades: Grade[];
  chats: Chat[];
  notifications: Notification[];
  videos: Video[];
  learningMaterials: LearningMaterial[];
}

// Supabase Database type definition
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: Record<string, { Row: Record<string, any>; Insert: Record<string, any>; Update: Record<string, any>; Relationships: any[] }>;
    Views: Record<string, never>;
    Functions: {
      get_user_role: { Args: Record<string, never>; Returns: string };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};




