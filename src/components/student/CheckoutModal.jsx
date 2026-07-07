import { useState } from 'react';
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

  const handleFileChange = async e => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      showToast('⚠️ Max 10MB.');
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
      showToast('✅ Screenshot uploaded!');
    } catch (err) {
      console.error('[Upload]', err);
      showToast('❌ Upload failed – try again.');
      onPaymentProofUpload('');
      setFileName('');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    await onConfirm();
    setConfirming(false);
  };

  const copyUPI = () => {
    navigator.clipboard
      .writeText(CONFIG.UPI_ID)
      .then(() => showToast('📋 UPI ID copied!'))
      .catch(() => showToast(`UPI: ${CONFIG.UPI_ID}`));
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
          {step === 'payment' && (
            <div id="checkoutPaymentSection">
              {/* QR Section */}
              <div className="qr-section text-center p-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 mb-4">
                <div className="qr-merchant flex items-center justify-center gap-2 mb-2">
                  <div className="qr-merchant-icon w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center text-[11px] font-bold">
                    R
                  </div>
                  <div className="qr-merchant-name text-sm font-bold">Rohan Moshi</div>
                </div>
                <div className="qr-img-wrap flex justify-center mb-2">
                  <img
                    src="/qr-code.png"
                    alt="UPI QR"
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

              {/* Copy UPI */}
              <div className="upi-id-copy flex items-center justify-between border-2 border-gray-200 rounded-xl px-3 py-2 mb-4 bg-white">
                <span className="upi-id-text text-sm font-semibold">{CONFIG.UPI_ID}</span>
                <button onClick={copyUPI} className="copy-btn text-indigo-600 text-base">
                  📋
                </button>
              </div>

              {/* Student Details */}
              <div className="student-verify-box flex flex-col gap-1 bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
                <div className="student-verify-label text-[9px] font-bold text-blue-800 uppercase tracking-wide mb-1">
                  ✅ Your Details
                </div>
                <div className="student-verify-row flex justify-between gap-2">
                  <span className="student-verify-key text-xs text-gray-500">Name</span>
                  <span className="student-verify-value text-xs font-bold text-gray-900">{studentName}</span>
                </div>
                <div className="student-verify-row flex justify-between gap-2">
                  <span className="student-verify-key text-xs text-gray-500">Phone</span>
                  <span className="student-verify-value text-xs font-bold text-gray-900">{studentPhone}</span>
                </div>
                <div className="student-verify-row flex justify-between gap-2">
                  <span className="student-verify-key text-xs text-gray-500">Email</span>
                  <span className="student-verify-value text-[11px] font-bold text-gray-900">{studentEmail}</span>
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

              {/* Confirm Button */}
              <button
                onClick={handleConfirm}
                disabled={!paymentProofUrl || confirming}
                className="confirm-btn w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 transition flex items-center justify-center gap-2"
              >
                <span>✅</span>
                <span>{confirming ? 'Processing…' : 'Confirm Booking'}</span>
              </button>
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
                      30 minutes of personalised guidance from your senior mentor!
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