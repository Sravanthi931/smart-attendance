import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  Timestamp,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';

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
  const [overallPercentage, setOverallPercentage] = useState(0);

  // Calculate attendance for last 30 days
  const getLast30DaysDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return Timestamp.fromDate(date);
  };

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
            setOverallPercentage(0);
            setLoading(false);
          }
          return;
        }

        const last30Days = getLast30DaysDate();
        const attendanceData: SubjectAttendance[] = [];
        let totalClasses = 0;
        let totalAttended = 0;

        // Set up real-time listeners for each subject's attendance
        for (const subjectDoc of subjectsSnap.docs) {
          const subjectData = subjectDoc.data();

          // Real-time listener for attendance records
          const attendanceQuery = query(
            collection(db, 'attendance'),
            where('classId', '==', subjectDoc.id),
            where('studentId', '==', currentUser.uid),
            where('date', '>=', last30Days) // Filter by last 30 days
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
                      percentage: totalCount > 0 ? (presentCount / totalCount) * 100 : 0,
                    }
                  : s
              );

              // Recalculate overall percentage
              const newTotalClasses = updated.reduce((sum, s) => sum + s.totalClasses, 0);
              const newTotalAttended = updated.reduce((sum, s) => sum + s.classesAttended, 0);
              setOverallPercentage(
                newTotalClasses > 0 ? (newTotalAttended / newTotalClasses) * 100 : 0
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
          const totalCount = attendanceSnap.size;

          totalClasses += totalCount;
          totalAttended += presentCount;

          attendanceData.push({
            subjectId: subjectDoc.id,
            subjectName: subjectData.name,
            subjectCode: subjectData.code,
            totalClasses: totalCount,
            classesAttended: presentCount,
            percentage: totalCount > 0 ? (presentCount / totalCount) * 100 : 0,
          });
        }

        if (isMounted) {
          setSubjectAttendance(attendanceData);
          if (totalClasses > 0) {
            setOverallPercentage((totalAttended / totalClasses) * 100);
          }
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
    missed: subject.totalClasses - subject.classesAttended,
  }));

  const pieData = [
    { name: 'Present', value: Math.round(overallPercentage) },
    { name: 'Absent', value: 100 - Math.round(overallPercentage) },
  ];

  const COLORS = ['#10b981', '#ef4444'];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Your Attendance</h1>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Overall Stats</h2>
            <div className="flex items-center justify-center h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">
                {overallPercentage.toFixed(1)}%
              </p>
              <p className="text-gray-600 mt-2">Overall Attendance</p>
            </div>
          </div>

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
                <span className="text-gray-600">Total Classes:</span>
                <span className="text-2xl font-bold text-blue-600">
                  {subjectAttendance.reduce((sum, s) => sum + s.totalClasses, 0)}
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
                    (sum, s) => sum + (s.totalClasses - s.classesAttended),
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
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">
                  Subject
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">
                  Code
                </th>
                <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">
                  Total Classes
                </th>
                <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">
                  Attended
                </th>
                <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">
                  Percentage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {subjectAttendance.map((subject) => (
                <tr key={subject.subjectId} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {subject.subjectName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {subject.subjectCode}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-center">
                    {subject.totalClasses}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-center">
                    {subject.classesAttended}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
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
