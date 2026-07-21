import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function AdminLogin({ onLoginSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [checking, setChecking] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setChecking(true);
        setError('');

        const { data, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (authError || !data?.user) {
            setChecking(false);
            setError('❌ Invalid email or password');
            setPassword('');
            return;
        }

        const { data: adminRow, error: adminError } = await supabase
            .from('admin_users')
            .select('user_id')
            .eq('user_id', data.user.id)
            .maybeSingle();

        setChecking(false);

        if (adminError || !adminRow) {
            await supabase.auth.signOut();
            setError('❌ This account is not authorized as an admin');
            setPassword('');
            return;
        }

        onLoginSuccess();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg">
                        🎓
                    </div>
                    <h1 className="text-2xl font-black text-gray-900 mb-2">Admin Access</h1>
                    <p className="text-sm text-gray-500">Namma Seniors Operations Console</p>
                </div>

                <form onSubmit={handleSubmit}>
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
                            Admin Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter admin password"
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
                        {checking ? 'Checking…' : 'Access Admin Panel →'}
                    </button>
                </form>

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