import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db, functions } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { Sparkles, Download } from 'lucide-react';

interface StudentAttendanceData {
  subjectName: string;
  subjectCode: string;
  percentage: number;
  totalClasses: number;
  classesAttended: number;
}

export const AIAttendanceSummary: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [attendanceData, setAttendanceData] = useState<StudentAttendanceData[]>([]);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!currentUser) return;

      try {
        const subjectsQuery = query(
          collection(db, 'subjects'),
          where('students', 'array-contains', currentUser.uid)
        );
        const subjectsSnap = await getDocs(subjectsQuery);

        const data: StudentAttendanceData[] = [];

        for (const subjectDoc of subjectsSnap.docs) {
          const subjectData = subjectDoc.data();
          const attendanceQuery = query(
            collection(db, 'attendance'),
            where('classId', '==', subjectDoc.id),
            where('studentId', '==', currentUser.uid)
          );
          const attendanceSnap = await getDocs(attendanceQuery);

          const presentCount = attendanceSnap.docs.filter(
            (d) => d.data().isPresent
          ).length;
          const totalCount = attendanceSnap.size;

          data.push({
            subjectName: subjectData.name,
            subjectCode: subjectData.code,
            percentage: totalCount > 0 ? (presentCount / totalCount) * 100 : 0,
            totalClasses: totalCount,
            classesAttended: presentCount,
          });
        }

        setAttendanceData(data);
      } catch (error) {
        console.error('Error fetching attendance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendanceData();
  }, [currentUser]);

  const generateSummary = async () => {
    if (!currentUser) return;

    setGenerating(true);
    try {
      const generateSummaryFn = httpsCallable(functions, 'generateAttendanceSummary');

      const result = await generateSummaryFn({
        studentName: currentUser.displayName,
        attendanceData: attendanceData,
        month: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      }) as { data: { summary: string } };

      setSummary(result.data.summary);
    } catch (error) {
      console.error('Error generating summary:', error);
      setSummary(
        'Failed to generate AI summary. Please try again later. Error: ' +
        (error instanceof Error ? error.message : 'Unknown error')
      );
    } finally {
      setGenerating(false);
    }
  };

  const downloadSummary = () => {
    const element = document.createElement('a');
    const file = new Blob([summary], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `attendance-summary-${currentUser?.displayName}-${new Date().toISOString().split('T')[0]}.txt`;
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Sparkles className="text-purple-600" size={32} />
            <h1 className="text-3xl font-bold text-gray-900">
              AI-Powered Attendance Summary
            </h1>
          </div>
          <p className="text-gray-600 mt-2">
            Get an AI-generated summary of your monthly attendance using Vertex AI Gemini
          </p>
        </div>

        {/* Attendance Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Attendance Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {attendanceData.map((subject, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-900">{subject.subjectCode}</h3>
                <p className="text-sm text-gray-600">{subject.subjectName}</p>
                <div className="mt-3">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-700">Attendance</span>
                    <span className="font-semibold text-gray-900">
                      {subject.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        subject.percentage >= 75
                          ? 'bg-green-500'
                          : subject.percentage >= 60
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                      style={{ width: `${subject.percentage}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 mt-2">
                    {subject.classesAttended} / {subject.totalClasses} classes
                  </p>
                </div>
              </div>
            ))}
          </div>

          {attendanceData.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600">
                No attendance data found. You may not be enrolled in any subjects yet.
              </p>
            </div>
          )}
        </div>

        {/* Summary Generation */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Generate AI Summary</h2>

          {summary ? (
            <div className="space-y-4">
              <div className="bg-white rounded-lg p-4 border border-gray-200 max-h-96 overflow-y-auto">
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {summary}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={generateSummary}
                  disabled={generating || attendanceData.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
                >
                  <Sparkles size={20} />
                  Regenerate Summary
                </button>
                <button
                  onClick={downloadSummary}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
                >
                  <Download size={20} />
                  Download
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={generateSummary}
              disabled={generating || attendanceData.length === 0}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50 transition text-lg"
            >
              {generating ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                  Generating Summary...
                </>
              ) : (
                <>
                  <Sparkles size={24} />
                  Generate AI Summary with Gemini
                </>
              )}
            </button>
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>ℹ️ Note:</strong> This summary is generated using Vertex AI Gemini. It analyzes your attendance
            patterns and provides personalized insights and recommendations to improve your
            attendance in future months.
          </p>
        </div>
      </div>
    </div>
  );
};
