import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function MentorLogin() {
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function handleLogin(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        const cleanEmail = email.trim().toLowerCase();
        const cleanPhone = phone.trim().replace(/\D/g, '');

        try {
            const { data, error: dbError } = await supabase
                .from('mentors')
                .select('*')
                .ilike('email', cleanEmail)
                .eq('phone', cleanPhone)
                .eq('status', 'approved')
                .maybeSingle();

            if (dbError) throw dbError;

            if (!data) {
                setError('No matching approved mentor found. Check your email and phone number.');
                setLoading(false);
                return;
            }

            sessionStorage.setItem('mentor_session', JSON.stringify(data));
            navigate('/mentor-dashboard');
        } catch (err) {
            console.error('[MentorLogin]', err);
            setError('Something went wrong. Please try again.');
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
                <h1 className="text-xl font-black text-gray-900 mb-1">Mentor Login</h1>
                <p className="text-sm text-gray-500 mb-6">Enter your registered email and phone number.</p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
                            placeholder="you@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-600 mb-1">Phone Number</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            required
                            className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100"
                            placeholder="9876543210"
                        />
                    </div>

                    {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-50"
                    >
                        {loading ? 'Checking…' : 'Log In'}
                    </button>
                </form>
            </div>
        </div>
    );
}