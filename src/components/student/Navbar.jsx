import { useState, useRef, useEffect } from 'react';

export default function Navbar({ isLoggedIn, studentSession, onLogout, onMyBookingsClick, onMyProfileClick, onSignInClick }) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
        setShowProfilePanel(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const email = studentSession?.email || '';
  const avatarLetter = isLoggedIn ? email[0]?.toUpperCase() || 'S' : 'G';
  const username = isLoggedIn ? email.split('@')[0] || 'Student' : 'Guest';

  return (
    <nav className="ns-nav sticky top-0 z-[200] flex items-center justify-between h-[60px] px-6 bg-white/95 backdrop-blur-md border-b border-indigo-100 shadow-sm">
      {/* Logo */}
      <a
        href="#"
        onClick={e => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        className="flex items-center gap-3 no-underline"
      >
        <img
          src="/logo.png"
          alt="Namma Seniors"
          className="w-10 h-10 rounded-xl object-contain"
          onError={e => {
            e.target.style.display = 'none';
            e.target.nextElementSibling.style.display = 'flex';
          }}
        />
        <div
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-lg shadow-lg hidden"
          style={{ boxShadow: '0 6px 16px rgba(99,102,241,0.22)' }}
        >
          🎓
        </div>
        <div>
          <strong className="block text-sm font-bold text-gray-900">Namma Seniors</strong>
          <span className="block text-[10px] text-gray-500">Built by NITK Students</span>
        </div>
      </a>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        {/* Home Icon */}
        <a
          href="#"
          onClick={e => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-indigo-50 hover:text-indigo-600 transition"
          title="Home"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </a>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-2 px-2 py-1 border border-gray-200 rounded-full bg-white shadow-sm hover:shadow-md transition"
          >
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center text-[11px] font-bold">
              {avatarLetter}
            </div>
            <span className="text-xs font-semibold text-gray-700 hidden sm:block">{username}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div className="absolute top-full right-0 mt-2 min-w-[160px] bg-white border border-gray-200 rounded-xl shadow-xl p-1 z-10">
              <a
                href="#"
                onClick={e => {
                  e.preventDefault();
                  setShowProfilePanel(prev => !prev);
                }}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
              >
                👤 My Profile
              </a>

              {showProfilePanel && (
                <div className="mx-1 mb-1 flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                    {avatarLetter}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-gray-900 truncate">{email || 'Guest'}</div>
                    <div className="text-[11px] text-gray-500">📞 {studentSession?.phone || '—'}</div>
                  </div>
                </div>
              )}
              <a
                href="#"
                onClick={e => {
                  e.preventDefault();
                  setShowDropdown(false);
                  onMyBookingsClick();
                }}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
              >
                📅 My Bookings
              </a>
              <a
                href="#"
                onClick={e => {
                  e.preventDefault();
                  setShowDropdown(false);
                  if (isLoggedIn) {
                    onLogout();
                  } else {
                    onSignInClick();
                  }
                }}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-600"
              >
                {isLoggedIn ? '🚪 Sign Out' : '👋 Sign In'}
              </a>
            </div>
          )}
        </div>
      </div>

    </nav>
  );
}