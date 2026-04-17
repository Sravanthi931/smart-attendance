import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { BookOpen, CheckCircle, XCircle } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  code: string;
  department: string;
  semester: number;
  facultyId: string;
  facultyName?: string;
  students: string[];
  isEnrolled: boolean;
}

export const EnrollSubjects: React.FC = () => {
  const { currentUser } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string>('');
  const [filterDept, setFilterDept] = useState<string>('');
  const [filterSem, setFilterSem] = useState<number | string>('');
  const [departments, setDepartments] = useState<string[]>([]);

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!currentUser) return;

      try {
        // Fetch all subjects
        const subjectsSnap = await getDocs(collection(db, 'subjects'));

        // Fetch faculty names
        const usersSnap = await getDocs(collection(db, 'users'));
        const facultyMap = new Map();
        usersSnap.docs.forEach((doc) => {
          if (doc.data().role === 'faculty') {
            facultyMap.set(doc.id, doc.data().displayName);
          }
        });

        const subjectsData = subjectsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          facultyName: facultyMap.get(doc.data().facultyId),
          isEnrolled: doc.data().students?.includes(currentUser.uid) || false,
        })) as Subject[];

        // Extract unique departments
        const depts = Array.from(new Set(subjectsData.map((s) => s.department)));
        setDepartments(depts.sort());

        setSubjects(subjectsData.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error('Error fetching subjects:', error);
        alert('Failed to load subjects');
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [currentUser]);

  const handleEnroll = async (subjectId: string, isEnrolled: boolean) => {
    if (!currentUser) return;

    setEnrolling(subjectId);
    try {
      const subjectRef = doc(db, 'subjects', subjectId);
      const subject = subjects.find((s) => s.id === subjectId);

      if (!subject) return;

      let updatedStudents: string[];
      if (isEnrolled) {
        // Unenroll
        updatedStudents = subject.students.filter((id) => id !== currentUser.uid);
      } else {
        // Enroll
        updatedStudents = [...subject.students, currentUser.uid];
      }

      await updateDoc(subjectRef, {
        students: updatedStudents,
      });

      // Update local state
      setSubjects((prev) =>
        prev.map((s) =>
          s.id === subjectId
            ? { ...s, students: updatedStudents, isEnrolled: !isEnrolled }
            : s
        )
      );

      const action = isEnrolled ? 'Unenrolled from' : 'Enrolled in';
      alert(`${action} ${subject.name} successfully!`);
    } catch (error) {
      console.error('Error updating enrollment:', error);
      alert('Failed to update enrollment');
    } finally {
      setEnrolling('');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const filteredSubjects = subjects.filter((subject) => {
    if (filterDept && subject.department !== filterDept) return false;
    if (filterSem && subject.semester !== parseInt(filterSem.toString())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">📚 Available Subjects</h1>
            <p className="text-gray-600">Browse and enroll in subjects offered this semester</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-10 border-t-4 border-indigo-600">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-indigo-600">{subjects.length}</p>
              <p className="text-gray-600 mt-2">Total Subjects</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">
                {subjects.filter((s) => s.isEnrolled).length}
              </p>
              <p className="text-gray-600 mt-2">Enrolled</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">
                {subjects.filter((s) => !s.isEnrolled).length}
              </p>
              <p className="text-gray-600 mt-2">Available to Enroll</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-t-4 border-green-600">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Department
              </label>
              <select
                value={filterDept}
                onChange={(e) => setFilterDept(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              >
                <option value="">-- All Departments --</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Semester
              </label>
              <select
                value={filterSem}
                onChange={(e) => setFilterSem(e.target.value)}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              >
                <option value="">-- All Semesters --</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <option key={sem} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Subjects Grid */}
        {filteredSubjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubjects.map((subject) => (
              <div
                key={subject.id}
                className={`bg-white rounded-xl shadow-lg p-6 border-l-4 transition-all transform hover:shadow-xl hover:-translate-y-1 ${
                  subject.isEnrolled
                    ? 'border-green-600 bg-green-50'
                    : 'border-blue-600 bg-white'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{subject.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">Code: {subject.code}</p>
                  </div>
                  {subject.isEnrolled && (
                    <CheckCircle size={28} className="text-green-600 flex-shrink-0 ml-2" />
                  )}
                </div>

                <hr className="my-4" />

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Faculty:</span>
                    <span className="font-semibold text-gray-900">{subject.facultyName || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Department:</span>
                    <span className="font-semibold text-gray-900">{subject.department}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Semester:</span>
                    <span className="font-semibold text-gray-900">{subject.semester}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Enrolled Students:</span>
                    <span className="font-semibold text-blue-600">{subject.students.length}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleEnroll(subject.id, subject.isEnrolled)}
                  disabled={enrolling === subject.id}
                  className={`w-full py-3 px-4 rounded-lg font-bold transition-all ${
                    subject.isEnrolled
                      ? 'bg-red-100 text-red-700 hover:bg-red-200'
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700'
                  } disabled:opacity-50`}
                >
                  {enrolling === subject.id ? (
                    <span>Processing...</span>
                  ) : subject.isEnrolled ? (
                    <span className="flex items-center justify-center gap-2">
                      <XCircle size={18} /> Unenroll
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle size={18} /> Enroll
                    </span>
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <BookOpen size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-lg text-gray-600">No subjects match your filters</p>
            <p className="text-sm text-gray-500 mt-2">Try adjusting your filters to see available subjects</p>
          </div>
        )}
      </div>
    </div>
  );
};
