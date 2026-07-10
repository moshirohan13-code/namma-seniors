import { fmtDate, fmtDateTime } from '../../utils/helpers';
import { CONFIG } from '../../lib/config';

export default function DetailModal({ data, type, mentors, onClose }) {
  if (!data) return null;

  return (
    <div
      id="detailModal"
      className="fixed inset-0 z-[9998] flex items-center justify-center p-5 bg-gray-900/70 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="detail-box w-full max-w-2xl max-h-[88vh] overflow-y-auto bg-white rounded-2xl shadow-2xl animate-slideUp"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="detail-head p-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl relative">
          <button
            onClick={onClose}
            className="detail-close absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 border-none text-white text-sm cursor-pointer flex items-center justify-center hover:bg-white/30 transition"
          >
            ✕
          </button>
          <h3 className="text-lg font-black mb-0.5">{getTitle(data, type)}</h3>
          <p className="text-white/80 text-xs">{getSubtitle(data, type)}</p>
        </div>

        {/* Body */}
        <div className="detail-body p-5">
          {type === 'booking' && <BookingDetails data={data} mentors={mentors} />}
          {(type === 'mentor' || type === 'app') && <PersonDetails data={data} type={type} />}
        </div>
      </div>
    </div>
  );
}

function getTitle(data, type) {
  if (type === 'booking') return data.student_name || 'Booking';
  return data.full_name || 'Details';
}

function getSubtitle(data, type) {
  if (type === 'booking') return `${data.mentor_name || 'Mentor'} • ${data.status || 'pending'}`;
  if (type === 'mentor') return 'Approved Mentor';
  return 'Pending Application';
}

function BookingDetails({ data, mentors }) {
  const proofUrl = data.payment_proof_url || data.screenshot_url || '';
  const mentorPhone =
    data.mentor_phone || mentors.find(m => String(m.id) === String(data.mentor_id))?.phone || '—';

  return (
    <div className="detail-grid grid grid-cols-2 gap-2">
      <DetailSlot label="Booking ID" value={data.id} />
      <DetailSlot label="Status" value={data.status || 'pending'} />
      <DetailSlot label="Student Name" value={data.student_name} />
      <DetailSlot label="Student Email" value={data.student_email} />
      <DetailSlot label="Student Phone" value={data.student_phone} />
      <DetailSlot label="Mentor Name" value={data.mentor_name} />
      <DetailSlot label="Mentor Phone" value={mentorPhone} />
      <DetailSlot label="Session Fee" value={`₹${data.session_fee || CONFIG.SESSION_FEE}`} />
      <DetailSlot label="Created" value={fmtDateTime(data.created_at)} />
      <DetailSlot label="Log-in Time" value={fmtDateTime(data.student_login_at || data.login_at || data.created_at)} />
      <DetailSlot label="Meet Link" value={data.meet_link || 'Not added'} fullWidth />
      {data.requirement_message && (
        <div className="col-span-2 mt-1">
          <div className="detail-label text-[9px] font-black uppercase tracking-wide text-gray-400 mb-1">
            What they're looking for
          </div>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-xs text-gray-800 leading-relaxed whitespace-pre-line">
            {data.requirement_message}
          </div>
        </div>
      )}
      {proofUrl && (
        <div className="col-span-2 mt-3">
          <a
            href={proofUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-indigo-600 font-bold text-xs bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200 no-underline hover:bg-indigo-100 transition"
          >
            📎 Open Payment Proof
          </a>
        </div>
      )}
    </div>
  );
}

function PersonDetails({ data, type }) {
  const canHelpWith = data.can_help_with || '';
  const experienceSection = canHelpWith ? (
    <div className="mt-4">
      <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
        Experience & Internships
      </div>
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 text-green-900 text-sm leading-relaxed">
        {canHelpWith}
      </div>
    </div>
  ) : null;

  return (
    <>
      <div className="detail-grid grid grid-cols-2 gap-2">
        <DetailSlot label="Name" value={data.full_name} />
        <DetailSlot label="Phone" value={data.phone} />
        <DetailSlot label="College" value={data.college} />
        <DetailSlot label="Degree" value={data.degree} />
        <DetailSlot label="Branch" value={data.branch} />
        <DetailSlot label="Year" value={data.year} />
        <DetailSlot label="Exam Profile" value={data.exam_profile} />
        <DetailSlot label="Languages" value={data.languages} />
        <DetailSlot label="Home Location" value={data.home_location} />
        <DetailSlot label="Status" value={data.status} />
        <DetailSlot label="KCET Rank" value={data.kcet_rank} />
        <DetailSlot label="COMEDK Rank" value={data.comedk_rank} />
        <DetailSlot label="JEE Rank" value={data.jee_rank} />
        <DetailSlot label="JEE Adv Rank" value={data.jee_adv_rank} />
        <DetailSlot label="NEET Rank" value={data.neet_rank} />
        <DetailSlot label="NEET Marks" value={data.neet_marks} />
        <DetailSlot label="Created" value={fmtDate(data.created_at)} />
      </div>

      {experienceSection}

      {data.background && (
        <div className="mt-3">
          <DetailSlot label="Background" value={data.background} fullWidth />
        </div>
      )}

      {data.id_card_url && (
        <div className="mt-3">
          <a
            href={data.id_card_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-indigo-600 font-bold text-xs bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200 no-underline hover:bg-indigo-100 transition"
          >
            📎 Open ID Card
          </a>
        </div>
      )}
    </>
  );
}

function DetailSlot({ label, value, fullWidth = false }) {
  const empty = !value || value === '' || value === '—';
  if (empty && !fullWidth) return null;

  return (
    <div className={`detail-slot bg-gray-50 border border-gray-200 rounded-lg p-2 ${fullWidth ? 'col-span-2' : ''}`}>
      <div className="detail-label text-[9px] font-black uppercase tracking-wide text-gray-400 mb-1">
        {label}
      </div>
      <div className="detail-value text-xs font-bold text-gray-900 leading-snug break-words">
        {empty ? '—' : String(value)}
      </div>
    </div>
  );
}