import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, Menu, X, Home } from 'lucide-react';
import { useState } from 'react';

export const Navbar: React.FC = () => {
  const { currentUser, signOut } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'faculty':
        return 'bg-blue-100 text-blue-800';
      case 'student':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getNavLinks = () => {
    if (!currentUser) return [];

    const links = [];

    if (currentUser.role === 'student') {
      links.push({ label: 'Enroll Subjects', href: '/enroll-subjects' });
      links.push({ label: 'Attendance', href: '/attendance' });
      links.push({ label: 'AI Summary', href: '/ai-summary' });
    } else if (currentUser.role === 'faculty') {
      links.push({ label: 'Mark Attendance', href: '/mark-attendance' });
      links.push({ label: 'Class Reports', href: '/class-reports' });
    } else if (currentUser.role === 'admin') {
      links.push({ label: 'Manage Users', href: '/manage-users' });
      links.push({ label: 'Manage Subjects', href: '/manage-subjects' });
      links.push({ label: 'System Reports', href: '/system-reports' });
    }

    return links;
  };

  const navLinks = getNavLinks();

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate('/dashboard')}
              className="text-2xl font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              <Home size={24} />
              <span className="hidden sm:inline">Smart Attendance</span>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => navigate(link.href)}
                  className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
                >
                  {link.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-4">
            {currentUser && (
              <>
                <div className="flex items-center gap-3">
                  {currentUser.photoURL && (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName}
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {currentUser.displayName}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded capitalize ${getRoleColor(
                        currentUser.role
                      )}`}
                    >
                      {currentUser.role}
                    </span>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                >
                  <LogOut size={18} />
                  <span>Sign Out</span>
                </button>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-700">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && currentUser && (
        <div className="md:hidden px-4 py-4 border-t">
          <div className="flex items-center gap-3 mb-4">
            {currentUser.photoURL && (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <p className="font-medium text-gray-900">{currentUser.displayName}</p>
              <p className={`text-xs ${getRoleColor(currentUser.role)} px-2 py-1 rounded capitalize`}>
                {currentUser.role}
              </p>
            </div>
          </div>

          {/* Mobile Navigation Links */}
          <div className="space-y-2 mb-4">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => {
                  navigate(link.href);
                  setIsOpen(false);
                }}
                className="w-full text-left px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
              >
                {link.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </nav>
  );
};
