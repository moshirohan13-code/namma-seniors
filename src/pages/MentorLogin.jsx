import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function MentorLogin() {
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        checkSession();

        const { data: listener } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN') checkSession();
        });
        return () => listener.subscription.unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function checkSession() {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user?.email) {
                setLoading(false);
                return;
            }

            const email = session.user.email.trim().toLowerCase();

            const { data, error: dbError } = await supabase
                .from('mentors')
                .select('*')
                .ilike('email', email)
                .eq('status', 'approved')
                .maybeSingle();

            if (dbError) throw dbError;

            if (!data) {
                setError(
                    `No approved senior found for ${email}. Please sign in with the same Google email you used to register.`
                );
                await supabase.auth.signOut();
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

    async function handleGoogle() {
        setError('');
        setLoading(true);
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/mentor-login` }
        });
        if (oauthError) {
            console.error('[MentorLogin Google]', oauthError);
            setError('Google sign-in failed. Please try again.');
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
                <h1 className="text-xl font-black text-gray-900 mb-1">Senior Login</h1>
                <p className="text-sm text-gray-500 mb-6">
                    Sign in with the same Google email you used to register.
                </p>

                {error && <p className="text-xs text-red-600 font-semibold mb-4">{error}</p>}

                <button
                    type="button"
                    onClick={handleGoogle}
                    disabled={loading}
                    className="w-full py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-50"
                >
                    {loading ? 'Please wait…' : 'Continue with Google'}
                </button>
            </div>
        </div>
    );
}