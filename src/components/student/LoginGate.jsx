import { useState, useEffect, useRef } from 'react';
import { supabase, sbFetch } from '../../lib/supabase';
import { CONFIG } from '../../lib/config';
import { isValidEmail, isValidPhone } from '../../utils/validators';

// Public Google "Web client" ID (safe to expose). Set VITE_GOOGLE_CLIENT_ID in .env and on Vercel.
// If it is missing, the old redirect-style Google button is used instead.
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();
    const src = 'https://accounts.google.com/gsi/client';
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// Random value + its SHA-256 hash (hex). Google gets the hash, Supabase gets the raw value.
async function makeNonce() {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const bytes = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hashed = Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return { raw, hashed };
}

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
  const [googleEmail, setGoogleEmail] = useState(null);
  const [googlePhone, setGooglePhone] = useState('');
  const [googlePhoneError, setGooglePhoneError] = useState(false);

  // Google's own button
  const gsiBtnRef = useRef(null);
  const nonceRef = useRef(null);
  const toastRef = useRef(showToast);
  const [gsiReady, setGsiReady] = useState(false);
  const [gsiFailed, setGsiFailed] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    toastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setGoogleEmail(session.user.email);
      }
    });
  }, []);

  // Draw Google's "Continue with Google" button when the main login view is showing
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || googleEmail || showAdminPassword) return;

    let cancelled = false;

    async function setup() {
      try {
        await loadGoogleScript();
        if (cancelled || !gsiBtnRef.current || !window.google?.accounts?.id) return;

        if (!nonceRef.current) nonceRef.current = await makeNonce();
        if (cancelled || !gsiBtnRef.current) return;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: nonceRef.current.hashed,
          callback: async response => {
            setGoogleBusy(true);
            try {
              const { data, error } = await supabase.auth.signInWithIdToken({
                provider: 'google',
                token: response.credential,
                nonce: nonceRef.current.raw
              });
              if (error) throw error;
              const mail = data?.user?.email || data?.session?.user?.email;
              if (mail) setGoogleEmail(mail);
            } catch (e) {
              console.error('[Google sign-in failed]', e);
              toastRef.current && toastRef.current('⚠️ Google sign-in failed: ' + (e.message || 'Unknown error'));
            } finally {
              setGoogleBusy(false);
            }
          }
        });

        const width = Math.min(400, Math.max(220, gsiBtnRef.current.offsetWidth || 320));
        gsiBtnRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(gsiBtnRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width
        });
        setGsiReady(true);
      } catch (e) {
        console.error('[Google script failed to load]', e);
        if (!cancelled) setGsiFailed(true);
      }
    }

    setup();
    return () => {
      cancelled = true;
    };
  }, [googleEmail, showAdminPassword]);

  // Old redirect-style login (used only if the new button is not available)
  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: 'select_account' }
      }
    });
  };

  const handleContinue = async () => {
    const emailOk = isValidEmail(email);
    const phoneOk = isValidPhone(phone);

    setEmailError(!emailOk);
    setPhoneError(!phoneOk);
    setShowError(!emailOk || !phoneOk);

    if (!emailOk || !phoneOk) return;

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
      const { error } = await supabase.rpc('upsert_student', {
        p_email: email,
        p_phone: phone
      });

      if (error) {
        console.error('[upsert_student RPC error]', error);
        throw error;
      }

      onSuccess({ email, phone });
    } catch (e) {
      console.error('[upsert_student RPC failed]', e);
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

  if (googleEmail) {
    const handleGoogleContinue = async () => {
      const phoneOk = isValidPhone(googlePhone);
      setGooglePhoneError(!phoneOk);
      if (!phoneOk) return;

      setLoading(true);

      const { data: isAdmin, error: rpcError } = await supabase.rpc('verify_admin_identity', {
        input_email: googleEmail,
        input_phone: googlePhone
      });

      if (!rpcError && isAdmin === true) {
        setEmail(googleEmail);
        setPhone(googlePhone);
        setLoading(false);
        setShowAdminPassword(true);
        return;
      }

      try {
        const { error } = await supabase.rpc('upsert_student', {
          p_email: googleEmail,
          p_phone: googlePhone
        });
        if (error) throw error;
        onSuccess({ email: googleEmail, phone: googlePhone });
      } catch (e) {
        console.error('[Google upsert_student failed]', e);
        showToast('⚠️ Could not save session: ' + (e.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 z-[9500] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
        <div className="w-full max-w-sm bg-white rounded-2xl p-7 shadow-2xl animate-fadeUp">
          <div className="flex flex-col items-center mb-3">
            <img
              src="/logo.png"
              alt="Namma Seniors"
              className="w-14 h-14 rounded-xl object-contain mb-2"
              onError={e => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-2xl shadow-lg hidden mb-2">
              🎓
            </div>
            <span className="text-xs font-bold text-gray-400 tracking-wide">NAMMA SENIORS</span>
          </div>
          <h3 className="text-center text-base font-bold mb-1">Almost there!</h3>
          <p className="text-center text-gray-500 text-xs mb-4">
            Signed in as <strong>{googleEmail}</strong>. Just need your WhatsApp number.
          </p>
          <input
            type="tel"
            value={googlePhone}
            onChange={e => setGooglePhone(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGoogleContinue()}
            placeholder="10-digit mobile number"
            maxLength="10"
            className={`w-full px-4 py-3 border-2 rounded-xl text-sm outline-none mb-2 ${googlePhoneError ? 'border-red-500' : 'border-gray-200 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100'
              }`}
            autoFocus
          />
          {googlePhoneError && (
            <div className="text-center text-red-600 text-xs font-bold mb-3">
              Please enter a valid 10-digit phone number.
            </div>
          )}
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              setGoogleEmail(null);
              setGooglePhone('');
            }}
            className="w-full text-center text-xs text-gray-400 hover:text-indigo-600 font-semibold mb-3 transition"
          >
            Not you? Sign in with a different account
          </button>
          <button
            onClick={handleGoogleContinue}
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 transition"
          >
            {loading ? 'Saving…' : 'Continue →'}
          </button>
        </div>
      </div>
    );
  }

  const useNewGoogleButton = !!GOOGLE_CLIENT_ID && !gsiFailed;

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

        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 font-semibold">OR</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {useNewGoogleButton ? (
          <div>
            {/* Google draws its own button here */}
            <div ref={gsiBtnRef} className="w-full flex justify-center min-h-[44px]" />
            {googleBusy && (
              <div className="text-center text-xs text-gray-500 mt-2">Signing you in…</div>
            )}
            {!gsiReady && !googleBusy && (
              <div className="text-center text-xs text-gray-400 mt-2">Loading Google sign-in…</div>
            )}
          </div>
        ) : (
          <button
            onClick={signInWithGoogle}
            className="w-full py-3 px-4 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:border-indigo-600 hover:bg-indigo-50 transition flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </button>
        )}
      </div>
    </div>
  );
}