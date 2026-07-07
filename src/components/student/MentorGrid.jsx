import { pickPalette, getInitials, esc, examTagClass, parseExams } from '../../utils/helpers';
import { CONFIG } from '../../lib/config';

export default function MentorGrid({ mentors, showAll, onViewAll, onBookSession }) {
  const visibleMentors = showAll ? mentors : mentors.slice(0, CONFIG.INITIAL_MENTOR_COUNT);
  const hasMore = !showAll && mentors.length > CONFIG.INITIAL_MENTOR_COUNT;

  if (!mentors.length) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-16 text-center">
        <svg
          className="w-10 h-10 text-gray-400 mx-auto mb-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
        </svg>
        <p className="text-gray-500">No verified mentors match your filters.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mentor-grid max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {visibleMentors.map(mentor => (
          <MentorCard key={mentor.id} mentor={mentor} onBook={onBookSession} />
        ))}
      </div>

      {/* View All */}
      {hasMore && (
        <div className="view-all-wrap max-w-6xl mx-auto text-center px-6 pb-6">
          <button
            onClick={onViewAll}
            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-indigo-200 bg-white text-indigo-600 rounded-xl text-sm font-bold hover:bg-indigo-50 hover:-translate-y-0.5 transition"
          >
            View All Mentors
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <p className="text-xs text-gray-400 mt-2">
            Showing {visibleMentors.length} of {mentors.length} mentors
          </p>
        </div>
      )}
    </>
  );
}

function MentorCard({ mentor, onBook }) {
  const [colorA, colorB] = pickPalette(mentor.full_name);
  const exams = parseExams(mentor.exam_profile);

  return (
    <div className="mentor-card relative flex flex-col bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-md hover:shadow-xl hover:-translate-y-1 transition" style={{ minWidth: '340px' }}>
      {/* Color Bar */}
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${colorA}, ${colorB})` }} />

      {/* Body */}
      <div className="card-body flex flex-col flex-1 p-6">
        {/* Header */}
        <div className="card-header flex gap-3 items-start mb-3">
          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-extrabold shadow-lg flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${colorA}, ${colorB})` }}
          >
            {getInitials(mentor.full_name)}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="card-name text-base font-extrabold text-gray-900 leading-tight mb-1 truncate">
              {mentor.full_name}
            </div>
            <div className="card-college text-xs text-gray-600 mb-0.5 line-clamp-1">
              {mentor.college || '—'}
            </div>
            <span className="card-year text-[11px] text-gray-400 font-medium">{mentor.year || ''}</span>
          </div>
        </div>

        {/* Branch */}
        <div className="card-branch flex items-center gap-2 text-xs text-gray-600 mb-3 pb-3 border-b border-gray-100">
          <svg width="12" height="12" fill="none" stroke="#9ca3af" strokeWidth="1.5" viewBox="0 0 24 24">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
          <span className="truncate">{mentor.branch || '—'}</span>
        </div>

        {/* Exam Tags */}
        <div className="exam-tags flex flex-wrap gap-1 mb-3 min-h-[24px]">
          {exams.map((exam, i) => (
            <span
              key={i}
              className={`exam-tag px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${examTagClass(
                exam
              )}`}
            >
              {exam}
            </span>
          ))}
        </div>

        {/* Ranks */}
        <div className="ranks-row flex gap-2 mb-4 min-h-[62px]">
          {buildRankBoxes(mentor)}
        </div>

        {/* Book Button */}
        <button
          onClick={() => onBook(mentor)}
          className="card-book-btn w-full mt-auto py-3 px-4 rounded-xl text-white text-sm font-bold shadow-lg hover:opacity-95 hover:-translate-y-0.5 transition"
          style={{ background: `linear-gradient(90deg, ${colorA}, ${colorB})` }}
        >
          View Profile &amp; Book Session
        </button>
      </div>
    </div>
  );
}

function buildRankBoxes(mentor) {
  const boxes = [];
  if (mentor.kcet_rank) boxes.push({ num: String(mentor.kcet_rank), lbl: 'KCET' });
  if (mentor.comedk_rank) boxes.push({ num: String(mentor.comedk_rank), lbl: 'COMEDK' });
  if (mentor.jee_rank) boxes.push({ num: String(mentor.jee_rank), lbl: 'JEE AIR' });
  if (mentor.jee_adv_rank) boxes.push({ num: String(mentor.jee_adv_rank), lbl: 'JEE Adv' });
  if (mentor.neet_rank) boxes.push({ num: String(mentor.neet_rank), lbl: 'NEET AIR' });

  if (!boxes.length) boxes.push({ num: '—', lbl: 'No Rank' });

  return boxes.slice(0, 2).map((box, i) => (
    <div
      key={i}
      className="rank-box flex-1 bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-100 rounded-xl p-2 text-center"
    >
      <div className="rank-num text-lg font-extrabold text-indigo-600 leading-tight">{box.num}</div>
      <div className="rank-label text-[9px] font-extrabold text-gray-500 uppercase tracking-wider mt-1">
        {box.lbl}
      </div>
    </div>
  ));
}