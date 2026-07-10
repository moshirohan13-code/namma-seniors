import { useState, useEffect } from 'react';
import { sbUpload } from '../../lib/supabase';
import { CONFIG } from '../../lib/config';
import { fmtDate, fmtTime } from '../../utils/helpers';

export default function CheckoutModal({
  mentor,
  studentSession,
  step,
  paymentProofUrl,
  onPaymentProofUpload,
  onConfirm,
  onClose,
  showToast
}) {
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [chatStep, setChatStep] = useState(0);
  const [chatAnswers, setChatAnswers] = useState({});
  const [showTextInput, setShowTextInput] = useState(false);
  const [textValue, setTextValue] = useState('');
  useEffect(() => {
    if (!chatStarted) return;
    setIsTyping(true);
    const t = setTimeout(() => setIsTyping(false), 700);
    return () => clearTimeout(t);
  }, [chatStarted, chatStep]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!chatStarted) return;
    setIsTyping(true);
    const t = setTimeout(() => setIsTyping(false), 700);
    return () => clearTimeout(t);
  }, [chatStarted, chatStep]);

  const QUESTIONS = [
    {
      key: 'topic',
      label: 'Focus area',
      text: 'What subject or exam are you focused on?',
      options: ['JEE', 'NEET', 'KCET', 'COMEDK', 'Career advice']
    },
    {
      key: 'help',
      label: 'Looking for',
      text: 'What exactly are you hoping to get out of this session?',
      options: ['College prediction', 'Branch selection', 'Exam strategy', 'Resume & career guidance']
    },
    {
      key: 'details',
      label: 'Marks / rank',
      text: "Any specific marks, rank, or category you'd like to share?",
      options: [
        { label: "I'll share my marks/rank", needsText: true },
        { label: "Haven't taken the exam yet" }
      ]
    }
  ];

  const getOptions = q => {
    const base = q.options.map(o => (typeof o === 'string' ? { label: o, needsText: false } : o));
    return [...base, { label: 'Other', needsText: true }];
  };

  const handleOptionClick = opt => {
    if (opt.needsText) {
      setShowTextInput(true);
      return;
    }
    setChatAnswers(prev => ({ ...prev, [QUESTIONS[chatStep].key]: opt.label }));
    setChatStep(prev => prev + 1);
  };

  const handleTextSubmit = () => {
    const val = textValue.trim();
    if (!val) return;
    setChatAnswers(prev => ({ ...prev, [QUESTIONS[chatStep].key]: val }));
    setTextValue('');
    setShowTextInput(false);
    setChatStep(prev => prev + 1);
  };

  const goBack = () => {
    setShowTextInput(false);
    setTextValue('');
    if (chatStep === 0) {
      setChatStarted(false);
      return;
    }
    const prevKey = QUESTIONS[chatStep - 1].key;
    setChatAnswers(prev => {
      const next = { ...prev };
      delete next[prevKey];
      return next;
    });
    setChatStep(prev => prev - 1);
  };

  const handleFileChange = async e => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('⚠️ Max 10MB.', 'top');
      e.target.value = '';
      return;
    }

    setFileName(file.name);
    setUploading(true);

    try {
      const safePhone = (studentSession.phone || '').replace(/\D/g, '');
      const ext = file.name.split('.').pop().toLowerCase() || 'jpg';
      const url = await sbUpload('booking-proofs', `proofs/${safePhone}_${Date.now()}.${ext}`, file);
      onPaymentProofUpload(url);
      showToast('✅ Screenshot uploaded!', 'top');
    } catch (err) {
      console.error('[Upload]', err);
      showToast('❌ Upload failed – try again.', 'top');
      onPaymentProofUpload('');
      setFileName('');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm(chatAnswers);
    setConfirming(false);
  };

  const copyUPI = () => {
    navigator.clipboard
      .writeText(CONFIG.UPI_ID)
      .then(() => showToast('✅ UPI ID copied!'))
      .catch(() => showToast(`UPI: ${CONFIG.UPI_ID}`));
  };

  const copyName = () => {
    navigator.clipboard
      .writeText('Rohan Moshi')
      .then(() => showToast('✅ Name copied!'))
      .catch(() => showToast('Rohan Moshi'));
  };


  const studentName = (studentSession?.email || '').split('@')[0] || 'Student';
  const studentPhone = studentSession?.phone || '—';
  const studentEmail = studentSession?.email || '—';

  return (
    <div className="m-overlay fixed inset-0 z-[800] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md" onClick={onClose}>
      <div
        className="m-box checkout-modal w-full max-w-md max-h-[92vh] overflow-y-auto bg-white rounded-3xl shadow-2xl animate-fadeUp"
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
            🔒 Secure Checkout
          </div>
          <h3 className="text-lg font-bold">Confirm Your Session</h3>
        </div>

        {/* Body */}
        <div className="checkout-body p-5">
          {step === 'payment' && !chatStarted && (
            <div id="checkoutPaymentSection">
              {/* QR Section */}
              <div className="qr-section text-center p-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 mb-4">

                <div className="qr-img-wrap flex justify-center mb-2">
                  <img
                    src="/qr-code.png"
                    alt="UPI QR"
                    width="288"
                    height="288"
                    loading="eager"
                    fetchpriority="high"
                    decoding="sync"
                    className="w-72 h-72 rounded-lg object-contain"
                    onError={e => (e.target.style.display = 'none')}
                  />
                </div>
                <div className="qr-upi-id text-gray-500 text-[11px]">
                  UPI ID: <strong>{CONFIG.UPI_ID}</strong>
                </div>
                <div className="qr-amount text-sm font-bold my-0.5">Amount: ₹{CONFIG.SESSION_FEE}.00</div>
                <div className="qr-hint text-gray-500 text-[11px]">Scan with any UPI app</div>
              </div>

              {/* Copy UPI / Name */}
              <div className="flex flex-col gap-2 mb-4">
                <div className="upi-id-copy flex items-center justify-between px-3 py-2">
                  <span className="upi-id-text text-sm font-semibold">{CONFIG.UPI_ID}</span>
                  <button onClick={copyUPI} className="copy-btn text-indigo-600 hover:text-indigo-800 transition">
                    <CopyIcon />
                  </button>
                </div>

              </div>

              {/* Student Details */}
              <div className="student-verify-box flex flex-col gap-1 bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
                <div className="student-verify-label text-[9px] font-bold text-blue-800 uppercase tracking-wide mb-1">
                  ✅ Your Details
                </div>
                <div className="student-verify-row flex justify-between items-center gap-2">
                  <span className="student-verify-key text-xs text-gray-500">Support Contact</span>
                  <span className="student-verify-value text-xs font-bold text-gray-900">8147157714</span>
                </div>
              </div>

              {/* File Upload */}
              <div className="file-upload-wrap mb-4">
                <label className="file-upload-label block mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  Upload Payment Screenshot <span className="text-red-500">*</span>
                </label>
                <label
                  htmlFor="paymentProofFile"
                  className={`file-upload-trigger w-full px-3 py-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-gray-500 text-xs font-semibold cursor-pointer transition ${paymentProofUrl
                    ? 'border-green-300 bg-green-50 text-green-700'
                    : 'border-gray-300 bg-white hover:border-indigo-400'
                    }`}
                >
                  <span className="text-sm">📎</span>
                  <span>{fileName || 'Click to upload screenshot (JPG/PNG)'}</span>
                </label>
                <input
                  type="file"
                  id="paymentProofFile"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {uploading && <div className="upload-status text-[10px] font-semibold text-gray-500 mt-1">⏳ Uploading…</div>}
                {paymentProofUrl && !uploading && (
                  <div className="upload-status text-[10px] font-semibold text-green-700 mt-1">✅ Screenshot uploaded!</div>
                )}
              </div>

              {/* Breakdown */}
              <div className="breakdown-title text-[9px] font-extrabold uppercase tracking-widest text-gray-400 mb-2">
                Payment Breakdown
              </div>
              <div className="mb-2">
                <div className="breakdown-item flex items-center justify-between py-2 border-b border-gray-100 text-xs">
                  <div className="breakdown-left flex items-center gap-2 text-gray-700">
                    <div className="b-icon w-6 h-6 rounded-lg bg-green-50 flex items-center justify-center text-xs">🎓</div>
                    <span>To Senior Mentor</span>
                  </div>
                  <span className="amt-green text-green-700 font-bold">₹{CONFIG.MENTOR_PAYOUT}</span>
                </div>
                <div className="breakdown-item flex items-center justify-between py-2 text-xs">
                  <div className="breakdown-left flex items-center gap-2 text-gray-700">
                    <div className="b-icon w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center text-xs">⚙️</div>
                    <span>Platform Fees & Operations</span>
                  </div>
                  <span className="amt-purple text-purple-700 font-bold">₹{CONFIG.PLATFORM_FEE}</span>
                </div>
              </div>

              {/* Donation Note */}
              <div className="donation-note flex gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-800 mb-3">
                <p className="text-[11px] leading-relaxed">
                  <strong>Platform Fees & Operations: ₹{CONFIG.PLATFORM_FEE}</strong> (Includes a ₹2 donation to support
                  underprivileged students).
                </p>
              </div>

              {/* Info Box */}
              <div className="info-box yellow bg-yellow-50 border border-yellow-200 text-yellow-900 rounded-xl p-3 mb-3 text-[11px] leading-relaxed">
                <strong>After paying:</strong> Upload your screenshot and confirm below. We'll verify your payment and share
                the Google Meet link shortly.
              </div>

              {/* Requirement Chat Intro */}
              <div className="requirement-chat-wrap mb-4">
                <div className="requirement-chat-bubble flex gap-2 bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-3">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    R
                  </div>
                  <p className="text-[11.5px] text-gray-700 leading-relaxed">
                    Hi 👋 I'm Rohan from Namma Seniors. Once you're ready, hit Next and I'll ask a few quick
                    questions.
                  </p>
                </div>
                <button
                  onClick={() => setChatStarted(true)}
                  disabled={!paymentProofUrl}
                  className="w-full py-2.5 px-4 border-2 border-indigo-600 text-indigo-600 text-xs font-bold rounded-xl disabled:opacity-40 disabled:border-gray-300 disabled:text-gray-400 transition"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {step === 'payment' && chatStarted && (
            <div id="checkoutRequirementSection">
              {chatStep > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {QUESTIONS.slice(0, chatStep).map(q => (
                    <span
                      key={q.key}
                      className="text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-1"
                    >
                      ✓ {q.label}: {chatAnswers[q.key]}
                    </span>
                  ))}
                </div>
              )}

              {chatStep < QUESTIONS.length ? (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <button
                      onClick={goBack}
                      className="text-[10.5px] font-semibold text-indigo-500 hover:text-indigo-700 transition"
                    >
                      ← Back
                    </button>
                    <span className="text-[10px] font-semibold text-indigo-400">
                      Question {chatStep + 1} of {QUESTIONS.length}
                    </span>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                      R
                    </div>
                    {isTyping ? (
                      <TypingDots />
                    ) : (
                      <p className="text-[11.5px] text-gray-700 leading-relaxed pt-1">
                        {QUESTIONS[chatStep].text}
                      </p>
                    )}
                  </div>

                  {!isTyping && !showTextInput ? (
                    <div className="flex flex-wrap gap-1.5">
                      {getOptions(QUESTIONS[chatStep]).map(opt => (
                        <button
                          key={opt.label}
                          onClick={() => handleOptionClick(opt)}
                          className="px-3 py-1.5 bg-white border-2 border-indigo-200 text-indigo-700 text-[11.5px] font-semibold rounded-full hover:border-indigo-600 hover:bg-indigo-100 transition"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  ) : !isTyping ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={textValue}
                        onChange={e => setTextValue(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleTextSubmit()}
                        placeholder="Type your answer…"
                        className="flex-1 px-3 py-2 border-2 border-gray-200 rounded-xl text-xs outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 bg-white"
                      />
                      <button
                        onClick={handleTextSubmit}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-bold rounded-xl"
                      >
                        →
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="requirement-chat-bubble flex gap-2 bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                    R
                  </div>
                  {isTyping ? (
                    <TypingDots />
                  ) : (
                    <p className="text-[11.5px] text-green-900 leading-relaxed">
                      Thank you! 🙏 That's everything I need — hit Confirm Booking below and we'll connect you with
                      your mentor.
                    </p>
                  )}
                </div>
              )}

              {chatStep >= QUESTIONS.length && !isTyping && (
                <button
                  onClick={handleConfirm}
                  disabled={!paymentProofUrl || confirming}
                  className="confirm-btn w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
                >
                  <span>{confirming ? 'Processing…' : 'Confirm Booking →'}</span>
                </button>
              )}
            </div>
          )}

          {step === 'success' && (
            <div id="checkoutSuccessSection" className="success-wrap flex flex-col items-center text-center py-4 px-5">
              <div className="success-icon-ring w-[70px] h-[70px] rounded-full bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center shadow-lg mb-4 text-3xl">
                🎉
              </div>
              <h3 className="success-title text-xl font-bold mb-1">Booking Successful!</h3>
              <p className="success-sub max-w-xs text-sm text-gray-600 leading-relaxed mb-4">
                Your session has been confirmed and your payment proof has been submitted.
              </p>

              {/* Success Details */}
              <div className="success-details w-full mb-4">
                <div className="success-detail-grid grid grid-cols-2 gap-2 text-left">
                  <div className="success-detail-slot bg-gray-50 border border-gray-200 rounded-lg p-2">
                    <div className="success-detail-label text-[8px] font-extrabold uppercase tracking-wide text-gray-400 mb-0.5">
                      Mentor
                    </div>
                    <div className="success-detail-value text-xs font-semibold text-gray-900">{mentor.full_name}</div>
                  </div>
                  <div className="success-detail-slot bg-gray-50 border border-gray-200 rounded-lg p-2">
                    <div className="success-detail-label text-[8px] font-extrabold uppercase tracking-wide text-gray-400 mb-0.5">
                      Amount Paid
                    </div>
                    <div className="success-detail-value text-xs font-semibold text-gray-900">₹{CONFIG.SESSION_FEE}</div>
                  </div>
                  <div className="success-detail-slot bg-gray-50 border border-gray-200 rounded-lg p-2">
                    <div className="success-detail-label text-[8px] font-extrabold uppercase tracking-wide text-gray-400 mb-0.5">
                      Student
                    </div>
                    <div className="success-detail-value text-xs font-semibold text-gray-900">{studentName}</div>
                  </div>
                  <div className="success-detail-slot bg-gray-50 border border-gray-200 rounded-lg p-2">
                    <div className="success-detail-label text-[8px] font-extrabold uppercase tracking-wide text-gray-400 mb-0.5">
                      Booked On
                    </div>
                    <div className="success-detail-value text-xs font-semibold text-gray-900">
                      {fmtDate(new Date())} {fmtTime(new Date())}
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Steps */}
              <div className="success-next-steps w-full text-left mb-4">
                <div className="success-step flex gap-3 py-3 border-b border-gray-100">
                  <div className="success-step-icon w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-sm flex-shrink-0">
                    ✅
                  </div>
                  <div>
                    <div className="success-step-title text-xs font-bold text-gray-900 mb-0.5">Payment Verification</div>
                    <div className="success-step-desc text-[11px] text-gray-500 leading-snug">
                      We'll verify your payment screenshot within minutes.
                    </div>
                  </div>
                </div>
                <div className="success-step flex gap-3 py-3 border-b border-gray-100">
                  <div className="success-step-icon w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-sm flex-shrink-0">
                    🔗
                  </div>
                  <div>
                    <div className="success-step-title text-xs font-bold text-gray-900 mb-0.5">Meet Link Delivery</div>
                    <div className="success-step-desc text-[11px] text-gray-500 leading-snug">
                      Once verified, the Google Meet link will appear in your <strong>My Bookings</strong> section
                      automatically.
                    </div>
                  </div>
                </div>
                <div className="success-step flex gap-3 py-3">
                  <div className="success-step-icon w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-sm flex-shrink-0">
                    🎓
                  </div>
                  <div>
                    <div className="success-step-title text-xs font-bold text-gray-900 mb-0.5">Enjoy Your Session</div>
                    <div className="success-step-desc text-[11px] text-gray-500 leading-snug">
                      20–25 minutes of personalised guidance from your senior mentor!
                    </div>
                  </div>
                </div>
              </div>

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

function CopyIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 pt-2 pl-1">
      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}