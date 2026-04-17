import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BarChart3, Users, Calendar, TrendingUp, Book } from 'lucide-react';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';

interface StatCard {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

interface SubjectData {
  id: string;
  name: string;
  code: string;
  students?: string[];
  facultyId?: string;
}

export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<StatCard[]>([]);
  const [subjects, setSubjects] = useState<SubjectData[]>([]);
  const [loading, setLoading] = useState(true);

  // Get attendance from last 30 days
  const getLast30DaysDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return Timestamp.fromDate(date);
  };

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const fetchStats = async () => {
      if (!currentUser) return;

      try {
        if (currentUser.role === 'student') {
          // Fetch student attendance stats for last 30 days
          const subjectsQuery = query(
            collection(db, 'subjects'),
            where('students', 'array-contains', currentUser.uid)
          );
          const subjectsSnap = await getDocs(subjectsQuery);
          setSubjects(subjectsSnap.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            code: doc.data().code,
            students: doc.data().students,
          })));

          let totalClasses = 0;
          let presentCount = 0;
          const last30Days = getLast30DaysDate();

          for (const subjectDoc of subjectsSnap.docs) {
            const classesQuery = query(
              collection(db, 'attendance'),
              where('studentId', '==', currentUser.uid),
              where('classId', '==', subjectDoc.id),
              where('date', '>=', last30Days)
            );
            const classesSnap = await getDocs(classesQuery);
            totalClasses += classesSnap.docs.length;
            presentCount += classesSnap.docs.filter(
              (d) => d.data().isPresent
            ).length;
          }

          setStats([
            {
              label: 'Enrolled Subjects',
              value: subjectsSnap.size,
              icon: <BookIcon />,
              color: 'bg-blue-100 text-blue-600',
            },
            {
              label: 'Total Classes (30 days)',
              value: totalClasses,
              icon: <Calendar size={24} />,
              color: 'bg-green-100 text-green-600',
            },
            {
              label: 'Classes Attended',
              value: presentCount,
              icon: <TrendingUp size={24} />,
              color: 'bg-purple-100 text-purple-600',
            },
            {
              label: 'Attendance %',
              value:
                totalClasses > 0
                  ? ((presentCount / totalClasses) * 100).toFixed(1) + '%'
                  : '0%',
              icon: <BarChart3 size={24} />,
              color: 'bg-yellow-100 text-yellow-600',
            },
          ]);
        } else if (currentUser.role === 'faculty') {
          // Fetch faculty stats
          const subjectsQuery = query(
            collection(db, 'subjects'),
            where('facultyId', '==', currentUser.uid)
          );
          const subjectsSnap = await getDocs(subjectsQuery);
          setSubjects(subjectsSnap.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            code: doc.data().code,
            students: doc.data().students,
            facultyId: doc.data().facultyId,
          })));

          const classesQuery = query(
            collection(db, 'classes'),
            where('facultyId', '==', currentUser.uid)
          );
          const classesSnap = await getDocs(classesQuery);

          setStats([
            {
              label: 'Subjects Teaching',
              value: subjectsSnap.size,
              icon: <BookIcon />,
              color: 'bg-blue-100 text-blue-600',
            },
            {
              label: 'Total Classes',
              value: classesSnap.size,
              icon: <Calendar size={24} />,
              color: 'bg-green-100 text-green-600',
            },
            {
              label: 'Students',
              value: subjectsSnap.docs.reduce(
                (sum, doc) => sum + (doc.data().students?.length || 0),
                0
              ),
              icon: <Users size={24} />,
              color: 'bg-purple-100 text-purple-600',
            },
          ]);
        } else if (currentUser.role === 'admin') {
          // Fetch admin stats - all subjects
          const subjectsQuery = collection(db, 'subjects');
          const subjectsSnap = await getDocs(subjectsQuery);
          setSubjects(subjectsSnap.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            code: doc.data().code,
            students: doc.data().students,
            facultyId: doc.data().facultyId,
          })));

          const usersQuery = collection(db, 'users');
          const usersSnap = await getDocs(usersQuery);

          const studentsCount = usersSnap.docs.filter(
            (d) => d.data().role === 'student'
          ).length;
          const facultyCount = usersSnap.docs.filter(
            (d) => d.data().role === 'faculty'
          ).length;

          setStats([
            {
              label: 'Total Users',
              value: usersSnap.size,
              icon: <Users size={24} />,
              color: 'bg-blue-100 text-blue-600',
            },
            {
              label: 'Students',
              value: studentsCount,
              icon: <BookIcon />,
              color: 'bg-green-100 text-green-600',
            },
            {
              label: 'Faculty',
              value: facultyCount,
              icon: <BarChart3 size={24} />,
              color: 'bg-purple-100 text-purple-600',
            },
          ]);
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome, {currentUser?.displayName}! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Here's your attendance overview at a glance
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
              >
                <div className={`${stat.color} w-12 h-12 rounded-lg flex items-center justify-center mb-4`}>
                  {stat.icon}
                </div>
                <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        )}

        {currentUser?.role === 'student' && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="/enroll-subjects"
                className="bg-gradient-to-br from-indigo-600 to-blue-600 text-white p-6 rounded-xl hover:from-indigo-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <h3 className="text-lg font-bold">📖 Enroll in Subjects</h3>
                <p className="text-indigo-100 mt-2">Browse and enroll in available subjects</p>
              </a>
              <a
                href="/attendance"
                className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white p-6 rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <h3 className="text-lg font-bold">📊 View Attendance</h3>
                <p className="text-blue-100 mt-2">Check your attendance across subjects</p>
              </a>
              <a
                href="/ai-summary"
                className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white p-6 rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <h3 className="text-lg font-bold">🤖 AI Summary</h3>
                <p className="text-purple-100 mt-2">Get AI-powered insights about your attendance</p>
              </a>
            </div>
          </div>
        )}

        {currentUser?.role === 'faculty' && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="/mark-attendance"
                className="bg-gradient-to-br from-green-600 to-emerald-600 text-white p-6 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <h3 className="text-lg font-bold">✅ Mark Attendance</h3>
                <p className="text-green-100 mt-2">Mark attendance for your class</p>
              </a>
              <a
                href="/class-reports"
                className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <h3 className="text-lg font-bold">📊 Class Reports</h3>
                <p className="text-blue-100 mt-2">View attendance statistics for your classes</p>
              </a>
            </div>
          </div>
        )}

        {currentUser?.role === 'admin' && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="/manage-users"
                className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-6 rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <h3 className="text-lg font-bold">👥 Manage Users</h3>
                <p className="text-blue-100 mt-2">Add, edit, or remove users</p>
              </a>
              <a
                href="/manage-subjects"
                className="bg-gradient-to-br from-green-600 to-emerald-600 text-white p-6 rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <h3 className="text-lg font-bold">📚 Manage Subjects</h3>
                <p className="text-green-100 mt-2">Create and manage subjects</p>
              </a>
              <a
                href="/system-reports"
                className="bg-gradient-to-br from-purple-600 to-pink-600 text-white p-6 rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                <h3 className="text-lg font-bold">📊 System Reports</h3>
                <p className="text-purple-100 mt-2">View system-wide analytics</p>
              </a>
            </div>
          </div>
        )}

        {/* Subjects Section */}
        {subjects.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {currentUser?.role === 'student' && '📚 Your Enrolled Subjects'}
              {currentUser?.role === 'faculty' && '📚 Subjects You Teach'}
              {currentUser?.role === 'admin' && '📚 All Subjects in System'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border-l-4 border-blue-600"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{subject.name}</h3>
                      <p className="text-sm text-gray-600">Code: {subject.code}</p>
                    </div>
                    <Book size={28} className="text-blue-600 opacity-70" />
                  </div>
                  <hr className="my-4" />
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 text-sm">Students Enrolled:</span>
                      <span className="font-bold text-blue-600">{subject.students?.length || 0}</span>
                    </div>
                    {currentUser?.role === 'student' && (
                      <a
                        href="/attendance"
                        className="block mt-4 text-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm font-medium"
                      >
                        View Attendance →
                      </a>
                    )}
                    {currentUser?.role === 'faculty' && (
                      <a
                        href="/mark-attendance"
                        className="block mt-4 text-center px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition text-sm font-medium"
                      >
                        Mark Attendance →
                      </a>
                    )}
                    {currentUser?.role === 'admin' && (
                      <a
                        href="/manage-subjects"
                        className="block mt-4 text-center px-4 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition text-sm font-medium"
                      >
                        Manage Subject →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const BookIcon = () => (
  <svg
    className="w-6 h-6"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747m0-13c5.5 0 10 4.745 10 10.747S17.5 27.747 12 27.747"
    />
  </svg>
);
