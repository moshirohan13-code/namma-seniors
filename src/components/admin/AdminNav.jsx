export default function AdminNav({ onSignOut }) {
  return (
    <nav className="adm-nav bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 h-16 px-7 flex items-center justify-between shadow-xl sticky top-0 z-[100]">
      <div className="adm-nav-left flex items-center gap-3">
        <div className="adm-logo w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-lg shadow-lg">
          🎓
        </div>
        <div>
          <div className="adm-nav-tag text-[9px] text-indigo-200 font-extrabold uppercase tracking-widest">
            Admin Panel
          </div>
          <div className="adm-nav-title text-[15px] font-extrabold text-white tracking-tight">
            Namma Seniors – Operations Console
          </div>
        </div>
        <span className="rt-badge inline-flex items-center gap-1 bg-green-500/20 border border-green-400/40 text-green-300 rounded-full px-3 py-1 text-[10px] font-bold ml-3">
          <span className="rt-dot w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span> LIVE
        </span>
      </div>

      <button
        onClick={onSignOut}
        className="adm-signout inline-flex items-center gap-2 bg-red-500/15 border border-red-400/40 text-red-300 rounded-lg px-4 py-2 text-xs font-extrabold hover:bg-red-500/25 hover:-translate-y-0.5 transition"
      >
        ↩ Sign Out
      </button>
    </nav>
  );
}