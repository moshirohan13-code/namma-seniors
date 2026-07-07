import { useState } from 'react';
import { CONFIG } from '../../lib/config';

export default function AdminLogin({ onLoginSuccess }) {
    const [password, setPassword] = useState('');
    const [error, setError] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (password === CONFIG.ADMIN_PASSWORD) {
            sessionStorage.setItem('ns_admin_authed', '1');
            onLoginSuccess();
        } else {
            setError(true);
            setPassword('');
            setTimeout(() => setError(false), 2000);
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

                {/* Form */}
                <form onSubmit={handleSubmit}>
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
                        />
                        {error && (
                            <p className="mt-2 text-xs text-red-600 font-bold">❌ Invalid password</p>
                        )}
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition"
                    >
                        Access Admin Panel →
                    </button>
                </form>

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