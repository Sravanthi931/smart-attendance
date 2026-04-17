import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [userRole, setUserRole] = useState<'student' | 'faculty' | 'admin'>('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle, signIn, signUp, currentUser } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (currentUser) {
      navigate('/dashboard');
    }
  }, [currentUser, navigate]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        if (!displayName.trim()) {
          setError('Please enter your name');
          setLoading(false);
          return;
        }
        await signUp(email, password, displayName, userRole);
      } else {
        await signIn(email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    try {
      await signInWithGoogle();
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">Smart Attendance</h1>
          <p className="text-gray-600">Manage attendance efficiently</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Your name"
              />
            </div>
          )}

          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Role
              </label>
              <select
                value={userRole}
                onChange={(e) => setUserRole(e.target.value as 'student' | 'faculty' | 'admin')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="student">Student</option>
                <option value="faculty">Faculty</option>
                <option value="admin">Administrator</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Student: View your attendance | Faculty: Mark attendance & view reports | Admin: Manage all users and system
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </button>
        </form>

        <div className="my-6 flex items-center">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-3 text-gray-500 text-sm">OR</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
        >
          <Mail size={20} />
          <span>Sign in with Google</span>
        </button>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
          </p>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
            }}
            className="text-blue-600 font-medium hover:underline mt-1"
          >
            {isSignUp ? 'Sign in instead' : 'Sign up instead'}
          </button>
        </div>
      </div>
    </div>
  );
};
