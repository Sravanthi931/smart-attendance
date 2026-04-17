import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Download, TrendingUp, Users, BookOpen, CheckCircle } from 'lucide-react';

interface ReportData {
  totalUsers: number;
  totalStudents: number;
  totalFaculty: number;
  totalAdmins: number;
  totalSubjects: number;
  totalClasses: number;
  totalAttendance: number;
  avgAttendance: number;
  subjectDistribution: any[];
  departmentStats: any[];
}

export const SystemReports: React.FC = () => {
  const { currentUser } = useAuth();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      if (!currentUser || currentUser.role !== 'admin') return;

      try {
        // Fetch users
        const usersSnap = await getDocs(collection(db, 'users'));
        const totalUsers = usersSnap.size;
        const totalStudents = usersSnap.docs.filter((d) => d.data().role === 'student').length;
        const totalFaculty = usersSnap.docs.filter((d) => d.data().role === 'faculty').length;
        const totalAdmins = usersSnap.docs.filter((d) => d.data().role === 'admin').length;

        // Fetch subjects
        const subjectsSnap = await getDocs(collection(db, 'subjects'));
        const totalSubjects = subjectsSnap.size;
        const subjectDistribution = subjectsSnap.docs.reduce((acc: any, doc) => {
          const dept = doc.data().department || 'Other';
          const existing = acc.find((item: any) => item.name === dept);
          if (existing) {
            existing.value += 1;
          } else {
            acc.push({ name: dept, value: 1 });
          }
          return acc;
        }, []);

        // Fetch classes
        const classesSnap = await getDocs(collection(db, 'classes'));
        const totalClasses = classesSnap.size;

        // Fetch attendance
        const attendanceSnap = await getDocs(collection(db, 'attendance'));
        const totalAttendance = attendanceSnap.size;
        const presentCount = attendanceSnap.docs.filter((d) => d.data().isPresent).length;
        const avgAttendance = totalAttendance > 0 ? ((presentCount / totalAttendance) * 100).toFixed(1) : '0';

        // Department stats
        const departmentStats = subjectsSnap.docs.reduce((acc: any, doc) => {
          const dept = doc.data().department || 'Other';
          const existing = acc.find((item: any) => item.name === dept);
          const students = doc.data().students?.length || 0;
          if (existing) {
            existing.students += students;
            existing.subjects += 1;
          } else {
            acc.push({ name: dept, students, subjects: 1 });
          }
          return acc;
        }, []);

        setReportData({
          totalUsers,
          totalStudents,
          totalFaculty,
          totalAdmins,
          totalSubjects,
          totalClasses,
          totalAttendance,
          avgAttendance: parseFloat(avgAttendance as string),
          subjectDistribution,
          departmentStats,
        });
      } catch (error) {
        console.error('Error fetching reports:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, [currentUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <p className="text-gray-600">No data available</p>
      </div>
    );
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">📊 System Reports</h1>
          <p className="text-gray-600">Complete system analytics and statistics</p>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{reportData.totalUsers}</p>
              </div>
              <div className="bg-blue-100 p-4 rounded-full">
                <Users size={24} className="text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Students</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{reportData.totalStudents}</p>
              </div>
              <div className="bg-green-100 p-4 rounded-full">
                <BookOpen size={24} className="text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-purple-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Subjects</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{reportData.totalSubjects}</p>
              </div>
              <div className="bg-purple-100 p-4 rounded-full">
                <BookOpen size={24} className="text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-orange-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Avg Attendance</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{reportData.avgAttendance}%</p>
              </div>
              <div className="bg-orange-100 p-4 rounded-full">
                <CheckCircle size={24} className="text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-gray-600 text-sm font-medium">Faculty Members</p>
            <p className="text-2xl font-bold text-blue-600 mt-2">{reportData.totalFaculty}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-gray-600 text-sm font-medium">Administrators</p>
            <p className="text-2xl font-bold text-red-600 mt-2">{reportData.totalAdmins}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-gray-600 text-sm font-medium">Total Classes</p>
            <p className="text-2xl font-bold text-green-600 mt-2">{reportData.totalClasses}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6">
            <p className="text-gray-600 text-sm font-medium">Total Attendance Records</p>
            <p className="text-2xl font-bold text-purple-600 mt-2">{reportData.totalAttendance}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Department Distribution */}
          {reportData.subjectDistribution.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Subject Distribution</h2>
              <div className="flex justify-center">
                <ResponsiveContainer width={300} height={300}>
                  <PieChart width={300} height={300}>
                    <Pie
                      data={reportData.subjectDistribution}
                      cx={150}
                      cy={150}
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {reportData.subjectDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Department Stats */}
          {reportData.departmentStats.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Department Statistics</h2>
              <div className="space-y-4">
                {reportData.departmentStats.map((dept, idx) => (
                  <div key={idx} className="border-b pb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-gray-900">{dept.name}</span>
                      <span className="text-sm text-gray-600">{dept.subjects} subjects</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full"
                          style={{ width: `${(dept.students / Math.max(...reportData.departmentStats.map((d: any) => d.students))) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{dept.students} students</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Role Distribution */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">User Role Distribution</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 border rounded-lg">
              <p className="text-4xl font-bold text-green-600">{reportData.totalStudents}</p>
              <p className="text-gray-600 mt-2">Students</p>
              <p className="text-sm text-gray-500 mt-1">
                {((reportData.totalStudents / reportData.totalUsers) * 100).toFixed(1)}% of total
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-4xl font-bold text-blue-600">{reportData.totalFaculty}</p>
              <p className="text-gray-600 mt-2">Faculty</p>
              <p className="text-sm text-gray-500 mt-1">
                {((reportData.totalFaculty / reportData.totalUsers) * 100).toFixed(1)}% of total
              </p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <p className="text-4xl font-bold text-red-600">{reportData.totalAdmins}</p>
              <p className="text-gray-600 mt-2">Admins</p>
              <p className="text-sm text-gray-500 mt-1">
                {((reportData.totalAdmins / reportData.totalUsers) * 100).toFixed(1)}% of total
              </p>
            </div>
          </div>
        </div>

        {/* Download Button */}
        <div className="flex justify-end">
          <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg">
            <Download size={20} />
            Export Report
          </button>
        </div>
      </div>
    </div>
  );
};
