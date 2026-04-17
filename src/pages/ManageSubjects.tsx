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
import { Trash2, Plus } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Manage Subjects</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus size={20} />
            Add Subject
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Subject</h2>
            <form onSubmit={handleAddSubject} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Subject Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Subject Code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Semester"
                value={formData.semester}
                onChange={(e) =>
                  setFormData({ ...formData, semester: parseInt(e.target.value) })
                }
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={formData.facultyId}
                onChange={(e) => setFormData({ ...formData, facultyId: e.target.value })}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent md:col-span-2"
              >
                <option value="">Select Faculty</option>
                {users.map((user) => (
                  <option key={user.uid} value={user.uid}>
                    {user.displayName}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition md:col-span-2"
              >
                Create Subject
              </button>
            </form>
          </div>
        )}

        {/* Subjects Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">
                  Faculty
                </th>
                <th className="px-6 py-3 text-left text-sm font-bold text-gray-900">
                  Department
                </th>
                <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">
                  Semester
                </th>
                <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">
                  Students
                </th>
                <th className="px-6 py-3 text-center text-sm font-bold text-gray-900">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {subjects.map((subject) => (
                <tr key={subject.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                    {subject.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{subject.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {users.find((u) => u.uid === subject.facultyId)?.displayName || 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {subject.department}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-center">
                    {subject.semester}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-center">
                    {subject.students?.length || 0}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleDeleteSubject(subject.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {subjects.length === 0 && (
            <div className="p-8 text-center text-gray-600">
              No subjects created yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
