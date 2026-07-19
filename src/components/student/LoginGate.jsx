import { useState } from 'react';
import { supabase, sbFetch } from '../../lib/supabase';
import { CONFIG } from '../../lib/config';
import { isValidEmail, isValidPhone } from '../../utils/validators';

export default function LoginGate({ mandatory, onClose, onSuccess, showToast }) {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [phoneError, setPhoneError] = useState(false);
  const [showError, setShowError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminPassError, setAdminPassError] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleContinue = async () => {
    const emailOk = isValidEmail(email);
    const phoneOk = isValidPhone(phone);

    setEmailError(!emailOk);
    setPhoneError(!phoneOk);
    setShowError(!emailOk || !phoneOk);

    if (!emailOk || !phoneOk) return;

    // Check if this matches admin credentials — done securely server-side,
    // no admin email/phone is ever stored or compared in the browser.
    setLoading(true);
    const { data, error: rpcError } = await supabase.rpc('verify_admin_identity', {
      input_email: email,
      input_phone: phone
    });
    setLoading(false);

    if (!rpcError && data === true) {
      setShowAdminPassword(true);
      return;
    }

    await submitLogin();
  };

  const submitLogin = async () => {
    setLoading(true);
    try {
      // Use Supabase client's upsert instead of raw REST API
      const { error } = await supabase.rpc('upsert_student', {
        p_email: email,
        p_phone: phone
      });

      if (error) {
        console.error('[Students upsert error]', error);
        throw error;
      }

      onSuccess({ email, phone });
    } catch (e) {
      console.error('[Students upsert failed]', e);
      showToast('⚠️ Could not save session: ' + (e.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const verifyAdminPassword = async () => {
    setVerifying(true);
    const { data, error: rpcError } = await supabase.rpc('verify_admin_password', {
      input_password: adminPassword
    });
    setVerifying(false);

    if (!rpcError && data === true) {
      sessionStorage.setItem('ns_admin_authed', '1');
      // Save admin session before redirect
      localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify({ email, phone }));
      window.location.href = '/admin';
    } else {
      setAdminPassError(true);
      setAdminPassword('');
      setTimeout(() => setAdminPassError(false), 2000);
    }
  };

  if (showAdminPassword) {
    return (
      <div className="fixed inset-0 z-[9500] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
        <div className="w-full max-w-sm bg-white rounded-2xl p-7 shadow-2xl animate-fadeUp">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center text-xl mx-auto mb-3">
            🔒
          </div>
          <h3 className="text-center text-base font-bold mb-1">Admin Access</h3>
          <p className="text-center text-gray-500 text-xs mb-4">Enter the admin password to continue.</p>
          <input
            type="password"
            value={adminPassword}
            onChange={e => setAdminPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && verifyAdminPassword()}
            placeholder="Admin password"
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 mb-2"
            autoFocus
          />
          {adminPassError && (
            <div className="text-center text-red-600 text-xs font-bold mb-3">❌ Invalid password</div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowAdminPassword(false);
                setAdminPassword('');
                setAdminPassError(false);
              }}
              className="flex-1 px-4 py-2 border-2 border-gray-200 bg-white text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={verifyAdminPassword}
              disabled={verifying}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-bold hover:shadow-lg transition disabled:opacity-50"
            >
              {verifying ? 'Checking…' : 'Verify →'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed inset-0 z-[9000] flex items-center justify-center p-4 ${mandatory ? '' : 'cursor-pointer'}`}>
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
        onClick={() => !mandatory && onClose()}
      />

      <div className="relative z-10 w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl animate-fadeUp">
        {!mandatory && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full border-2 border-indigo-100 bg-white text-gray-700 hover:border-indigo-600 hover:text-indigo-600 flex items-center justify-center text-base font-bold transition"
          >
            ✕
          </button>
        )}

        {/* Logo */}
        <div className="flex items-center gap-3 mb-5">
          <img
            src="/logo.png"
            alt="Namma Seniors"
            className="w-12 h-12 rounded-xl object-contain"
            onError={e => {
              e.target.style.display = 'none';
              e.target.nextElementSibling.style.display = 'flex';
            }}
          />
          <div
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-xl shadow-lg hidden"
          >
            🎓
          </div>
          <div>
            <strong className="block text-sm font-bold text-gray-900">Namma Seniors</strong>
            <span className="block text-[10px] text-gray-500">Built by NITK Students</span>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-2">Welcome, Aspirant! 👋</h2>
        <p className="text-sm text-gray-500 mb-4">Connect with seniors who cracked what you're targeting.</p>

        <div className="flex gap-2 bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4">
          <span className="text-sm text-indigo-600">✦</span>
          <p className="text-xs text-gray-700 leading-relaxed">
            Get direct 1:1 guidance for <strong>JEE, NEET, KCET &amp; COMEDK</strong>, plus{' '}
            <strong>Internship &amp; Placement strategies</strong> from seniors who've already been there.
          </p>
        </div>

        {/* Email */}
        <div className="mb-3">
          <label className="block mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && document.getElementById('gatePhone').focus()}
            placeholder="your@gmail.com"
            className={`w-full px-4 py-3 border-2 rounded-xl text-sm outline-none transition ${emailError ? 'border-red-500' : 'border-gray-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100'
              }`}
          />
        </div>

        {/* Phone */}
        <div className="mb-3">
          <label className="block mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Phone Number (WhatsApp)
          </label>
          <input
            id="gatePhone"
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleContinue()}
            placeholder="10-digit mobile number"
            maxLength="10"
            className={`w-full px-4 py-3 border-2 rounded-xl text-sm outline-none transition ${phoneError ? 'border-red-500' : 'border-gray-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100'
              }`}
          />
          {showError && (
            <div className="mt-2 text-xs text-red-600 font-semibold">
              Please enter a valid email and 10-digit phone number.
            </div>
          )}
        </div>

        <button
          onClick={handleContinue}
          disabled={loading}
          className="w-full mt-1 py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 transition"
        >
          {loading ? 'Saving…' : 'Continue to Browse Seniors →'}
        </button>
      </div>
    </div>
  );
}