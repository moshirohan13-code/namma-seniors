import { useState, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { CONFIG } from '../../lib/config';
import BookingsPanel from './BookingsPanel';
import EditMentorModal from './EditMentorModal';

function experienceText(x) {
    if (x.experience_level === 'fresher') return 'Fresher';
    if (x.experience_level === 'experienced') {
        const y = Number(x.years_experience);
        return y ? `${y} ${y === 1 ? 'yr' : 'yrs'} experience` : 'Experienced';
    }
    return x.experience_level ? 'Newly Joined' : '—';
}

export default function PlacementPanel({
    applications,
    mentors,
    bookings,
    onRefresh,
    onViewApp,
    onViewMentor,
    onViewBooking,
    onOpenLightbox,
    showToast
}) {
    const [sub, setSub] = useState('registrations');
    const [search, setSearch] = useState('');
    const [editing, setEditing] = useState(null);

    const subTabs = [
        { id: 'registrations', label: '📝 Registrations', count: applications.length, red: true },
        { id: 'seniors', label: '💼 Placed Seniors', count: mentors.length },
        { id: 'bookings', label: '📅 Bookings', count: bookings.length },
        { id: 'payouts', label: '💸 Payouts', count: null }
    ];

    const s = search.toLowerCase();
    const filteredApps = applications.filter(a =>
        !s || [a.full_name, a.college, a.company, a.role, a.phone, a.email].join(' ').toLowerCase().includes(s)
    );
    const filteredMentors = mentors.filter(m =>
        !s || [m.full_name, m.college, m.company, m.role, m.phone, m.email].join(' ').toLowerCase().includes(s)
    );

    // ── Approve / reject ──────────────────────────────────────
    async function approveApp(id) {
        const app = applications.find(x => String(x.id) === String(id));
        if (!app) return;

        try {
            const mentor = {
                full_name: app.full_name,
                email: (app.email || '').toLowerCase(),
                college: app.college,
                degree: app.degree || '',
                year: app.year || '',
                branch: app.branch,
                exam_profile: '',
                phone: app.phone,
                languages: app.languages || '',
                home_location: app.home_location || '',
                can_help_with: app.can_help_with || '',
                background: app.background || '',
                id_card_url: app.id_card_url || '',
                youtube_link: app.youtube_link || '',
                instagram_link: app.instagram_link || '',
                category: 'placement',
                company: app.company || '',
                role: app.role || '',
                experience_level: app.experience_level || '',
                years_experience: app.years_experience ?? null,
                session_fee: CONFIG.PLACEMENT_SESSION_FEE,
                mentor_payout: CONFIG.PLACEMENT_MENTOR_PAYOUT,
                payout_per_session: CONFIG.PLACEMENT_MENTOR_PAYOUT,
                status: 'approved',
                featured: false,
                homepage_highlight: '',
                created_at: new Date().toISOString()
            };

            const r1 = await supabase.from('mentors').insert([mentor]);
            if (r1.error) throw r1.error;

            const r2 = await supabase.from('mentor_applications').update({ status: 'approved' }).eq('id', id);
            if (r2.error) throw r2.error;

            showToast(`✅ ${app.full_name} approved as placed senior`);
            onRefresh();

            if (app.phone) {
                const cleanPhone = String(app.phone).replace(/\D/g, '');
                const waNum = cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone;
                const msg =
                    `Hi ${app.full_name || 'there'}, welcome to Namma Seniors! You are now live on our Placement page. ` +
                    `You earn ₹${CONFIG.PLACEMENT_MENTOR_PAYOUT} for every session you complete. ` +
                    `Track your bookings and earnings here: https://nammaseniors.com/mentor-login`;
                window.open(`https://wa.me/${waNum}?text=${encodeURIComponent(msg)}`, '_blank');
            }
        } catch (e) {
            console.error('[Approve placement]', e);
            showToast('❌ Approval failed: ' + (e.message || 'unknown error'));
        }
    }

    async function rejectApp(id) {
        const app = applications.find(x => String(x.id) === String(id));
        if (!app || !window.confirm(`Reject ${app.full_name}?`)) return;
        try {
            const { error } = await supabase.from('mentor_applications').update({ status: 'rejected' }).eq('id', id);
            if (error) throw error;
            showToast(`Rejected ${app.full_name}`);
            onRefresh();
        } catch (e) {
            console.error('[Reject placement]', e);
            showToast('❌ Failed.');
        }
    }

    async function removeMentor(id) {
        const m = mentors.find(x => String(x.id) === String(id));
        if (!m || !window.confirm(`Remove ${m.full_name}?`)) return;
        try {
            const { error } = await supabase.from('mentors').delete().eq('id', id);
            if (error) throw error;
            showToast(`✅ ${m.full_name} removed`);
            onRefresh();
        } catch (e) {
            console.error('[Remove placed senior]', e);
            showToast('❌ Failed.');
        }
    }

    // ── Payouts ───────────────────────────────────────────────
    const payoutRows = useMemo(() => {
        const map = {};
        bookings.forEach(b => {
            if ((b.status || 'pending') === 'cancelled') return;
            const key = String(b.mentor_id);
            if (!map[key]) {
                map[key] = { mentorId: key, name: b.mentor_name || '—', completed: 0, upcoming: 0, dueNow: 0, paid: 0, dueIds: [] };
            }
            const r = map[key];
            const amt = Number(b.mentor_payout) || CONFIG.PLACEMENT_MENTOR_PAYOUT;
            if (b.status === 'completed') {
                r.completed += 1;
                if (b.payout_paid) r.paid += amt;
                else {
                    r.dueNow += amt;
                    r.dueIds.push(b.id);
                }
            } else {
                r.upcoming += amt;
            }
        });
        return Object.values(map).sort((a, b) => b.dueNow - a.dueNow);
    }, [bookings]);

    const totalDueNow = payoutRows.reduce((sum, r) => sum + r.dueNow, 0);
    const totalPaid = payoutRows.reduce((sum, r) => sum + r.paid, 0);

    async function markPaid(row) {
        if (!row.dueIds.length) return;
        if (!window.confirm(`Mark ₹${row.dueNow} as paid to ${row.name}?`)) return;
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ payout_paid: true, payout_paid_at: new Date().toISOString() })
                .in('id', row.dueIds);
            if (error) throw error;
            showToast(`✅ ₹${row.dueNow} marked paid to ${row.name}`);
            onRefresh();
        } catch (e) {
            console.error('[Mark paid]', e);
            showToast('❌ Could not save. Did you run the payout_paid SQL?');
        }
    }

    const th = 'px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100';

    return (
        <div>
            {/* Sub tabs */}
            <div className="flex gap-2 mb-4 flex-wrap">
                {subTabs.map(t => (
                    <button
                        key={t.id}
                        onClick={() => setSub(t.id)}
                        className={`px-4 py-2 rounded-full text-xs font-extrabold border-2 transition ${sub === t.id
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                            }`}
                    >
                        {t.label}
                        {t.count !== null && (
                            <span
                                className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-black ${sub === t.id
                                    ? 'bg-white/25 text-white'
                                    : t.red && t.count > 0
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-gray-200 text-gray-600'
                                    }`}
                            >
                                {t.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ── REGISTRATIONS ── */}
            {sub === 'registrations' && (
                <div className="tbl-card bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-5">
                    <PanelHead
                        title="📝 Placed Senior Registrations"
                        subtitle="Pending applications from placed seniors"
                        onRefresh={onRefresh}
                        search={search}
                        setSearch={setSearch}
                        placeholder="Search applicants…"
                    />
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-indigo-50/50">
                                    {['#', 'Name', 'College', 'Company', 'Role', 'Experience', 'Phone', 'ID Card', 'Actions'].map(h => (
                                        <th key={h} className={th}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {!filteredApps.length ? (
                                    <tr><td colSpan="9" className="text-center text-gray-400 py-10 text-sm">No pending placement registrations.</td></tr>
                                ) : (
                                    filteredApps.map((a, i) => (
                                        <tr key={a.id} className="hover:bg-indigo-50/30 border-b border-gray-100 transition">
                                            <td className="px-3 py-2 text-xs text-gray-700">{i + 1}</td>
                                            <td className="px-3 py-2 text-xs">
                                                <div className="font-bold text-gray-900">{a.full_name}</div>
                                                <div className="text-[10px] text-gray-400">{a.email || ''}</div>
                                            </td>
                                            <td className="px-3 py-2 text-[11px] text-gray-600 max-w-[120px] truncate">{a.college || '—'}</td>
                                            <td className="px-3 py-2 text-xs font-bold text-gray-900">{a.company || '—'}</td>
                                            <td className="px-3 py-2 text-xs text-gray-700">{a.role || '—'}</td>
                                            <td className="px-3 py-2 text-xs">
                                                <span className="px-2 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                                                    {experienceText(a)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-xs font-bold text-gray-700 whitespace-nowrap">
                                                {a.phone || '—'}
                                                {a.phone && <WhatsAppLink phone={a.phone} />}
                                            </td>
                                            <td className="px-3 py-2 text-xs">
                                                {a.id_card_url ? (
                                                    <a
                                                        href={a.id_card_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-indigo-600 font-bold text-[11px] bg-indigo-50 px-2 py-1 rounded border border-indigo-200 no-underline"
                                                    >
                                                        View ID ↗
                                                    </a>
                                                ) : (
                                                    <span className="text-gray-400 italic text-[11px]">—</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-xs">
                                                <div className="flex gap-1 flex-wrap">
                                                    <button onClick={() => onViewApp(a)} className="act-btn px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-black hover:bg-indigo-100 transition">👁</button>
                                                    <button onClick={() => approveApp(a.id)} className="act-btn px-2 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-[11px] font-black hover:bg-green-100 transition">✓ Approve</button>
                                                    <button onClick={() => rejectApp(a.id)} className="act-btn px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-[11px] font-black hover:bg-red-100 transition">✕</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── PLACED SENIORS ── */}
            {sub === 'seniors' && (
                <div className="tbl-card bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-5">
                    <PanelHead
                        title="💼 Placed Seniors"
                        subtitle="Approved placed seniors visible on the Placement page"
                        onRefresh={onRefresh}
                        search={search}
                        setSearch={setSearch}
                        placeholder="Search placed seniors…"
                    />
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-indigo-50/50">
                                    {['#', 'Name', 'Company', 'Role', 'Experience', 'Student Pays', 'Senior Earns', 'Phone', 'Actions'].map(h => (
                                        <th key={h} className={th}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {!filteredMentors.length ? (
                                    <tr><td colSpan="9" className="text-center text-gray-400 py-10 text-sm">No placed seniors yet.</td></tr>
                                ) : (
                                    filteredMentors.map((m, i) => (
                                        <tr key={m.id} className="hover:bg-indigo-50/30 border-b border-gray-100 transition">
                                            <td className="px-3 py-2 text-xs text-gray-700">{i + 1}</td>
                                            <td className="px-3 py-2 text-xs">
                                                <div className="font-bold text-gray-900">{m.full_name}</div>
                                                <div className="text-[10px] text-gray-400">{m.email || 'no email saved'}</div>
                                            </td>
                                            <td className="px-3 py-2 text-xs font-bold text-gray-900">{m.company || '—'}</td>
                                            <td className="px-3 py-2 text-xs text-gray-700">{m.role || '—'}</td>
                                            <td className="px-3 py-2 text-xs">
                                                <span className="px-2 py-1 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                                                    {experienceText(m)}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-xs font-black text-indigo-600">₹{m.session_fee || CONFIG.PLACEMENT_SESSION_FEE}</td>
                                            <td className="px-3 py-2 text-xs font-black text-green-700">₹{m.mentor_payout || CONFIG.PLACEMENT_MENTOR_PAYOUT}</td>
                                            <td className="px-3 py-2 text-xs font-bold text-gray-700 whitespace-nowrap">
                                                {m.phone || '—'}
                                                {m.phone && <WhatsAppLink phone={m.phone} />}
                                            </td>
                                            <td className="px-3 py-2 text-xs">
                                                <div className="flex gap-1 flex-wrap">
                                                    <button onClick={() => setEditing(m)} className="act-btn px-2 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[11px] font-black hover:bg-amber-100 transition">✏️ Edit</button>
                                                    <button onClick={() => onViewMentor(m)} className="act-btn px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-black hover:bg-indigo-100 transition">👁</button>
                                                    <button onClick={() => removeMentor(m.id)} className="act-btn px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-[11px] font-black hover:bg-red-100 transition">Remove</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── BOOKINGS ── */}
            {sub === 'bookings' && (
                <BookingsPanel
                    bookings={bookings}
                    mentors={mentors}
                    onRefresh={onRefresh}
                    onViewBooking={onViewBooking}
                    onOpenLightbox={onOpenLightbox}
                    showToast={showToast}
                />
            )}

            {/* ── PAYOUTS ── */}
            {sub === 'payouts' && (
                <div className="tbl-card bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-5">
                    <div className="tbl-head p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
                        <div>
                            <h3 className="text-[15px] font-black text-gray-900">💸 Placed Senior Payouts</h3>
                            <p className="text-[11.5px] text-gray-500 mt-0.5">
                                Money is due only for <strong>completed</strong> sessions. Mark it paid after you send the money.
                            </p>
                        </div>
                        <div className="flex gap-3 flex-wrap">
                            <div className="px-4 py-2 rounded-xl bg-red-50 border border-red-200 text-xs font-extrabold text-red-700">
                                To pay now: ₹{totalDueNow}
                            </div>
                            <div className="px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-xs font-extrabold text-green-700">
                                Already paid: ₹{totalPaid}
                            </div>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-indigo-50/50">
                                    {['Senior', 'Phone', 'Sessions Done', 'Upcoming', 'To Pay Now', 'Paid', 'Action'].map(h => (
                                        <th key={h} className={th}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {!payoutRows.length ? (
                                    <tr><td colSpan="7" className="text-center text-gray-400 py-10 text-sm">No placed-senior bookings yet.</td></tr>
                                ) : (
                                    payoutRows.map(r => {
                                        const phone = mentors.find(m => String(m.id) === r.mentorId)?.phone || '';
                                        return (
                                            <tr key={r.mentorId} className="hover:bg-indigo-50/30 border-b border-gray-100 transition">
                                                <td className="px-3 py-2 text-xs font-bold text-gray-900">{r.name}</td>
                                                <td className="px-3 py-2 text-xs font-bold text-gray-700 whitespace-nowrap">
                                                    {phone || '—'}
                                                    {phone && <WhatsAppLink phone={phone} />}
                                                </td>
                                                <td className="px-3 py-2 text-xs text-gray-700">{r.completed}</td>
                                                <td className="px-3 py-2 text-xs text-gray-500">₹{r.upcoming}</td>
                                                <td className="px-3 py-2 text-xs font-black text-red-600">₹{r.dueNow}</td>
                                                <td className="px-3 py-2 text-xs font-black text-green-700">₹{r.paid}</td>
                                                <td className="px-3 py-2 text-xs">
                                                    {r.dueNow > 0 ? (
                                                        <button
                                                            onClick={() => markPaid(r)}
                                                            className="act-btn px-3 py-1 bg-green-50 text-green-700 border border-green-200 rounded-lg text-[11px] font-black hover:bg-green-100 transition"
                                                        >
                                                            ✓ Mark ₹{r.dueNow} paid
                                                        </button>
                                                    ) : (
                                                        <span className="text-gray-400 text-[11px]">Nothing due</span>
                                                    )}
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

            {editing && (
                <EditMentorModal
                    mentor={editing}
                    onClose={() => setEditing(null)}
                    onSaved={onRefresh}
                    showToast={showToast}
                />
            )}
        </div>
    );
}

function PanelHead({ title, subtitle, onRefresh, search, setSearch, placeholder }) {
    return (
        <div className="tbl-head p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div>
                <h3 className="text-[15px] font-black text-gray-900">{title}</h3>
                <p className="text-[11.5px] text-gray-500 mt-0.5">{subtitle}</p>
            </div>
            <div className="tbl-actions flex gap-2 items-center flex-wrap">
                <button
                    onClick={onRefresh}
                    className="refresh-btn inline-flex items-center gap-1 px-4 py-2 border-2 border-gray-200 rounded-lg bg-white text-xs font-extrabold text-gray-700 hover:border-indigo-600 hover:text-indigo-600 transition"
                >
                    🔄 Refresh
                </button>
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder={placeholder}
                    className="tbl-search px-3 py-2 border-2 border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 min-w-[200px]"
                />
            </div>
        </div>
    );
}

function WhatsAppLink({ phone }) {
    const clean = String(phone).replace(/\D/g, '');
    const num = clean.startsWith('91') ? clean : '91' + clean;
    return (
        <a
            href={`https://wa.me/${num}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded-full text-[11px] ml-1 hover:scale-110 transition"
            title={`WhatsApp ${phone}`}
        >
            <svg className="w-3 h-3 fill-white" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
        </a>
    );
}