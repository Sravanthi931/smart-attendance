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
  onSnapshot,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, Users, AlertCircle } from 'lucide-react';

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
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState<StudentData[]>([]);
  const [attendance, setAttendance] = useState<{ [key: string]: boolean }>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrCode, setQrCode] = useState<string>('');
  const [isDateLocked, setIsDateLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState('');

  // Fetch subjects and set up real-time listener
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const subjectsQuery = query(
      collection(db, 'subjects'),
      where('facultyId', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(subjectsQuery, (snapshot) => {
      const subjectsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Subject[];
      setSubjects(subjectsData);
      if (subjectsData.length > 0 && !selectedSubject) {
        setSelectedSubject(subjectsData[0].id);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, selectedSubject]);

  // Check if date is locked (within 24 hours of previous marking)
  const checkDateLock = async (subjectId: string, date: string) => {
    try {
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('classId', '==', subjectId),
        where('markedDate', '==', date),
        where('facultyId', '==', currentUser?.uid)
      );

      const snapshot = await getDocs(attendanceQuery);

      if (!snapshot.empty) {
        const latestRecord = snapshot.docs[0].data();
        const markedTime = latestRecord.markedAt?.toDate();
        const now = new Date();
        const hoursSinceMarked = (now.getTime() - markedTime.getTime()) / (1000 * 60 * 60);

        if (hoursSinceMarked < 24) {
          setIsDateLocked(true);
          const hoursRemaining = (24 - hoursSinceMarked).toFixed(1);
          setLockMessage(`Attendance for this date was marked ${hoursSinceMarked.toFixed(1)} hours ago. Locked for ${hoursRemaining} more hours.`);
          return true;
        }
      }

      setIsDateLocked(false);
      setLockMessage('');
      return false;
    } catch (error) {
      console.error('Error checking date lock:', error);
      return false;
    }
  };

  // Fetch existing attendance for the selected date
  const fetchExistingAttendance = async () => {
    if (!selectedSubject || !selectedDate) {
      return;
    }

    try {
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('classId', '==', selectedSubject),
        where('markedDate', '==', selectedDate),
        where('facultyId', '==', currentUser?.uid)
      );

      const snapshot = await getDocs(attendanceQuery);
      const attendanceMap: { [key: string]: boolean } = {};

      snapshot.docs.forEach((doc) => {
        attendanceMap[doc.data().studentId] = doc.data().isPresent;
      });

      setAttendance(attendanceMap);

      // Check if date is locked
      await checkDateLock(selectedSubject, selectedDate);
    } catch (error) {
      console.error('Error fetching existing attendance:', error);
    }
  };

  // Fetch and listen to students for selected subject
  useEffect(() => {
    if (!selectedSubject || subjects.length === 0) {
      setStudents([]);
      setAttendance({});
      return;
    }

    fetchStudents();
    fetchExistingAttendance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject, selectedDate, subjects]);

  const fetchStudents = async () => {
      try {
        const subject = subjects.find((s) => s.id === selectedSubject);
        if (!subject) return;

        const subjectDocRef = doc(db, 'subjects', selectedSubject);

        const unsubscribe = onSnapshot(subjectDocRef, async (snapshot) => {
          if (!snapshot.exists()) {
            setStudents([]);
            setAttendance({});
            return;
          }

          const subjectData = snapshot.data();
          const studentIds = subjectData?.students || [];

          if (studentIds.length === 0) {
            setStudents([]);
            setAttendance({});
            return;
          }

          const usersSnap = await getDocs(collection(db, 'users'));
          const studentsData: StudentData[] = [];

          usersSnap.docs.forEach((userDoc) => {
            if (studentIds.includes(userDoc.id)) {
              studentsData.push({
                uid: userDoc.id,
                displayName: userDoc.data().displayName,
                enrollment: userDoc.data().enrollmentNumber,
              });
            }
          });

          studentsData.sort((a, b) => a.displayName.localeCompare(b.displayName));

          setStudents(studentsData);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };

  // Generate QR code when subject changes
  useEffect(() => {
    if (!selectedSubject || !currentUser || !selectedDate) {
      setQrCode('');
      return;
    }

    const qrData = JSON.stringify({
      classId: selectedSubject,
      date: selectedDate,
      timestamp: new Date().toISOString(),
      facultyId: currentUser.uid,
    });
    setQrCode(qrData);
  }, [selectedSubject, currentUser, selectedDate]);

  const handleToggleAttendance = (studentId: string) => {
    if (isDateLocked) {
      alert('Cannot modify attendance: Date is locked for 24 hours after marking.');
      return;
    }
    setAttendance((prev) => ({
      ...prev,
      [studentId]: !prev[studentId],
    }));
  };

  const handleSelectAll = () => {
    if (isDateLocked) {
      alert('Cannot modify attendance: Date is locked for 24 hours after marking.');
      return;
    }
    const newAttendance: { [key: string]: boolean } = {};
    students.forEach((s) => {
      newAttendance[s.uid] = true;
    });
    setAttendance(newAttendance);
  };

  const handleDeselectAll = () => {
    if (isDateLocked) {
      alert('Cannot modify attendance: Date is locked for 24 hours after marking.');
      return;
    }
    const newAttendance: { [key: string]: boolean } = {};
    students.forEach((s) => {
      newAttendance[s.uid] = false;
    });
    setAttendance(newAttendance);
  };

  const handleSubmit = async () => {
    if (!selectedSubject || !selectedDate) return;

    if (isDateLocked) {
      alert('Cannot mark attendance: Date is locked for 24 hours after previous marking.');
      return;
    }

    setSubmitting(true);
    try {
      // Delete existing attendance records for this date
      const existingQuery = query(
        collection(db, 'attendance'),
        where('classId', '==', selectedSubject),
        where('markedDate', '==', selectedDate),
        where('facultyId', '==', currentUser?.uid)
      );

      const existingDocs = await getDocs(existingQuery);
      const deleteBatch = existingDocs.docs.map((doc) => deleteDoc(doc.ref));
      await Promise.all(deleteBatch);

      // Add new attendance records
      const batch = [];
      const now = new Date();
      const lockedUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      for (const [studentId, isPresent] of Object.entries(attendance)) {
        batch.push(
          addDoc(collection(db, 'attendance'), {
            classId: selectedSubject,
            studentId,
            date: Timestamp.fromDate(new Date(selectedDate)),
            isPresent,
            markedDate: selectedDate,
            markedAt: serverTimestamp(),
            lockedUntil: Timestamp.fromDate(lockedUntil),
            facultyId: currentUser?.uid,
          })
        );
      }

      await Promise.all(batch);

      alert(`Attendance marked for ${selectedDate}! Records are locked for 24 hours.`);
      await fetchExistingAttendance();
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
  const maxClasses = 30;

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
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date to Mark Attendance
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  disabled={isDateLocked}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isDateLocked ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                />
              </div>
            </div>

            {/* Lock Warning */}
            {isDateLocked && (
              <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <h3 className="font-semibold text-yellow-800">Attendance Locked</h3>
                    <p className="text-yellow-700 text-sm mt-1">{lockMessage}</p>
                  </div>
                </div>
              </div>
            )}

            {selectedSubjectData && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Users size={24} />
                      Enrolled Students ({students.length})
                    </h3>
                    <p className="text-green-600 font-semibold mt-1">
                      ✓ Present: {presentCount} / {students.length}
                    </p>
                    <p className="text-gray-500 text-xs mt-1">Out of {maxClasses} total classes</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleSelectAll}
                      disabled={students.length === 0 || isDateLocked}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium disabled:opacity-50"
                    >
                      Mark All
                    </button>
                    <button
                      onClick={handleDeselectAll}
                      disabled={students.length === 0 || isDateLocked}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm font-medium disabled:opacity-50"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {students.length === 0 ? (
                  <div className="p-8 text-center bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg">
                    <Users size={40} className="text-blue-400 mx-auto mb-3" />
                    <p className="text-gray-600 text-lg font-medium">No students enrolled yet</p>
                    <p className="text-gray-500 text-sm mt-2">Students will appear here once they enroll in this subject</p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
                    <div className="space-y-2 p-2">
                      {students.map((student) => (
                        <label
                          key={student.uid}
                          className={`flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors ${
                            isDateLocked ? 'opacity-75 cursor-not-allowed' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={attendance[student.uid] || false}
                            onChange={() => handleToggleAttendance(student.uid)}
                            disabled={isDateLocked}
                            className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {student.displayName}
                            </p>
                            {student.enrollment && (
                              <p className="text-sm text-gray-600">
                                ID: {student.enrollment}
                              </p>
                            )}
                          </div>
                          <div className="text-sm">
                            {attendance[student.uid] ? (
                              <span className="text-green-600 font-semibold">✓ Present</span>
                            ) : (
                              <span className="text-red-600 font-semibold">✗ Absent</span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={submitting || students.length === 0 || isDateLocked}
                  className="w-full mt-6 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                >
                  {submitting ? 'Submitting...' : `Submit Attendance (${presentCount}/${students.length}) - Out of ${maxClasses}`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
