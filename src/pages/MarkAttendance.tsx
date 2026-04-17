import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  code: string;
  students: string[];
}

interface StudentData {
  uid: string;
  displayName: string;
  enrollment?: string;
}

export const MarkAttendance: React.FC = () => {
  const { currentUser } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [students, setStudents] = useState<StudentData[]>([]);
  const [attendance, setAttendance] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');

  useEffect(() => {
    const fetchSubjects = async () => {
      if (!currentUser) return;

      try {
        const subjectsQuery = query(
          collection(db, 'subjects'),
          where('facultyId', '==', currentUser.uid)
        );
        const subjectsSnap = await getDocs(subjectsQuery);
        const subjectsData = subjectsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Subject[];
        setSubjects(subjectsData);
        if (subjectsData.length > 0) {
          setSelectedSubject(subjectsData[0].id);
        }
      } catch (error) {
        console.error('Error fetching subjects:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSubjects();
  }, [currentUser]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedSubject) return;

      try {
        const subject = subjects.find((s) => s.id === selectedSubject);
        if (!subject) return;

        const usersRef = collection(db, 'users');
        const studentDocs = await Promise.all(
          subject.students.map((studentId) =>
            getDocs(query(usersRef, where('uid', '==', studentId)))
          )
        );

        const studentsData: StudentData[] = [];
        studentDocs.forEach((snap) => {
          snap.docs.forEach((doc) => {
            studentsData.push({
              uid: doc.id,
              displayName: doc.data().displayName,
              enrollment: doc.data().enrollmentNumber,
            });
          });
        });

        setStudents(studentsData);
        const initialAttendance: { [key: string]: boolean } = {};
        studentsData.forEach((s) => {
          initialAttendance[s.uid] = false;
        });
        setAttendance(initialAttendance);

        // Generate QR code
        const qrData = JSON.stringify({
          classId: selectedSubject,
          timestamp: new Date().toISOString(),
          facultyId: currentUser?.uid,
        });
        setQrCode(qrData);
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };

    fetchStudents();
  }, [selectedSubject, subjects, currentUser]);

  const handleToggleAttendance = (studentId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const handleSelectAll = () => {
    const newAttendance: { [key: string]: boolean } = {};
    students.forEach((s) => {
      newAttendance[s.uid] = true;
    });
    setAttendance(newAttendance);
  };

  const handleDeselectAll = () => {
    const newAttendance: { [key: string]: boolean } = {};
    students.forEach((s) => {
      newAttendance[s.uid] = false;
    });
    setAttendance(newAttendance);
  };

  const handleSubmit = async () => {
    if (!selectedSubject) return;

    setSubmitting(true);
    try {
      const batch = [];
      for (const [studentId, isPresent] of Object.entries(attendance)) {
        batch.push(
          addDoc(collection(db, 'attendance'), {
            classId: selectedSubject,
            studentId,
            date: Timestamp.now(),
            isPresent,
            markedAt: serverTimestamp(),
            facultyId: currentUser?.uid,
          })
        );
      }

      await Promise.all(batch);

      alert('Attendance marked successfully!');
      setAttendance({});
    } catch (error) {
      console.error('Error submitting attendance:', error);
      alert('Failed to mark attendance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyQRCode = () => {
    navigator.clipboard.writeText(qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const selectedSubjectData = subjects.find((s) => s.id === selectedSubject);
  const presentCount = Object.values(attendance).filter(Boolean).length;

  if (subjects.length === 0 && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Mark Attendance</h1>
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">No Subjects Assigned</h2>
            <p className="text-gray-600 mb-4">You don't have any subjects assigned yet.</p>
            <p className="text-gray-600 mb-6">
              Contact your Administrator to create subjects and assign you as the faculty member.
            </p>
            <a
              href="/dashboard"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Mark Attendance</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* QR Code Section */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-1">
            <h2 className="text-xl font-bold text-gray-900 mb-4">QR Code</h2>
            {qrCode && (
              <div className="flex flex-col items-center">
                <QRCodeSVG
                  value={qrCode}
                  level="H"
                  size={200}
                  includeMargin={true}
                  className="mb-4"
                />
                <button
                  onClick={copyQRCode}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  {copied ? (
                    <>
                      <Check size={18} /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy size={18} /> Copy Code
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Attendance Marking Section */}
          <div className="bg-white rounded-lg shadow p-6 lg:col-span-2">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Subject
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name} ({subject.code})
                  </option>
                ))}
              </select>
            </div>

            {selectedSubjectData && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">
                      Students ({students.length})
                    </h3>
                    <p className="text-green-600 font-semibold">
                      Present: {presentCount}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAll}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
                    >
                      Mark All
                    </button>
                    <button
                      onClick={handleDeselectAll}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                    {students.map((student) => (
                      <label
                        key={student.uid}
                        className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={attendance[student.uid] || false}
                          onChange={() => handleToggleAttendance(student.uid)}
                          className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            {student.displayName}
                          </p>
                          {student.enrollment && (
                            <p className="text-sm text-gray-600">
                              {student.enrollment}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting || students.length === 0}
                  className="w-full mt-6 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {submitting ? 'Submitting...' : 'Submit Attendance'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
