import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function Navbar({ isAdminArea = false }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);
  const { user, logout, hasPermission, getPerfilColor, getPerfilNombre } = useAuth();
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigateToAdmin = () => {
    setShowUserMenu(false);
    navigate('/admin');
  };

  const handleNavigateToHome = () => {
    setShowUserMenu(false);
    navigate('/');
  };

  return (
    <nav className="bg-blue-600 text-white shadow-md">
      <div className="max-w-full px-3">
        <div className="flex justify-between items-center py-2">
          {/* Logo */}
          <button 
            onClick={handleNavigateToHome}
            className="text-base font-bold hover:opacity-80 transition-opacity"
          >
            ARCHIVO<span className="text-white">+</span>
          </button>

          {/* Right side: Language switcher + User menu + Logout */}
          <div className="flex items-center gap-2">
            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-blue-700 hover:bg-blue-800 transition-colors text-sm font-medium"
              title={language === 'en' ? 'Switch to Spanish' : 'Cambiar a Inglés'}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
              </svg>
              {language === 'en' ? 'EN' : 'ES'}
            </button>

            {/* Admin Button - Visible when not in admin area */}
            {!isAdminArea && (
              <button
                onClick={handleNavigateToAdmin}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-yellow-500 hover:bg-yellow-600 transition-colors text-sm font-semibold text-gray-900"
                title="Admin Area"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Admin
              </button>
            )}

            {/* User Dropdown Menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-1.5 px-2 py-1 rounded hover:bg-blue-700 transition-colors"
              >
                {/* User Avatar */}
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold text-xs"
                  style={{ backgroundColor: getPerfilColor() }}
                >
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
                
                {/* User Info */}
                <div className="text-left hidden lg:block">
                  <div className="text-xs font-medium">{user?.name_completo || user?.username}</div>
                </div>

                {/* Dropdown Icon */}
                <svg
                  className={`w-3 h-3 transition-transform ${showUserMenu ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-2 z-50">
                  {/* User Info Header */}
                  <div className="px-4 py-3 border-b border-gray-700">
                    <div className="text-sm font-medium text-white">{user?.name_completo || user?.username}</div>
                    {user?.compania && (
                      <div className="text-xs text-gray-400">{user.compania}</div>
                    )}
                    <div 
                      className="inline-block text-xs px-2 py-1 rounded-full mt-2"
                      style={{ 
                        backgroundColor: `${getPerfilColor()}20`,
                        color: getPerfilColor(),
                        border: `1px solid ${getPerfilColor()}40`
                      }}
                    >
                      {getPerfilNombre()}
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-1">
                    {!isAdminArea && (
                      <button
                        onClick={handleNavigateToHome}
                        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center"
                      >
                        <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Home
                      </button>
                    )}

                    <button
                      className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Configuración
                    </button>
                    {/* Logout inside dropdown */}
                    <div className="border-t border-gray-700 my-1"></div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 flex items-center"
                    >
                      <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Logout moved into dropdown menu */}
          </div>
        </div>
      </div>
    </nav>
  );
}
