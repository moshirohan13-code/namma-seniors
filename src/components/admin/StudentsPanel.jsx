import { useState, useMemo } from 'react';
import { fmtDate } from '../../utils/helpers';
import { CONFIG } from '../../lib/config';

export default function StudentsPanel({ bookings, students, onRefresh }) {
  const [search, setSearch] = useState('');
  const [sessionFilter, setSessionFilter] = useState('all'); // 'all' | 'zero' | 'active'

  // Aggregate student data from bookings + students table
  const studentMap = useMemo(() => {
    const map = {};

    bookings.forEach(b => {
      const key = b.student_email || b.student_phone;
      if (!key) return;

      if (!map[key]) {
        map[key] = {
          name: b.student_name || (b.student_email || '').split('@')[0] || '—',
          phone: b.student_phone,
          email: b.student_email,
          sessions: 0,
          spent: 0,
          last: b.created_at
        };
      }

      map[key].sessions++;
      map[key].spent += b.session_fee || CONFIG.SESSION_FEE;

      if (b.created_at && (!map[key].last || new Date(b.created_at) > new Date(map[key].last))) {
        map[key].last = b.created_at;
      }
    });

    students.forEach(s => {
      const key = s.email || s.phone;
      if (!key) return;

      if (!map[key]) {
        map[key] = {
          name: (s.email || '').split('@')[0] || '—',
          phone: s.phone,
          email: s.email,
          sessions: 0,
          spent: 0,
          last: s.last_seen
        };
      } else {
        if (!map[key].phone && s.phone) map[key].phone = s.phone;
        if (!map[key].email && s.email) map[key].email = s.email;
        if (s.last_seen && (!map[key].last || new Date(s.last_seen) > new Date(map[key].last))) {
          map[key].last = s.last_seen;
        }
      }
    });

    return Object.values(map);
  }, [bookings, students]);

  const zeroBookingCount = studentMap.filter(s => s.sessions === 0).length;
  const activeCount = studentMap.length - zeroBookingCount;

  const filtered = studentMap.filter(s => {
    // Text search
    const str = search.toLowerCase();
    if (str && ![s.name, s.email, s.phone].join(' ').toLowerCase().includes(str)) {
      return false;
    }

    // Session filter
    if (sessionFilter === 'zero' && s.sessions !== 0) return false;
    if (sessionFilter === 'active' && s.sessions === 0) return false;

    return true;
  });

  return (
    <div className="tbl-card bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-5">
      <div className="px-5 pt-5 flex gap-3 flex-wrap">
        <button
          onClick={() => setSessionFilter('zero')}
          className={`flex-1 min-w-[180px] text-left p-3 rounded-xl border-2 transition ${sessionFilter === 'zero' ? 'border-gray-400 bg-gray-100' : 'border-gray-200 bg-gray-50 hover:border-gray-400'}`}
        >
          <div className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">⏳ No Bookings Yet</div>
          <div className="text-2xl font-black text-gray-700">{zeroBookingCount}</div>
        </button>
        <button
          onClick={() => setSessionFilter('active')}
          className={`flex-1 min-w-[180px] text-left p-3 rounded-xl border-2 transition ${sessionFilter === 'active' ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50 hover:border-green-400'}`}
        >
          <div className="text-[10px] font-black text-green-600 uppercase tracking-wider mb-1">✅ Active Students</div>
          <div className="text-2xl font-black text-green-700">{activeCount}</div>
        </button>
        <button
          onClick={() => setSessionFilter('all')}
          className={`flex-1 min-w-[180px] text-left p-3 rounded-xl border-2 transition ${sessionFilter === 'all' ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:border-indigo-400'}`}
        >
          <div className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-1">🎓 Total Students</div>
          <div className="text-2xl font-black text-indigo-700">{studentMap.length}</div>
        </button>
      </div>
      <div className="tbl-head p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-[15px] font-black text-gray-900">🎓 Student Directory</h3>
          <p className="text-[11.5px] text-gray-500 mt-0.5">From bookings + login records</p>
        </div>
        <div className="tbl-actions flex gap-2 items-center flex-wrap">
          <button
            onClick={onRefresh}
            className="refresh-btn inline-flex items-center gap-1 px-4 py-2 border-2 border-gray-200 rounded-lg bg-white text-xs font-extrabold text-gray-700 hover:border-indigo-600 hover:text-indigo-600 transition"
          >
            🔄 Refresh
          </button>

          {/* Session Filter Dropdown */}
          <select
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
            className="px-3 py-2 border-2 border-gray-200 rounded-lg text-xs font-bold bg-white outline-none focus:border-indigo-600 cursor-pointer"
          >
            <option value="all">All Students</option>
            <option value="zero">Zero Bookings Only</option>
            <option value="active">Active Students Only</option>
          </select>

          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search students…"
            className="tbl-search px-3 py-2 border-2 border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 min-w-[200px]"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-indigo-50/50">
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">#</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Student</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Phone</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Email</th>
              <th className="px-3 py-2 text-center text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Sessions</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Total Paid</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Last Seen</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Status</th>
            </tr>
          </thead>
          <tbody>
            {!filtered.length ? (
              <tr>
                <td colSpan="8" className="text-center text-gray-400 py-10 text-sm">
                  {sessionFilter === 'zero' ? 'No students with zero bookings' :
                    sessionFilter === 'active' ? 'No students with active bookings' :
                      'No students.'}
                </td>
              </tr>
            ) : (
              filtered.map((s, i) => (
                <tr key={i} className="hover:bg-indigo-50/30 border-b border-gray-100 transition">
                  <td className="px-3 py-2 text-xs text-gray-700">{i + 1}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="font-bold text-gray-900">{s.name}</span>
                  </td>
                  <td className="px-3 py-2 text-xs font-bold text-gray-700 whitespace-nowrap">
                    {s.phone || '—'}
                    {s.phone && <WhatsAppLink phone={s.phone} />}
                  </td>
                  <td className="px-3 py-2 text-[11px] text-gray-600">{s.email || '—'}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-xs font-black ${s.sessions === 0 ? 'text-gray-400' : 'text-gray-900'}`}>
                      {s.sessions}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs font-black text-indigo-600">₹{s.spent}</td>
                  <td className="px-3 py-2 text-[11px] text-gray-600">{fmtDate(s.last)}</td>
                  <td className="px-3 py-2 text-xs">
                    {s.sessions === 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[10px] font-bold whitespace-nowrap">
                        ⏳ No bookings yet · joined {fmtDate(s.last)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-bold whitespace-nowrap">
                        ✅ Active
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function WhatsAppLink({ phone }) {
  const clean = String(phone).replace(/\D/g, '');
  const num = clean.startsWith('91') ? clean : '91' + clean;
  const message = "Hi! I'm Rohan from Namma Seniors 😊 How can I help you today? If you'd like to book a mentorship session or talk with a senior, feel free to book directly on our website — nammaseniors.com. We're here to help you succeed! 🎓";
  return (
    <a
      href={`https://wa.me/${num}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded-full text-[11px] ml-1 hover:scale-110 transition"
      title={`WhatsApp ${phone}`}
    >
      <svg className="w-3 h-3 fill-white" viewBox="0 0 24 24">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
      </svg>
    </a>
  );
}