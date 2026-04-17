import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
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
  LineChart,
  Line,
} from 'recharts';
import { Download } from 'lucide-react';

interface ClassReportData {
  date: string;
  present: number;
  absent: number;
  total: number;
  percentage: number;
}

interface StudentReportData {
  studentName: string;
  enrollmentNumber: string;
  totalClasses: number;
  classesAttended: number;
  percentage: number;
}

export const ClassReports: React.FC = () => {
  const { currentUser } = useAuth();
  const [classReports, setClassReports] = useState<ClassReportData[]>([]);
  const [studentReports, setStudentReports] = useState<StudentReportData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      if (!currentUser || currentUser.role !== 'faculty') return;

      try {
        // Get all classes for this faculty
        const classesQuery = query(
          collection(db, 'attendance'),
          where('facultyId', '==', currentUser.uid)
        );
        const classesSnap = await getDocs(classesQuery);

        // Group by date
        const dateMap = new Map<string, { present: number; absent: number }>();

        classesSnap.docs.forEach((doc) => {
          const data = doc.data();
          const date = new Date(data.date.toDate()).toLocaleDateString();

          if (!dateMap.has(date)) {
            dateMap.set(date, { present: 0, absent: 0 });
          }

          const current = dateMap.get(date)!;
          if (data.isPresent) {
            current.present++;
          } else {
            current.absent++;
          }
        });

        const reportData: ClassReportData[] = Array.from(dateMap).map(
          ([date, stats]) => ({
            date,
            present: stats.present,
            absent: stats.absent,
            total: stats.present + stats.absent,
            percentage: (stats.present / (stats.present + stats.absent)) * 100,
          })
        );

        setClassReports(reportData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));

        // Fetch student reports
        const subjectsQuery = query(
          collection(db, 'subjects'),
          where('facultyId', '==', currentUser.uid)
        );
        const subjectsSnap = await getDocs(subjectsQuery);

        const studentMap = new Map<string, StudentReportData>();

        for (const subjectDoc of subjectsSnap.docs) {
          const subjectData = subjectDoc.data();

          for (const studentId of subjectData.students || []) {
            const userSnap = await getDocs(
              query(collection(db, 'users'), where('uid', '==', studentId))
            );

            if (!userSnap.empty) {
              const userData = userSnap.docs[0].data();

              const attendanceQuery = query(
                collection(db, 'attendance'),
                where('classId', '==', subjectDoc.id),
                where('studentId', '==', studentId)
              );
              const attendanceSnap = await getDocs(attendanceQuery);

              const presentCount = attendanceSnap.docs.filter(
                (d) => d.data().isPresent
              ).length;
              const totalCount = attendanceSnap.size;

              if (!studentMap.has(studentId)) {
                studentMap.set(studentId, {
                  studentName: userData.displayName,
                  enrollmentNumber: userData.enrollmentNumber || 'N/A',
                  totalClasses: 0,
                  classesAttended: 0,
                  percentage: 0,
                });
              }

              const current = studentMap.get(studentId)!;
              current.totalClasses += totalCount;
              current.classesAttended += presentCount;
              current.percentage = (current.classesAttended / current.totalClasses) * 100;
            }
          }
        }

        setStudentReports(Array.from(studentMap.values()));
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [currentUser]);

  const downloadReport = () => {
    let csvContent =
      'Date,Present,Absent,Total,Percentage\n';
    classReports.forEach((record) => {
      csvContent += `${record.date},${record.present},${record.absent},${record.total},${record.percentage.toFixed(2)}%\n`;
    });

    const element = document.createElement('a');
    const file = new Blob([csvContent], { type: 'text/csv' });
    element.href = URL.createObjectURL(file);
    element.download = `class-report-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Class Reports</h1>
          <button
            onClick={downloadReport}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Download size={18} />
            Download Report
          </button>
        </div>

        {/* Attendance Trend Chart */}
        {classReports.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Attendance Trend</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={classReports}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  stroke="#10b981"
                  name="Attendance %"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Class Stats Chart */}
        {classReports.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Class Statistics</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={classReports}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="present" stackId="a" fill="#10b981" name="Present" />
                <Bar dataKey="absent" stackId="a" fill="#ef4444" name="Absent" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Student Attendance Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">Student Attendance Details</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">
                  Student Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">
                  Enrollment No.
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
              {studentReports.map((student, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {student.studentName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {student.enrollmentNumber}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-center">
                    {student.totalClasses}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-center">
                    {student.classesAttended}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                        student.percentage >= 75
                          ? 'bg-green-100 text-green-800'
                          : student.percentage >= 60
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {student.percentage.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {studentReports.length === 0 && (
            <div className="p-8 text-center text-gray-600">
              No student data available yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
