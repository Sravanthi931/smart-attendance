import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, getDocs, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { User } from '../types';
import { Trash2, Edit2, Save, Users } from 'lucide-react';

export const ManageUsers: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<(User & { firestoreId: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<string>('');

  useEffect(() => {
    const fetchUsers = async () => {
      if (!currentUser || currentUser.role !== 'admin') return;

      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersData = usersSnap.docs.map((doc) => ({
          firestoreId: doc.id,
          ...doc.data(),
        })) as (User & { firestoreId: string })[];

        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [currentUser]);

  const handleEditRole = (userId: string, currentRole: string) => {
    setEditingId(userId);
    setEditRole(currentRole);
  };

  const handleSaveRole = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: editRole,
      });

      setUsers((prev) =>
        prev.map((u) => (u.firestoreId === userId ? { ...u, role: editRole as any } : u))
      );
      setEditingId(null);
    } catch (error) {
      console.error('Error updating role:', error);
      alert('Failed to update role');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;

    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers((prev) => prev.filter((u) => u.firestoreId !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const roleStats = {
    admin: users.filter((u) => u.role === 'admin').length,
    faculty: users.filter((u) => u.role === 'faculty').length,
    student: users.filter((u) => u.role === 'student').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">👥 Manage Users</h1>
          <p className="text-gray-600">Complete user management and role assignment</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Users</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{users.length}</p>
              </div>
              <div className="bg-blue-100 p-4 rounded-full">
                <Users size={24} className="text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-red-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Administrators</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{roleStats.admin}</p>
              </div>
              <div className="bg-red-100 p-4 rounded-full">
                <Users size={24} className="text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-indigo-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Faculty</p>
                <p className="text-3xl font-bold text-indigo-600 mt-2">{roleStats.faculty}</p>
              </div>
              <div className="bg-indigo-100 p-4 rounded-full">
                <Users size={24} className="text-indigo-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-500 hover:shadow-xl transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Students</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{roleStats.student}</p>
              </div>
              <div className="bg-green-100 p-4 rounded-full">
                <Users size={24} className="text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-bold">Email</th>
                  <th className="px-6 py-4 text-center text-sm font-bold">Role</th>
                  <th className="px-6 py-4 text-center text-sm font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((user) => (
                  <tr key={user.firestoreId} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 font-semibold">
                      {user.displayName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-6 py-4 text-center">
                      {editingId === user.firestoreId ? (
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="px-3 py-2 border-2 border-blue-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                        >
                          <option value="admin">Admin</option>
                          <option value="faculty">Faculty</option>
                          <option value="student">Student</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold capitalize ${
                            user.role === 'admin'
                              ? 'bg-red-100 text-red-800'
                              : user.role === 'faculty'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-3">
                        {editingId === user.firestoreId ? (
                          <button
                            onClick={() => handleSaveRole(user.firestoreId)}
                            className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                          >
                            <Save size={16} />
                            Save
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEditRole(user.firestoreId, user.role)}
                            className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                          >
                            <Edit2 size={16} />
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteUser(user.firestoreId)}
                          className="flex items-center gap-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          <Trash2 size={16} />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="p-8 text-center text-gray-600">
              <p className="text-lg">No users found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
