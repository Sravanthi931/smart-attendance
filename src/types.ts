export type UserRole = 'student' | 'faculty' | 'admin';

export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  enrollmentNumber?: string;
  department?: string;
  createdAt: Date;
}

export interface AttendanceRecord {
  id: string;
  classId: string;
  studentId: string;
  date: Date;
  isPresent: boolean;
  markedAt: Date;
}

export interface ClassSession {
  id: string;
  facultyId: string;
  subjectName: string;
  className: string;
  date: Date;
  qrCode: string;
  totalStudents: number;
  presentCount: number;
  students: string[];
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  facultyId: string;
  semester: number;
  department: string;
  students: string[];
}

export interface AttendanceSummary {
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  totalClasses: number;
  classesAttended: number;
  percentage: number;
}
