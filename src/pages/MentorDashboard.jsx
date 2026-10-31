import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CONFIG } from '../lib/config';
import VideoCall from '../components/common/VideoCall';

// Fields a mentor can ask to change (admin approves manually)
const EDITABLE_FIELDS = [
    { key: 'full_name', label: 'Name' },
    { key: 'college', label: 'College' },
    { key: 'branch', label: 'Branch' },
    { key: 'company', label: 'Company', placementOnly: true },
    { key: 'role', label: 'Role', placementOnly: true },
    { key: 'phone', label: 'Phone' },
    { key: 'languages', label: 'Languages' },
    { key: 'home_location', label: 'Home Location' }
];

export default function MentorDashboard() {
    const [mentor, setMentor] = useState(null);
    const [stats, setStats] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [views, setViews] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeCallBooking, setActiveCallBooking] = useState(null);
    const [tab, setTab] = useState('sessions'); // 'sessions' | 'views' | 'details'

    // change-request modal
    const [editField, setEditField] = useState(null);
    const [newValue, setNewValue] = useState('');
    const [confirmStep, setConfirmStep] = useState(false);
    const [sending, setSending] = useState(false);
    const [sentInfo, setSentInfo] = useState(null);
    const [formError, setFormError] = useState('');

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
        // ── Bookings ──
        let bookingRows = [];
        try {
            const { data, error } = await supabase
                .from('bookings')
                .select('id, student_name, status, mentor_payout, scheduled_at, created_at, meet_link, requirement_message')
                .eq('mentor_id', mentorId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            bookingRows = data || [];
        } catch (err) {
            console.error('[MentorDashboard bookings]', err);
        }

        // ── Profile views (table may not exist yet, never break the dashboard) ──
        let viewRows = [];
        try {
            const { data, error } = await supabase
                .from('profile_views')
                .select('id, viewer_email, created_at')
                .eq('mentor_id', String(mentorId))
                .order('created_at', { ascending: false })
                .limit(200);
            if (error) throw error;
            viewRows = data || [];
        } catch (err) {
            console.warn('[MentorDashboard views]', err.message || err);
        }

        // ── Change requests ──
        let requestRows = [];
        try {
            const { data, error } = await supabase
                .from('mentor_change_requests')
                .select('id, field, old_value, new_value, status, created_at')
                .eq('mentor_id', String(mentorId))
                .order('created_at', { ascending: false })
                .limit(30);
            if (error) throw error;
            requestRows = data || [];
        } catch (err) {
            console.warn('[MentorDashboard requests]', err.message || err);
        }

        const active = bookingRows.filter(b => b.status !== 'cancelled');
        const completed = bookingRows.filter(b => b.status === 'completed');
        const pending = active.filter(b => b.status !== 'completed');
        const uniqueStudents = new Set(active.map(b => b.student_name)).size;
        const totalEarnings = completed.reduce((sum, b) => sum + (b.mentor_payout || 0), 0);
        const pendingEarnings = pending.reduce((sum, b) => sum + (b.mentor_payout || 0), 0);

        setStats({
            totalBookings: active.length,
            completedCount: completed.length,
            uniqueStudents,
            totalEarnings,
            pendingEarnings,
            totalViews: viewRows.length
        });
        setBookings(bookingRows);
        setViews(viewRows);
        setRequests(requestRows);
        setLoading(false);
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

    function viewerName(email) {
        if (!email) return 'Guest (not logged in)';
        return email.split('@')[0];
    }

    // ── change request flow ──
    function openEdit(field) {
        setEditField(field);
        setNewValue('');
        setConfirmStep(false);
        setSentInfo(null);
        setFormError('');
    }

    function closeEdit() {
        setEditField(null);
        setNewValue('');
        setConfirmStep(false);
        setSentInfo(null);
        setFormError('');
    }

    function goToConfirm() {
        const val = newValue.trim();
        if (!val) {
            setFormError('Please type the new value.');
            return;
        }
        if (editField.key === 'phone' && !/^\d{10}$/.test(val)) {
            setFormError('Enter a valid 10-digit phone number.');
            return;
        }
        setFormError('');
        setConfirmStep(true);
    }

    async function submitChange() {
        setSending(true);
        setFormError('');
        const oldValue = String(mentor[editField.key] || '');
        const val = newValue.trim();

        try {
            const { error } = await supabase.from('mentor_change_requests').insert({
                mentor_id: String(mentor.id),
                field: editField.key,
                old_value: oldValue,
                new_value: val
            });
            if (error) throw error;

            const text =
                `Change request from mentor ${mentor.full_name} (ID ${mentor.id}).\n` +
                `${editField.label}: "${oldValue || '—'}" -> "${val}"`;
            setSentInfo({
                whatsapp: `https://wa.me/${CONFIG.WHATSAPP_SUPPORT}?text=${encodeURIComponent(text)}`
            });

            setRequests(prev => [
                {
                    id: 'tmp-' + Date.now(),
                    field: editField.key,
                    old_value: oldValue,
                    new_value: val,
                    status: 'pending',
                    created_at: new Date().toISOString()
                },
                ...prev
            ]);
        } catch (err) {
            console.error('[MentorDashboard change request]', err);
            setFormError('Could not send your request. Please try again.');
        } finally {
            setSending(false);
        }
    }

    if (!mentor || loading || !stats) {
        return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading…</div>;
    }

    const isPlacement = mentor.category === 'placement';
    const fieldLabel = key => EDITABLE_FIELDS.find(f => f.key === key)?.label || key;

    return (
        <>
            <div className="min-h-screen bg-gray-50 px-4 py-8">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center gap-2 mb-4">
                        <img src="/logo.png" alt="Namma Seniors" className="h-9 w-auto" />
                        <span className="text-sm font-black text-gray-900">Namma Seniors</span>
                    </div>

                    <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                        <div>
                            <h1 className="text-xl font-black text-gray-900">Welcome, {mentor.full_name} 👋</h1>
                            <p className="text-sm text-gray-500">
                                {isPlacement && mentor.company
                                    ? `${mentor.role ? mentor.role + ' @ ' : ''}${mentor.company}`
                                    : mentor.college}
                            </p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 border-2 border-gray-200 rounded-lg text-xs font-extrabold text-gray-700 hover:border-red-400 hover:text-red-600 transition"
                        >
                            Log Out
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                        <StatCard label="Profile Views" value={stats.totalViews} icon="👀" />
                        <StatCard label="Total Bookings" value={stats.totalBookings} icon="📅" />
                        <StatCard label="Sessions Completed" value={stats.completedCount} icon="✅" />
                        <StatCard label="Students Mentored" value={stats.uniqueStudents} icon="🎓" />
                        <StatCard label="Earned" value={`₹${stats.totalEarnings}`} icon="💰" />
                        <StatCard label="Upcoming Earnings" value={`₹${stats.pendingEarnings}`} icon="⏳" />
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2 mb-4 flex-wrap">
                        {[
                            { key: 'sessions', label: '📋 My Sessions' },
                            { key: 'views', label: '👀 Who Viewed Me' },
                            { key: 'details', label: '⚙️ My Details' }
                        ].map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`px-4 py-2 rounded-full text-xs font-extrabold border-2 transition ${tab === t.key
                                    ? 'bg-indigo-600 text-white border-indigo-600'
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* ── SESSIONS TAB ── */}
                    {tab === 'sessions' && (
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-gray-100">
                                <h3 className="text-[15px] font-black text-gray-900">📋 My Sessions</h3>
                                <p className="text-[11.5px] text-gray-500 mt-0.5">Your booking history and earnings</p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-indigo-50/50">
                                            {['Booked On', 'Session Time', 'Student', 'Question / Request', 'Status', 'Session', 'Payout'].map(h => (
                                                <th key={h} className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {!bookings.length ? (
                                            <tr>
                                                <td colSpan="7" className="text-center text-gray-400 py-10 text-sm">No bookings yet.</td>
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
                                                            : b.status === 'cancelled'
                                                                ? 'bg-red-100 text-red-700'
                                                                : 'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                            {b.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-2 text-xs">
                                                        {b.status !== 'cancelled' ? (
                                                            <button
                                                                onClick={() => setActiveCallBooking(b)}
                                                                className="text-indigo-600 font-bold hover:underline"
                                                            >
                                                                Join Session
                                                            </button>
                                                        ) : '—'}
                                                    </td>
                                                    <td className="px-3 py-2 text-xs font-bold text-gray-900">
                                                        {b.status === 'completed'
                                                            ? `₹${b.mentor_payout || 0}`
                                                            : b.status === 'cancelled'
                                                                ? '—'
                                                                : <span className="text-gray-400 font-semibold">₹{b.mentor_payout || 0} pending</span>}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── VIEWS TAB ── */}
                    {tab === 'views' && (
                        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                            <div className="p-5 border-b border-gray-100">
                                <h3 className="text-[15px] font-black text-gray-900">👀 Who Viewed Your Profile</h3>
                                <p className="text-[11.5px] text-gray-500 mt-0.5">
                                    {stats.totalViews} view{stats.totalViews === 1 ? '' : 's'} so far
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr className="bg-indigo-50/50">
                                            <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Student</th>
                                            <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Viewed On</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {!views.length ? (
                                            <tr>
                                                <td colSpan="2" className="text-center text-gray-400 py-10 text-sm">No profile views yet.</td>
                                            </tr>
                                        ) : (
                                            views.map(v => {
                                                const dt = formatDateTime(v.created_at);
                                                return (
                                                    <tr key={v.id} className="border-b border-gray-100">
                                                        <td className="px-3 py-2 text-xs font-bold text-gray-900">{viewerName(v.viewer_email)}</td>
                                                        <td className="px-3 py-2 text-xs text-gray-700 whitespace-nowrap">
                                                            {dt === '—' ? '—' : `${dt.date}, ${dt.time}`}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* ── DETAILS TAB ── */}
                    {tab === 'details' && (
                        <div className="space-y-4">
                            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                <div className="p-5 border-b border-gray-100">
                                    <h3 className="text-[15px] font-black text-gray-900">⚙️ My Details</h3>
                                    <p className="text-[11.5px] text-gray-500 mt-0.5">
                                        Want to change something? Send a request and the Namma Seniors team will update it for you.
                                    </p>
                                </div>
                                <div>
                                    {EDITABLE_FIELDS.filter(f => !f.placementOnly || isPlacement).map(f => (
                                        <div key={f.key} className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 last:border-b-0">
                                            <div className="min-w-0">
                                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{f.label}</div>
                                                <div className="text-sm font-semibold text-gray-900 truncate">{mentor[f.key] || '—'}</div>
                                            </div>
                                            <button
                                                onClick={() => openEdit(f)}
                                                className="flex-shrink-0 px-3 py-1.5 border-2 border-indigo-200 rounded-lg text-[11px] font-extrabold text-indigo-600 hover:bg-indigo-50 transition"
                                            >
                                                Request change
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {requests.length > 0 && (
                                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                    <div className="p-5 border-b border-gray-100">
                                        <h3 className="text-[15px] font-black text-gray-900">📨 My Change Requests</h3>
                                    </div>
                                    {requests.map(r => (
                                        <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-3 border-b border-gray-100 last:border-b-0">
                                            <div className="min-w-0 text-xs text-gray-700">
                                                <strong>{fieldLabel(r.field)}</strong>: {r.old_value || '—'} → <strong>{r.new_value}</strong>
                                            </div>
                                            <span className={`flex-shrink-0 px-2 py-1 rounded-full text-[10px] font-extrabold ${r.status === 'done'
                                                ? 'bg-green-100 text-green-800'
                                                : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {r.status === 'done' ? 'updated' : 'pending'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Change request modal ── */}
            {editField && (
                <div
                    className="fixed inset-0 z-[800] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md"
                    onClick={closeEdit}
                >
                    <div
                        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
                        onClick={e => e.stopPropagation()}
                    >
                        {sentInfo ? (
                            <div className="text-center">
                                <div className="text-4xl mb-2">✅</div>
                                <h3 className="text-base font-black text-gray-900 mb-1">Request sent</h3>
                                <p className="text-xs text-gray-500 leading-relaxed mb-4">
                                    The Namma Seniors team will update your {editField.label.toLowerCase()} shortly.
                                    You can also message us on WhatsApp so it is done faster.
                                </p>
                                <a
                                    href={sentInfo.whatsapp}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full py-2.5 mb-2 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600 transition"
                                >
                                    Message us on WhatsApp
                                </a>
                                <button
                                    onClick={closeEdit}
                                    className="w-full py-2.5 border-2 border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
                                >
                                    Close
                                </button>
                            </div>
                        ) : !confirmStep ? (
                            <>
                                <h3 className="text-base font-black text-gray-900 mb-1">Change {editField.label}</h3>
                                <p className="text-xs text-gray-500 mb-4">
                                    Current: <strong>{mentor[editField.key] || '—'}</strong>
                                </p>
                                <label className="block text-xs font-bold text-gray-600 mb-1">New {editField.label}</label>
                                <input
                                    type="text"
                                    autoFocus
                                    value={newValue}
                                    onChange={e => setNewValue(e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 mb-2"
                                />
                                {formError && <p className="text-xs text-red-600 font-semibold mb-2">{formError}</p>}
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={closeEdit}
                                        className="flex-1 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={goToConfirm}
                                        className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition"
                                    >
                                        Next
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <h3 className="text-base font-black text-gray-900 mb-3">Are you sure?</h3>
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700 mb-4 space-y-1">
                                    <div><strong>{editField.label}</strong></div>
                                    <div>From: {mentor[editField.key] || '—'}</div>
                                    <div>To: <strong>{newValue.trim()}</strong></div>
                                </div>
                                {formError && <p className="text-xs text-red-600 font-semibold mb-2">{formError}</p>}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setConfirmStep(false)}
                                        disabled={sending}
                                        className="flex-1 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={submitChange}
                                        disabled={sending}
                                        className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-50"
                                    >
                                        {sending ? 'Sending…' : 'Yes, change it'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {activeCallBooking && (
                <VideoCall
                    bookingId={activeCallBooking.id}
                    displayName={mentor.full_name}
                    onClose={() => setActiveCallBooking(null)}
                />
            )}
        </>
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