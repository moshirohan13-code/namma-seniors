import { pickPalette, getInitials, esc, examTagClass, parseExams } from '../../utils/helpers';
import { CONFIG } from '../../lib/config';

export default function ProfileModal({ mentor, onClose, onBookSession }) {
  const [colorA, colorB] = pickPalette(mentor.full_name);
  const exams = parseExams(mentor.exam_profile);

  const degreeStr = [mentor.degree, mentor.branch].filter(Boolean).join(' – ') || '—';
  const langs = String(mentor.languages || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const helps = String(mentor.can_help_with || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const bg = String(mentor.background || '').trim() || `${mentor.full_name} is a ${mentor.year || ''} student at ${mentor.college || ''}.`;

  return (
    <div className="m-overlay fixed inset-0 z-[800] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md" onClick={onClose}>
      <div
        className="m-box w-full max-w-xl max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl animate-fadeUp"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="profile-header relative text-white text-center py-7 px-6 rounded-t-3xl"
          style={{ background: `linear-gradient(135deg, ${colorA}, ${colorB})` }}
        >
          <button
            onClick={onClose}
            className="m-close absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center text-sm hover:bg-white/30 transition"
          >
            ✕
          </button>

          <div
            className="profile-avatar w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/30 flex items-center justify-center text-2xl font-extrabold mx-auto mb-3"
          >
            {getInitials(mentor.full_name)}
          </div>

          <div className="profile-name text-2xl font-extrabold tracking-tight mb-1">{mentor.full_name}</div>

          {(mentor.year || mentor.college) && (
            <div className="profile-sub text-sm font-light text-white/90 mb-2">
              {[mentor.year, mentor.college].filter(Boolean).join(' • ')}
            </div>
          )}

          <div className="profile-exam-tags flex flex-wrap justify-center gap-1">
            {exams.map((exam, i) => (
              <span
                key={i}
                className="profile-etag px-2 py-1 rounded-full text-[10px] font-bold bg-white/20 border border-white/30"
              >
                {exam}
              </span>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="profile-body p-6 bg-gray-50">
          {/* Degree & Branch */}
          <div className="profile-card-group mb-5">
            <div className="profile-info-card bg-white rounded-xl p-5 shadow-sm">
              <div className="profile-info-header flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                <span className="icon text-base">🎓</span>
                <span className="text text-sm font-semibold text-gray-800">{degreeStr}</span>
              </div>
              <div className="detail-grid-new flex flex-col gap-3">
                {mentor.college && <DetailItem icon="🏛️" label="College" value={mentor.college} />}
                {mentor.year && <DetailItem icon="📅" label="Academic Year" value={mentor.year} />}
                {mentor.home_location && <DetailItem icon="📍" label="Home Location" value={mentor.home_location} />}
              </div>
            </div>
          </div>

          {/* Ranks */}
          {(mentor.kcet_rank || mentor.comedk_rank || mentor.jee_rank || mentor.jee_adv_rank || mentor.neet_rank) && (
            <div className="profile-card-group mb-5">
              <div className="pm-section-title-new text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-3">
                Entrance Ranks
              </div>
              <div className="rank-grid-new grid grid-cols-2 gap-2">
                {mentor.kcet_rank && <RankSlot label="KCET" rank={mentor.kcet_rank} />}
                {mentor.comedk_rank && <RankSlot label="COMEDK" rank={mentor.comedk_rank} />}
                {mentor.jee_rank && <RankSlot label="JEE Main" rank={mentor.jee_rank} />}
                {mentor.jee_adv_rank && <RankSlot label="JEE Adv" rank={mentor.jee_adv_rank} />}
                {mentor.neet_rank && <RankSlot label="NEET" rank={mentor.neet_rank} />}
              </div>
            </div>
          )}

          {/* Languages & Expertise */}
          {(langs.length > 0 || helps.length > 0) && (
            <div className="profile-card-group mb-5">
              <div className="pm-section-title-new text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-3">
                Languages & Expertise
              </div>
              <div className="chip-container-new flex flex-wrap gap-2">
                {langs.map((l, i) => (
                  <span key={i} className="pill pill-green px-3 py-1 rounded-full text-[11px] font-medium">
                    🗣 {l}
                  </span>
                ))}
                {helps.map((item, i) => (
                  <span key={i} className="pill pill-blue px-3 py-1 rounded-full text-[11px] font-medium">
                    ✓ {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* About */}
          <div className="profile-card-group mb-5">
            <div className="pm-section-title-new text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-3">
              About Mentor
            </div>
            <div className="background-card-new bg-white rounded-xl p-5 shadow-sm text-sm text-gray-600 leading-relaxed">
              {bg}
            </div>
          </div>

          {/* Action */}
          <div className="profile-action-container flex flex-col gap-3 mt-7">
            <div className="fee-badge-new text-center text-sm text-gray-500">
              Session Fee: <strong className="text-indigo-600 text-lg">₹{CONFIG.SESSION_FEE}</strong>
            </div>
            <button
              onClick={onBookSession}
              className="book-session-btn-new w-full py-4 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition"
            >
              Book 1:1 Session →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon, label, value }) {
  if (!value || value === '—') return null;
  return (
    <div className="d-item-new flex items-center gap-3">
      <span className="d-icon w-8 h-8 flex items-center justify-center bg-gray-50 rounded-lg text-sm">
        {icon}
      </span>
      <div className="d-content flex-1">
        <span className="d-label block text-[9px] font-bold text-gray-400 uppercase tracking-wide">{label}</span>
        <span className="d-value block text-sm font-normal text-gray-700">{value}</span>
      </div>
    </div>
  );
}

function RankSlot({ label, rank }) {
  return (
    <div className="r-item-new bg-white rounded-lg p-3 shadow-sm text-center">
      <span className="r-label block text-[9px] font-bold text-indigo-600 mb-0.5">{label}</span>
      <span className="r-value block text-sm font-extrabold text-gray-800">Rank #{rank}</span>
    </div>
  );
}