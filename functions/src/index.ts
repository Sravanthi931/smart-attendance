import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { VertexAI } from '@google-cloud/aiplatform';

// Initialize Firebase Admin SDK
admin.initializeApp();

const projectId = 'smart-attendance-b57d5';
const location = 'us-central1';

// Initialize Vertex AI
const vertexAI = new VertexAI({
  project: projectId,
  location: location,
});

export const generateAttendanceSummary = functions.https.onCall(
  async (data, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { studentName, attendanceData, month } = data;

    try {
      // Create prompt for Gemini
      const attendanceSummary = attendanceData
        .map(
          (subject: any) =>
            `- ${subject.subjectCode} (${subject.subjectName}): ${subject.percentage.toFixed(1)}% (${subject.classesAttended}/${subject.totalClasses} classes)`
        )
        .join('\n');

      const prompt = `
You are an educational assistant. Analyze the following student attendance data for ${month} and provide:
1. A brief overall assessment of attendance
2. Subjects with concerning attendance rates
3. Positive observations
4. 2-3 specific recommendations for improvement

Student: ${studentName}

Attendance Summary:
${attendanceSummary}

Please provide a concise, encouraging, and actionable summary. Keep it to 150-200 words.`;

      // Call Vertex AI Gemini API
      const generativeModel = vertexAI.getGenerativeModel({
        model: 'gemini-1.5-flash-001',
      });

      const response = await generativeModel.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      });

      const result = response.response;
      const summary = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return {
        success: true,
        summary: summary,
      };
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to generate attendance summary'
      );
    }
  }
);

// Additional function to get attendance statistics
export const getAttendanceStats = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const { userId } = data;

    try {
      const db = admin.firestore();

      // Get all subjects for the user
      const subjectsSnapshot = await db
        .collection('subjects')
        .where('students', 'array-contains', userId)
        .get();

      let totalClasses = 0;
      let totalPresent = 0;
      const subjectStats = [];

      for (const subjectDoc of subjectsSnapshot.docs) {
        const subjectData = subjectDoc.data();

        // Get attendance records
        const attendanceSnapshot = await db
          .collection('attendance')
          .where('classId', '==', subjectDoc.id)
          .where('studentId', '==', userId)
          .get();

        const presentCount = attendanceSnapshot.docs.filter(
          (doc) => doc.data().isPresent
        ).length;
        const totalCount = attendanceSnapshot.size;

        totalClasses += totalCount;
        totalPresent += presentCount;

        subjectStats.push({
          subjectName: subjectData.name,
          subjectCode: subjectData.code,
          totalClasses: totalCount,
          classesAttended: presentCount,
          percentage: totalCount > 0 ? (presentCount / totalCount) * 100 : 0,
        });
      }

      return {
        success: true,
        totalClasses,
        totalPresent,
        overallPercentage:
          totalClasses > 0 ? (totalPresent / totalClasses) * 100 : 0,
        subjectStats,
      };
    } catch (error) {
      console.error('Error fetching statistics:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to fetch attendance statistics'
      );
    }
  }
);
