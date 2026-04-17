import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { MarkAttendance } from './pages/MarkAttendance';
import { ViewAttendance } from './pages/ViewAttendance';
import { AIAttendanceSummary } from './pages/AIAttendanceSummary';
import { ClassReports } from './pages/ClassReports';
import { ManageUsers } from './pages/ManageUsers';
import { ManageSubjects } from './pages/ManageSubjects';
import { SystemReports } from './pages/SystemReports';
import { EnrollSubjects } from './pages/EnrollSubjects';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="App">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Navbar />
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mark-attendance"
              element={
                <ProtectedRoute requiredRole={['faculty', 'admin']}>
                  <Navbar />
                  <MarkAttendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance"
              element={
                <ProtectedRoute requiredRole={['student', 'admin']}>
                  <Navbar />
                  <ViewAttendance />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-summary"
              element={
                <ProtectedRoute requiredRole={['student', 'admin']}>
                  <Navbar />
                  <AIAttendanceSummary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/class-reports"
              element={
                <ProtectedRoute requiredRole={['faculty', 'admin']}>
                  <Navbar />
                  <ClassReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-users"
              element={
                <ProtectedRoute requiredRole={['admin']}>
                  <Navbar />
                  <ManageUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manage-subjects"
              element={
                <ProtectedRoute requiredRole={['admin']}>
                  <Navbar />
                  <ManageSubjects />
                </ProtectedRoute>
              }
            />
            <Route
              path="/system-reports"
              element={
                <ProtectedRoute requiredRole={['admin']}>
                  <Navbar />
                  <SystemReports />
                </ProtectedRoute>
              }
            />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </AuthProvider>
    </Router>
  );
}

const UnauthorizedPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900">Access Denied</h1>
      <p className="text-gray-600 mt-4">
        You do not have permission to access this page.
      </p>
      <a
        href="/dashboard"
        className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Go to Dashboard
      </a>
    </div>
  </div>
);

export default App;

