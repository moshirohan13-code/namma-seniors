import { useState, useEffect } from 'react';
import { fmtDate, fmtDateTime } from '../../utils/helpers';
import { CONFIG } from '../../lib/config';
import { supabase } from '../../lib/supabase';

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
  const who = data.category === 'placement' ? 'Placed Senior' : 'Entrance Senior';
  if (type === 'mentor') return `Approved ${who}`;
  return `Pending Application • ${who}`;
}

function experienceText(x) {
  if (x.experience_level === 'fresher') return 'Fresher';
  if (x.experience_level === 'experienced') {
    const y = Number(x.years_experience);
    return y ? `${y} ${y === 1 ? 'yr' : 'yrs'} experience` : 'Experienced';
  }
  return x.experience_level ? 'Newly Joined' : '';
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
  const isPlaced = data.category === 'placement';
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

  const safeYoutube = isSafeSocialUrl(data.youtube_link, ['youtube.com', 'www.youtube.com', 'youtu.be']);
  const safeInstagram = isSafeSocialUrl(data.instagram_link, ['instagram.com', 'www.instagram.com']);

  const socialLinksSection = (safeYoutube || safeInstagram) ? (
    <div className="mt-4 flex gap-2">
      {safeYoutube && (
        <a
          href={safeYoutube}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex items-center gap-1 text-red-600 font-bold text-xs bg-red-50 px-3 py-2 rounded-lg border border-red-200 no-underline hover:bg-red-100 transition"
        >
          ▶️ YouTube
        </a>
      )}
      {safeInstagram && (
        <a
          href={safeInstagram}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="inline-flex items-center gap-1 text-pink-600 font-bold text-xs bg-pink-50 px-3 py-2 rounded-lg border border-pink-200 no-underline hover:bg-pink-100 transition"
        >
          📸 Instagram
        </a>
      )}
    </div>
  ) : null;

  return (
    <>
      <div className="detail-grid grid grid-cols-2 gap-2">
        <DetailSlot label="Name" value={data.full_name} />
        <DetailSlot label="Phone" value={data.phone} />
        <DetailSlot label="Email" value={data.email} fullWidth />
        <DetailSlot label="Type" value={isPlaced ? 'Placed Senior' : 'Entrance Senior'} />
        <DetailSlot label="Status" value={data.status} />

        {isPlaced && (
          <>
            <DetailSlot label="Company" value={data.company} />
            <DetailSlot label="Role" value={data.role} />
            <DetailSlot label="Experience" value={experienceText(data)} />
            {type === 'mentor' && (
              <>
                <DetailSlot label="Student Pays" value={`₹${data.session_fee || CONFIG.PLACEMENT_SESSION_FEE}`} />
                <DetailSlot label="Senior Earns" value={`₹${data.mentor_payout || CONFIG.PLACEMENT_MENTOR_PAYOUT}`} />
              </>
            )}
          </>
        )}

        <DetailSlot label="College" value={data.college} />
        <DetailSlot label="Degree" value={data.degree} />
        <DetailSlot label="Branch" value={data.branch} />
        <DetailSlot label="Year" value={data.year} />

        {!isPlaced && (
          <>
            <DetailSlot label="Exam Profile" value={data.exam_profile} />
            <DetailSlot label="KCET Rank" value={data.kcet_rank} />
            <DetailSlot label="COMEDK Rank" value={data.comedk_rank} />
            <DetailSlot label="JEE Rank" value={data.jee_rank} />
            <DetailSlot label="JEE Adv Rank" value={data.jee_adv_rank} />
            <DetailSlot label="NEET Rank" value={data.neet_rank} />
            <DetailSlot label="NEET Marks" value={data.neet_marks} />
          </>
        )}

        <DetailSlot label="Languages" value={data.languages} />
        <DetailSlot label="Home Location" value={data.home_location} />
        <DetailSlot label="Created" value={fmtDate(data.created_at)} />
      </div>

      {experienceSection}
      {socialLinksSection}

      {data.background && (
        <div className="mt-3">
          <DetailSlot label="Background" value={data.background} fullWidth />
        </div>
      )}

      {data.id_card_url && <IdCardLink url={data.id_card_url} />}
    </>
  );
}

function IdCardLink({ url }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getSignedUrl() {
      setLoading(true);
      try {
        // Extract the file path after "mentor-ids/" from the stored URL
        const parts = url.split('mentor-ids/');
        const filePath = parts[1]?.split('?')[0];

        if (!filePath) {
          setSignedUrl(null);
          return;
        }

        const { data, error } = await supabase
          .storage
          .from('mentor-ids')
          .createSignedUrl(filePath, 300); // link valid for 5 minutes

        if (error) throw error;
        setSignedUrl(data.signedUrl);
      } catch (e) {
        console.error('[IdCardLink]', e);
        setSignedUrl(null);
      } finally {
        setLoading(false);
      }
    }
    getSignedUrl();
  }, [url]);

  if (loading) {
    return <div className="mt-3 text-xs text-gray-400">Loading ID card link…</div>;
  }

  if (!signedUrl) {
    return <div className="mt-3 text-xs text-red-500">⚠️ Could not load ID card.</div>;
  }

  return (
    <div className="mt-3">
      <a
        href={signedUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-indigo-600 font-bold text-xs bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-200 no-underline hover:bg-indigo-100 transition"
      >
        📎 Open ID Card
      </a>
    </div>
  );
}

function isSafeSocialUrl(url, allowedHosts) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return null;
    if (!allowedHosts.includes(parsed.hostname.toLowerCase())) return null;
    return parsed.href;
  } catch {
    return null;
  }
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