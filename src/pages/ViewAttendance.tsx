import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CheckCircle, XCircle } from 'lucide-react';

interface SubjectAttendance {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  totalClasses: number;
  classesAttended: number;
  percentage: number;
}

export const ViewAttendance: React.FC = () => {
  const { currentUser } = useAuth();
  const [subjectAttendance, setSubjectAttendance] = useState<SubjectAttendance[]>([]);
  const [loading, setLoading] = useState(true);

  const TOTAL_CLASSES = 30; // Fixed total classes per subject

  // Calculate attendance for all records (no time limit)
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    const unsubscribers: (() => void)[] = [];

    const fetchAttendance = async () => {
      try {
        // Get all subjects where student is enrolled
        const subjectsQuery = query(
          collection(db, 'subjects'),
          where('students', 'array-contains', currentUser.uid)
        );
        const subjectsSnap = await getDocs(subjectsQuery);

        if (subjectsSnap.empty) {
          if (isMounted) {
            setSubjectAttendance([]);
            setLoading(false);
          }
          return;
        }

        const attendanceData: SubjectAttendance[] = [];

        // Set up real-time listeners for each subject's attendance
        for (const subjectDoc of subjectsSnap.docs) {
          const subjectData = subjectDoc.data();

          // Real-time listener for attendance records - no date filter
          const attendanceQuery = query(
            collection(db, 'attendance'),
            where('classId', '==', subjectDoc.id),
            where('studentId', '==', currentUser.uid)
          );

          // eslint-disable-next-line no-loop-func
          const unsubscribe = onSnapshot(attendanceQuery, (attendanceSnap) => {
            if (!isMounted) return;

            const presentCount = attendanceSnap.docs.filter(
              (d) => d.data().isPresent
            ).length;
            const totalCount = attendanceSnap.size;

            // Update the specific subject's attendance data
            setSubjectAttendance((prev) => {
              const updated = prev.map((s) =>
                s.subjectId === subjectDoc.id
                  ? {
                      ...s,
                      totalClasses: totalCount,
                      classesAttended: presentCount,
                      percentage: TOTAL_CLASSES > 0 ? (presentCount / TOTAL_CLASSES) * 100 : 0,
                    }
                  : s
              );

              return updated;
            });
          });

          unsubscribers.push(unsubscribe);

          // Get initial data
          const attendanceSnap = await getDocs(attendanceQuery);
          const presentCount = attendanceSnap.docs.filter(
            (d) => d.data().isPresent
          ).length;

          attendanceData.push({
            subjectId: subjectDoc.id,
            subjectName: subjectData.name,
            subjectCode: subjectData.code,
            totalClasses: presentCount,
            classesAttended: presentCount,
            percentage: (presentCount / TOTAL_CLASSES) * 100,
          });
        }

        if (isMounted) {
          setSubjectAttendance(attendanceData);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching attendance:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAttendance();

    return () => {
      isMounted = false;
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [currentUser]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (subjectAttendance.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Attendance</h1>
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">No Subjects Enrolled</h2>
            <p className="text-gray-600 mb-4">You are not enrolled in any subjects yet.</p>
            <p className="text-gray-600 mb-6">
              Go to "Enroll Subjects" to enroll in available subjects and start tracking your attendance.
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href="/enroll-subjects"
                className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
              >
                Enroll in Subjects
              </a>
              <a
                href="/dashboard"
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Back to Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const chartData = subjectAttendance.map((subject) => ({
    name: subject.subjectCode,
    attended: subject.classesAttended,
    missed: TOTAL_CLASSES - subject.classesAttended,
  }));

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Attendance</h1>

        {/* Summary Section */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Subjects:</span>
                <span className="text-2xl font-bold text-blue-600">
                  {subjectAttendance.length}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Classes (Expected):</span>
                <span className="text-2xl font-bold text-blue-600">
                  {subjectAttendance.length * TOTAL_CLASSES}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Classes Attended:</span>
                <span className="text-2xl font-bold text-green-600">
                  {subjectAttendance.reduce((sum, s) => sum + s.classesAttended, 0)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Classes Missed:</span>
                <span className="text-2xl font-bold text-red-600">
                  {subjectAttendance.reduce(
                    (sum, s) => sum + (TOTAL_CLASSES - s.classesAttended),
                    0
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Attendance By Subject</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="attended" stackId="a" fill="#10b981" name="Attended" />
              <Bar dataKey="missed" stackId="a" fill="#ef4444" name="Missed" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Subject Details Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-white">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold text-white">
                  Code
                </th>
                <th className="px-6 py-3 text-center text-sm font-bold text-white">
                  Max Classes
                </th>
                <th className="px-6 py-3 text-center text-sm font-bold text-white">
                  Attended
                </th>
                <th className="px-6 py-3 text-center text-sm font-bold text-white">
                  Missed
                </th>
                <th className="px-6 py-3 text-center text-sm font-bold text-white">
                  Attendance %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {subjectAttendance.map((subject) => (
                <tr key={subject.subjectId} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                    {subject.subjectName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                    {subject.subjectCode}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-center font-bold">
                    {TOTAL_CLASSES}
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full font-semibold">
                      <CheckCircle size={16} />
                      {subject.classesAttended}/{TOTAL_CLASSES}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-center">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full font-semibold">
                      <XCircle size={16} />
                      {TOTAL_CLASSES - subject.classesAttended}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${
                        subject.percentage >= 75
                          ? 'bg-green-100 text-green-800'
                          : subject.percentage >= 60
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {subject.percentage.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {subjectAttendance.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">
              No attendance records found. You may not be enrolled in any subjects yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
