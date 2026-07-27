import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { CONFIG } from '../../lib/config';
import { fmtDate, fmtTime } from '../../utils/helpers';

export default function CheckoutModal({
  mentor,
  studentSession,
  step,
  onConfirm,
  onClose,
  showToast
}) {
  const [paying, setPaying] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [chatStep, setChatStep] = useState(0);
  const [chatAnswers, setChatAnswers] = useState({});
  const [showTextInput, setShowTextInput] = useState(false);
  const [textValue, setTextValue] = useState('');
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

  async function handlePay() {
    if (!window.Razorpay) {
      showToast('⚠️ Payment system still loading, please try again in a moment.', 'top');
      return;
    }

    setPaying(true);

    try {
      const { data: orderData, error: orderError } = await supabase.functions.invoke('create-booking-order', {
        body: { mentor_id: mentor.id, amount: CONFIG.SESSION_FEE }
      });

      if (orderError || !orderData?.order_id) {
        throw new Error(orderData?.error || orderError?.message || 'Could not start payment.');
      }

      const rzp = new window.Razorpay({
        key: orderData.key_id,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Namma Seniors',
        description: `Session with ${mentor.full_name}`,
        order_id: orderData.order_id,
        prefill: {
          name: (studentSession?.email || '').split('@')[0] || 'Student',
          email: studentSession?.email || '',
          contact: studentSession?.phone || ''
        },
        theme: { color: '#4f46e5' },
        handler: async function (response) {
          try {
            const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-booking-payment', {
              body: {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              }
            });

            if (verifyError || !verifyData?.verified) {
              throw new Error(verifyData?.error || verifyError?.message || 'Payment verification failed.');
            }

            setPaying(false);
            setChatStarted(true);
            window.__pendingPaymentInfo = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id
            };
          } catch (e) {
            console.error('[CheckoutModal] verify', e);
            showToast('❌ Payment verification failed: ' + (e.message || 'Unknown error'), 'top');
            setPaying(false);
          }
        },
        modal: {
          ondismiss: function () {
            setPaying(false);
          }
        }
      });

      rzp.on('payment.failed', function () {
        setPaying(false);
        showToast('❌ Payment failed or was cancelled.', 'top');
      });

      rzp.open();
    } catch (e) {
      console.error('[CheckoutModal] handlePay', e);
      showToast('❌ ' + (e.message || 'Something went wrong starting payment.'), 'top');
      setPaying(false);
    }
  }

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm(chatAnswers, window.__pendingPaymentInfo || null);
    window.__pendingPaymentInfo = null;
    setConfirming(false);
  };

  const studentName = (studentSession?.email || '').split('@')[0] || 'Student';

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
              <div className="text-center p-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 mb-4">
                <div className="text-sm font-bold my-0.5">Amount: ₹{CONFIG.SESSION_FEE}.00</div>
                <div className="text-gray-500 text-[11px]">Secure payment via Razorpay</div>
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

              <div className="donation-note flex gap-2 p-3 rounded-xl bg-green-50 border border-green-200 text-green-800 mb-3">
                <p className="text-[11px] leading-relaxed">
                  <strong>Platform Fees & Operations: ₹{CONFIG.PLATFORM_FEE}</strong> (Includes a ₹2 donation to support
                  underprivileged students).
                </p>
              </div>

              <button
                onClick={handlePay}
                disabled={paying}
                className="w-full mt-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 transition"
              >
                {paying ? 'Please wait…' : `Pay ₹${CONFIG.SESSION_FEE} →`}
              </button>
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
                  disabled={confirming}
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
                Your session has been confirmed and your payment has been verified.
              </p>

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

              <div className="success-next-steps w-full text-left mb-4">
                <div className="success-step flex gap-3 py-3 border-b border-gray-100">
                  <div className="success-step-icon w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-sm flex-shrink-0">
                    🔗
                  </div>
                  <div>
                    <div className="success-step-title text-xs font-bold text-gray-900 mb-0.5">Meet Link Delivery</div>
                    <div className="success-step-desc text-[11px] text-gray-500 leading-snug">
                      The Google Meet link will appear in your <strong>My Bookings</strong> section shortly.
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

function TypingDots() {
  return (
    <div className="flex items-center gap-1 pt-2 pl-1">
      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
      <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}