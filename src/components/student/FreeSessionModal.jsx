import { useState } from 'react';
import { sbFetch } from '../../lib/supabase';
import { CONFIG } from '../../lib/config';
import { isValidPhone } from '../../utils/validators';

export default function FreeSessionModal({ studentSession, onClose, onSuccess, showToast }) {
  const [phone, setPhone] = useState(studentSession?.phone || '');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [helpTopic, setHelpTopic] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherText, setOtherText] = useState('');

  const HELP_OPTIONS = ['Exam guidance', 'College selection', 'Career & interview prep', 'Just want to talk to a senior'];

  const handleOptionClick = opt => {
    if (opt === 'Other') {
      setShowOtherInput(true);
      return;
    }
    setHelpTopic(opt);
    setShowOtherInput(false);
  };

  const handleSubmit = async () => {
    const cleanPhone = phone.replace(/\D/g, '');

    if (!isValidPhone(cleanPhone)) {
      showToast('⚠️ Please enter a valid 10-digit mobile number.');
      return;
    }

    const finalHelp = (showOtherInput ? otherText.trim() : helpTopic) || '';
    if (!finalHelp) {
      showToast('⚠️ Let us know how we can help you.');
      return;
    }

    setSubmitting(true);

    try {
      await sbFetch('bookings', {
        method: 'POST',
        body: {
          student_email: studentSession?.email || '',
          student_name: studentSession?.email?.split('@')[0] || 'Student',
          student_phone: cleanPhone,
          mentor_name: CONFIG.FREE_REQUEST_MENTOR,
          mentor_phone: CONFIG.ADMIN_PHONE.slice(2), // Remove '91' prefix
          requirement_message: finalHelp,
          session_fee: 0,
          mentor_payout: 0,
          platform_fee: 0,
          status: 'pending',
          created_at: new Date().toISOString()
        }
      });

      setSuccess(true);
      onSuccess();
    } catch (e) {
      console.error('[Free Booking]', e);
      showToast('❌ Could not submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="m-overlay fixed inset-0 z-[800] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md" onClick={onClose}>
      <div
        className="m-box free-session-modal-box w-full max-w-md bg-white rounded-3xl shadow-2xl animate-fadeUp overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="checkout-header free-session-header relative text-white bg-gradient-to-r from-indigo-600 to-purple-600 py-5 px-6 rounded-t-3xl">
          <button
            onClick={onClose}
            className="m-close absolute top-3 right-3 w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center text-sm"
          >
            ✕
          </button>
          <div className="tag text-[9px] font-bold uppercase tracking-widest text-indigo-200 mb-1">
            🎁 Free Intro Session
          </div>
          <h3 className="text-lg font-bold">Book a Free Session</h3>
        </div>

        {/* Body */}
        <div className="checkout-body p-5">
          {!success ? (
            <>
              <div className="free-session-intro text-center py-4">
                <div className="free-session-intro-icon text-4xl mb-3">📞</div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Book a 2-3 minute free intro call with a senior mentor. Get clarity on your exam prep and college
                  choices!
                </p>
              </div>

              <div className="free-session-input-wrap mb-4">
                <label className="file-upload-label block mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  WhatsApp Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="Enter 10-digit mobile number"
                  maxLength="10"
                  className="gate-input w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
                />
              </div>

              <div className="free-session-help-wrap mb-4">
                <label className="file-upload-label block mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  How can we help you? <span className="text-red-500">*</span>
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[...HELP_OPTIONS, 'Other'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleOptionClick(opt)}
                      className={`px-3 py-1.5 border-2 text-[11.5px] font-semibold rounded-full transition ${(opt === 'Other' && showOtherInput) || (!showOtherInput && helpTopic === opt)
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'bg-white border-indigo-200 text-indigo-700 hover:border-indigo-600'
                        }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                {showOtherInput && (
                  <textarea
                    value={otherText}
                    onChange={e => setOtherText(e.target.value)}
                    rows={2}
                    placeholder="Tell us a bit about what you need…"
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 resize-none"
                  />
                )}
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="confirm-btn free-session-confirm-btn w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                <span>✅</span>
                <span>{submitting ? 'Submitting…' : 'Request Free Session'}</span>
              </button>
            </>
          ) : (
            <div className="free-session-success flex flex-col items-center text-center py-6">
              <div className="free-session-success-icon w-[70px] h-[70px] rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center shadow-lg mb-4 text-3xl">
                🎉
              </div>
              <h3 className="text-xl font-bold text-green-800 mb-2">Thank You!</h3>
              <p className="text-sm text-gray-600 leading-relaxed max-w-xs mb-4">
                Our team will reach out to you shortly via WhatsApp.
              </p>
              <button
                onClick={onClose}
                className="success-done-btn w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition"
              >
                Continue Browsing →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}