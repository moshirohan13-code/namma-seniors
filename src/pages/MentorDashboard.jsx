import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';


export default function MentorDashboard() {
    const [mentor, setMentor] = useState(null);
    const [stats, setStats] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const stored = sessionStorage.getItem('mentor_session');
        if (!stored) {
            navigate('/mentor-login');
            return;
        }
        const m = JSON.parse(stored);
        setMentor(m);
        loadData(m.id);
    }, []);

    async function loadData(mentorId) {
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('id, student_name, status, mentor_payout, scheduled_at, created_at, meet_link, requirement_message')
                .eq('mentor_id', mentorId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const totalBookings = data.length;
            const completed = data.filter(b => b.status === 'completed');
            const uniqueStudents = new Set(data.map(b => b.student_name)).size;
            const totalEarnings = completed.reduce((sum, b) => sum + (b.mentor_payout || 0), 0);

            setStats({
                totalBookings,
                completedCount: completed.length,
                uniqueStudents,
                totalEarnings
            });
            setBookings(data);
        } catch (err) {
            console.error('[MentorDashboard]', err);
        } finally {
            setLoading(false);
        }
    }

    function handleLogout() {
        sessionStorage.removeItem('mentor_session');
        navigate('/mentor-login');
    }

    function formatDateTime(str) {
        if (!str) return '—';
        const d = new Date(str);
        const date = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
        const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        return { date, time };
    }

    if (!mentor || loading) {
        return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 px-4 py-8">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-2 mb-4">
                    <img src="/logo.png" alt="Namma Seniors" className="h-9 w-auto" />
                    <span className="text-sm font-black text-gray-900">Namma Seniors</span>
                </div>

                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div>
                        <h1 className="text-xl font-black text-gray-900">Welcome, {mentor.full_name} 👋</h1>
                        <p className="text-sm text-gray-500">{mentor.college}</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-4 py-2 border-2 border-gray-200 rounded-lg text-xs font-extrabold text-gray-700 hover:border-red-400 hover:text-red-600 transition"
                    >
                        Log Out
                    </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    <StatCard label="Total Bookings" value={stats.totalBookings} icon="📅" />
                    <StatCard label="Sessions Completed" value={stats.completedCount} icon="✅" />
                    <StatCard label="Students Mentored" value={stats.uniqueStudents} icon="🎓" />
                    <StatCard label="Total Earnings" value={`₹${stats.totalEarnings}`} icon="💰" />
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100">
                        <h3 className="text-[15px] font-black text-gray-900">📋 My Sessions</h3>
                        <p className="text-[11.5px] text-gray-500 mt-0.5">Your booking history</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-indigo-50/50">
                                    <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Booked On</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Session Time</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Student</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Question / Request</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Status</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Meet Link</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Payout</th>
                                </tr>
                            </thead>
                            <tbody>
                                {!bookings.length ? (
                                    <tr>
                                        <td colSpan="6" className="text-center text-gray-400 py-10 text-sm">No bookings yet.</td>
                                    </tr>
                                ) : (
                                    bookings.map(b => (
                                        <tr key={b.id} className="hover:bg-indigo-50/30 border-b border-gray-100 transition">
                                            <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">
                                                {(() => {
                                                    const dt = formatDateTime(b.created_at);
                                                    if (dt === '—') return '—';
                                                    return (
                                                        <div>
                                                            <div className="font-bold text-gray-900">{dt.date}</div>
                                                            <div className="text-[10px] text-gray-400">{dt.time}</div>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">
                                                {(() => {
                                                    if (!b.scheduled_at) return <span className="text-gray-400 italic">Not fixed yet</span>;
                                                    const dt = formatDateTime(b.scheduled_at);
                                                    return (
                                                        <div>
                                                            <div className="font-bold text-indigo-700">{dt.date}</div>
                                                            <div className="text-[10px] text-gray-400">{dt.time}</div>
                                                        </div>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-3 py-2 text-xs font-bold text-gray-900">{b.student_name || '—'}</td>
                                            <td className="px-3 py-2 text-[11px] text-gray-600 max-w-[220px]">{b.requirement_message || '—'}</td>
                                            <td className="px-3 py-2 text-xs">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-extrabold ${b.status === 'completed'
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {b.status}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-xs">
                                                {b.meet_link ? (
                                                    <a href={b.meet_link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-bold hover:underline">
                                                        Join
                                                    </a>
                                                ) : '—'}
                                            </td>
                                            <td className="px-3 py-2 text-xs font-bold text-gray-900">
                                                {b.status === 'completed' ? `₹${b.mentor_payout || 0}` : '—'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon }) {
    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
            <div className="text-2xl mb-2">{icon}</div>
            <div className="text-2xl font-black text-gray-900">{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
        </div>
    );
}