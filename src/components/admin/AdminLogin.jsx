import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminLogin({ onLoginSuccess }) {
    const [step, setStep] = useState('identity'); // 'identity' | 'password'
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [checking, setChecking] = useState(false);

    const handleIdentitySubmit = async (e) => {
        e.preventDefault();
        setChecking(true);
        setError('');

        const { data, error: rpcError } = await supabase.rpc('verify_admin_identity', {
            input_email: email,
            input_phone: phone
        });

        setChecking(false);

        if (!rpcError && data === true) {
            setStep('password');
        } else {
            setError('❌ Email or phone not recognized');
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setChecking(true);
        setError('');

        const { data, error: rpcError } = await supabase.rpc('verify_admin_password', {
            input_password: password
        });

        setChecking(false);

        if (!rpcError && data === true) {
            sessionStorage.setItem('ns_admin_authed', '1');
            onLoginSuccess();
        } else {
            setError('❌ Invalid password');
            setPassword('');
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg">
                        🎓
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 mb-2">Admin Access</h1>
                    <p className="text-sm text-gray-500">Namma Seniors Operations Console</p>
                </div>

                {/* Step 1: Identity */}
                {step === 'identity' && (
                    <form onSubmit={handleIdentitySubmit}>
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Admin Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter admin email"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition"
                                autoFocus
                                required
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Admin Phone
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Enter admin phone"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition"
                                required
                            />
                            {error && (
                                <p className="mt-2 text-xs text-red-600 font-bold">{error}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={checking}
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition disabled:opacity-50"
                        >
                            {checking ? 'Checking…' : 'Continue →'}
                        </button>
                    </form>
                )}

                {/* Step 2: Password */}
                {step === 'password' && (
                    <form onSubmit={handlePasswordSubmit}>
                        <div className="mb-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                Admin Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter admin password"
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 transition"
                                autoFocus
                                required
                            />
                            {error && (
                                <p className="mt-2 text-xs text-red-600 font-bold">{error}</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={checking}
                            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition disabled:opacity-50"
                        >
                            {checking ? 'Checking…' : 'Access Admin Panel →'}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setStep('identity');
                                setPassword('');
                                setError('');
                            }}
                            className="w-full mt-2 py-2 text-xs text-gray-500 hover:text-indigo-600 transition"
                        >
                            ← Back
                        </button>
                    </form>
                )}

                {/* Back Link */}
                <div className="mt-6 text-center">
                    <a
                        href="/"
                        className="text-sm text-gray-500 hover:text-indigo-600 transition"
                    >
                        ← Back to Student Page
                    </a>
                </div>
            </div>
        </div>
    );
}