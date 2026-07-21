import { fmtDate, fmtTime } from '../../utils/helpers';
import { CONFIG } from '../../lib/config';

const STATUS_META = {
  pending: { bg: '#fef9c3', fg: '#854d0e', label: '⏳ Pending', live: false },
  verified: { bg: '#dcfce7', fg: '#166534', label: '✅ Verified', live: true },
  sent: { bg: '#dbeafe', fg: '#1e40af', label: '🔗 Link Sent', live: true },
  completed: { bg: '#e0e7ff', fg: '#3730a3', label: '🎓 Done', live: true },
  cancelled: { bg: '#fee2e2', fg: '#991b1b', label: '❌ Cancelled', live: false }
};

export default function MyBookingsModal({ bookings, onClose }) {
  return (
    <div className="m-overlay fixed inset-0 z-[800] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md" onClick={onClose}>
      <div
        className="m-box w-full max-w-xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl animate-fadeUp"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="checkout-header relative text-white bg-gradient-to-r from-indigo-600 to-purple-600 py-5 px-6 rounded-t-3xl">
          <button
            onClick={onClose}
            className="m-close absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center text-sm"
          >
            ✕
          </button>
          <div className="tag text-[9px] font-bold uppercase tracking-widest text-indigo-200 mb-1">
            📅 Your Sessions
          </div>
          <h3 className="text-lg font-bold">My Bookings</h3>
        </div>

        {/* Body */}
        <div className="checkout-body p-5">
          {!bookings.length ? (
            <p className="text-center text-gray-500 py-10">No bookings yet.</p>
          ) : (
            bookings.map(b => {
              const s = STATUS_META[b.status] || STATUS_META.pending;
              const feeText = Number(b.session_fee || 0) === 0 ? 'Free Session' : `₹${b.session_fee || CONFIG.SESSION_FEE}`;

              return (
                <div
                  key={b.id}
                  className={`booking-card bg-white border rounded-xl p-3 mb-2 shadow-sm ${s.live ? 'border-green-200' : 'border-gray-200'
                    }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-sm font-bold">{b.mentor_name || 'Session'}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {b.scheduled_at
                          ? `🕐 ${fmtDate(b.scheduled_at)}, ${fmtTime(b.scheduled_at)}`
                          : `Booked on ${fmtDate(b.created_at)}`}
                      </div>
                    </div>
                    <span
                      className="booking-status-pill px-2 py-1 rounded-full text-[10px] font-bold"
                      style={{ background: s.bg, color: s.fg }}
                    >
                      {s.label}
                    </span>
                  </div>
                  <div className="text-xs text-gray-700">
                    <strong>Fee:</strong> {feeText}
                  </div>
                  {b.payment_proof_url && (
                    <div className="text-[11px] text-gray-600 mt-0.5">📎 Proof submitted</div>
                  )}
                  {b.meet_link ? (
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-2 mt-2">
                      <div className="text-[10px] font-bold text-indigo-800 mb-0.5">🔗 MEET LINK</div>
                      <a
                        href={b.meet_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-indigo-600 font-semibold no-underline hover:underline"
                      >
                        {b.meet_link}
                      </a>
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-400 mt-1">⏳ Link will be shared soon</div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}