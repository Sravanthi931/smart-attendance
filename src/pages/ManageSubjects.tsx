import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
} from 'firebase/firestore';
import { Trash2, Plus, BookOpen } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  code: string;
  facultyId: string;
  facultyName?: string;
  semester: number;
  department: string;
  students: string[];
}

interface User {
  uid: string;
  displayName: string;
}

export const ManageSubjects: React.FC = () => {
  const { currentUser } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    facultyId: '',
    semester: 1,
    department: '',
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser || currentUser.role !== 'admin') return;

      try {
        // Fetch subjects
        const subjectsSnap = await getDocs(collection(db, 'subjects'));
        const subjectsData = subjectsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Subject[];

        // Fetch users
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersData = usersSnap.docs
          .filter((doc) => doc.data().role === 'faculty')
          .map((doc) => ({
            uid: doc.id,
            displayName: doc.data().displayName,
          }));

        setSubjects(subjectsData);
        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.name ||
      !formData.code ||
      !formData.facultyId ||
      !formData.department
    ) {
      alert('Please fill in all fields');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'subjects'), {
        ...formData,
        students: [],
        createdAt: new Date(),
      });

      setSubjects((prev) => [
        ...prev,
        {
          id: docRef.id,
          ...formData,
          students: [],
          facultyName: users.find((u) => u.uid === formData.facultyId)?.displayName,
        },
      ]);

      setFormData({
        name: '',
        code: '',
        facultyId: '',
        semester: 1,
        department: '',
      });
      setShowForm(false);
      alert('Subject created successfully!');
    } catch (error) {
      console.error('Error adding subject:', error);
      alert('Failed to create subject');
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    if (!window.confirm('Are you sure you want to delete this subject?')) return;

    try {
      await deleteDoc(doc(db, 'subjects', subjectId));
      setSubjects((prev) => prev.filter((s) => s.id !== subjectId));
    } catch (error) {
      console.error('Error deleting subject:', error);
      alert('Failed to delete subject');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">📚 Manage Subjects</h1>
            <p className="text-gray-600">Create and manage all subjects in the system</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg font-semibold"
          >
            <Plus size={20} />
            Add Subject
          </button>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-10 border-t-4 border-indigo-600">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <p className="text-4xl font-bold text-indigo-600">{subjects.length}</p>
              <p className="text-gray-600 mt-2">Total Subjects</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-blue-600">{subjects.reduce((sum, s) => sum + (s.students?.length || 0), 0)}</p>
              <p className="text-gray-600 mt-2">Total Enrollments</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-green-600">{new Set(subjects.map(s => s.department)).size}</p>
              <p className="text-gray-600 mt-2">Departments</p>
            </div>
            <div className="text-center">
              <p className="text-4xl font-bold text-purple-600">{new Set(subjects.map(s => s.facultyId)).size}</p>
              <p className="text-gray-600 mt-2">Faculty Members</p>
            </div>
          </div>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-10 border-t-4 border-green-600 animate-slideIn">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Subject</h2>
            <form onSubmit={handleAddSubject} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Subject Name</label>
                <input
                  type="text"
                  placeholder="e.g., Data Structures"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Subject Code</label>
                <input
                  type="text"
                  placeholder="e.g., CS201"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Department</label>
                <input
                  type="text"
                  placeholder="e.g., Computer Science"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Semester</label>
                <input
                  type="number"
                  min="1"
                  max="8"
                  value={formData.semester}
                  onChange={(e) =>
                    setFormData({ ...formData, semester: parseInt(e.target.value) })
                  }
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-900 mb-2">Faculty Member</label>
                <select
                  value={formData.facultyId}
                  onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all"
                >
                  <option value="">-- Select Faculty --</option>
                  {users.map((user) => (
                    <option key={user.uid} value={user.uid}>
                      {user.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex gap-4">
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all font-semibold shadow-lg"
                >
                  Create Subject
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setFormData({ name: '', code: '', facultyId: '', semester: 1, department: '' });
                  }}
                  className="flex-1 px-6 py-3 bg-gray-300 text-gray-900 rounded-lg hover:bg-gray-400 transition-all font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Subjects Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Code</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Faculty</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Department</th>
                  <th className="px-6 py-4 text-center text-sm font-bold">Semester</th>
                  <th className="px-6 py-4 text-center text-sm font-bold">Students</th>
                  <th className="px-6 py-4 text-center text-sm font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {subjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                      {subject.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 font-medium">{subject.code}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {users.find((u) => u.uid === subject.facultyId)?.displayName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {subject.department}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-center font-semibold">
                      {subject.semester}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        {subject.students?.length || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => handleDeleteSubject(subject.id)}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold mx-auto"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {subjects.length === 0 && (
            <div className="p-12 text-center">
              <BookOpen size={48} className="text-gray-300 mx-auto mb-4" />
              <p className="text-lg text-gray-600">No subjects created yet</p>
              <p className="text-sm text-gray-500 mt-2">Click "Add Subject" button to create your first subject</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
