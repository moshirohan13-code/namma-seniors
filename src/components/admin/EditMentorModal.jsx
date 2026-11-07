import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { CONFIG } from '../../lib/config';

const inputCls =
    'w-full px-3 py-2 border-2 border-gray-200 rounded-lg text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 bg-white';
const labelCls = 'block mb-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider';

const s = v => (v === null || v === undefined ? '' : String(v));

export default function EditMentorModal({ mentor, onClose, onSaved, showToast }) {
    const [f, setF] = useState({
        full_name: s(mentor.full_name),
        email: s(mentor.email),
        phone: s(mentor.phone),
        college: s(mentor.college),
        degree: s(mentor.degree),
        branch: s(mentor.branch),
        year: s(mentor.year),
        languages: s(mentor.languages),
        home_location: s(mentor.home_location),
        can_help_with: s(mentor.can_help_with),
        background: s(mentor.background),
        category: mentor.category === 'placement' ? 'placement' : 'entrance',
        // placed seniors
        company: s(mentor.company),
        role: s(mentor.role),
        experience_level: mentor.experience_level === 'experienced' ? 'experienced' : 'fresher',
        years_experience: s(mentor.years_experience),
        session_fee: s(mentor.session_fee),
        mentor_payout: s(mentor.mentor_payout),
        // junior mentors
        exam_profile: s(mentor.exam_profile),
        jee_rank: s(mentor.jee_rank),
        jee_adv_rank: s(mentor.jee_adv_rank),
        neet_rank: s(mentor.neet_rank),
        neet_marks: s(mentor.neet_marks),
        kcet_rank: s(mentor.kcet_rank),
        comedk_rank: s(mentor.comedk_rank)
    });
    const [saving, setSaving] = useState(false);

    const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));
    const isPlacement = f.category === 'placement';

    // '' -> null, otherwise a number (or NaN if invalid)
    const num = v => (String(v).trim() === '' ? null : Number(v));

    async function save() {
        if (!f.full_name.trim()) return showToast('⚠️ Name is required.');

        const phone = f.phone.replace(/\D/g, '').slice(-10);
        if (phone.length !== 10) return showToast('⚠️ Phone must be a 10-digit number.');

        const email = f.email.trim().toLowerCase();
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showToast('⚠️ Enter a valid email.');

        const payload = {
            full_name: f.full_name.trim(),
            email: email || null,
            phone,
            college: f.college.trim(),
            degree: f.degree.trim(),
            branch: f.branch.trim(),
            year: f.year.trim(),
            languages: f.languages.trim(),
            home_location: f.home_location.trim(),
            can_help_with: f.can_help_with.trim(),
            background: f.background.trim(),
            category: f.category
        };

        if (isPlacement) {
            if (!f.company.trim()) return showToast('⚠️ Enter the company.');
            if (!f.role.trim()) return showToast('⚠️ Enter the role.');

            const years = f.experience_level === 'experienced' ? num(f.years_experience) : null;
            if (f.experience_level === 'experienced' && (years === null || Number.isNaN(years) || years <= 0 || years > 40)) {
                return showToast('⚠️ Enter the years of experience (1 to 40).');
            }
            const fee = num(f.session_fee);
            const payout = num(f.mentor_payout);
            if (Number.isNaN(fee) || Number.isNaN(payout)) return showToast('⚠️ Fee and payout must be numbers.');
            if (fee !== null && payout !== null && payout > fee) return showToast('⚠️ Payout cannot be more than the session fee.');

            payload.company = f.company.trim();
            payload.role = f.role.trim();
            payload.experience_level = f.experience_level;
            payload.years_experience = years;
            payload.session_fee = fee;
            payload.mentor_payout = payout;
            if (payout !== null) payload.payout_per_session = payout;
        } else {
            const ranks = {
                jee_rank: num(f.jee_rank),
                jee_adv_rank: num(f.jee_adv_rank),
                neet_rank: num(f.neet_rank),
                neet_marks: num(f.neet_marks),
                kcet_rank: num(f.kcet_rank),
                comedk_rank: num(f.comedk_rank)
            };
            for (const [k, v] of Object.entries(ranks)) {
                if (Number.isNaN(v)) return showToast(`⚠️ ${k.replace(/_/g, ' ')} must be a number.`);
            }
            if (ranks.neet_marks !== null && (ranks.neet_marks < 0 || ranks.neet_marks > 720)) {
                return showToast('⚠️ NEET marks must be between 0 and 720.');
            }
            payload.exam_profile = f.exam_profile.trim();
            Object.assign(payload, ranks);
        }

        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('mentors')
                .update(payload)
                .eq('id', mentor.id)
                .select('id');
            if (error) throw error;
            if (!data || data.length === 0) {
                showToast('⚠️ Not saved. Your admin account may not have permission to edit mentors.');
                setSaving(false);
                return;
            }
            showToast(`✅ ${payload.full_name} updated`);
            onSaved && onSaved();
            onClose();
        } catch (e) {
            console.error('[Edit mentor]', e);
            showToast('❌ Could not save: ' + (e.message || 'unknown error'));
            setSaving(false);
        }
    }

    const field = (label, key, props = {}) => (
        <div className={props.full ? 'col-span-2' : ''}>
            <label className={labelCls}>{label}</label>
            <input
                type={props.type || 'text'}
                value={f[key]}
                onChange={e => set(key, e.target.value)}
                placeholder={props.placeholder}
                className={inputCls}
                {...(props.extra || {})}
            />
        </div>
    );

    return (
        <div
            className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-gray-900/70 backdrop-blur-md"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl flex flex-col"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white relative flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/20 text-white text-sm flex items-center justify-center hover:bg-white/30 transition"
                    >
                        ✕
                    </button>
                    <h3 className="text-lg font-black">✏️ Edit Mentor</h3>
                    <p className="text-white/80 text-xs">{mentor.full_name}</p>
                </div>

                {/* Body */}
                <div className="p-5 overflow-y-auto flex-1">
                    {/* Type */}
                    <div className="mb-4">
                        <label className={labelCls}>Mentor Type</label>
                        <div className="flex gap-2">
                            {[
                                { v: 'entrance', label: '🎓 Junior Mentor (entrance exams)' },
                                { v: 'placement', label: '💼 Senior Mentor (placed)' }
                            ].map(o => (
                                <button
                                    key={o.v}
                                    type="button"
                                    onClick={() => set('category', o.v)}
                                    className={`flex-1 px-3 py-2 rounded-lg border-2 text-xs font-extrabold transition ${f.category === o.v
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                        : 'border-gray-200 bg-white text-gray-600 hover:border-indigo-300'
                                        }`}
                                >
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                        {field('Full Name', 'full_name', { full: true })}
                        {field('Email (used for login)', 'email', { type: 'email' })}
                        {field('Phone (10 digits)', 'phone', { type: 'tel', extra: { maxLength: 14 } })}
                        {field('College', 'college', { full: true })}
                        {field('Degree', 'degree')}
                        {field('Branch', 'branch')}
                        {field('Academic Year (optional)', 'year')}
                        {field('Home Location', 'home_location')}
                        {field('Languages', 'languages', { full: true, placeholder: 'e.g., Kannada, Hindi, English' })}
                    </div>

                    {/* Placed senior fields */}
                    {isPlacement && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                            <div className="text-[10px] font-extrabold text-amber-700 mb-3">💼 Placement Details</div>
                            <div className="grid grid-cols-2 gap-3">
                                {field('Company', 'company')}
                                {field('Role', 'role')}

                                <div className="col-span-2">
                                    <label className={labelCls}>Experience</label>
                                    <div className="flex gap-2">
                                        {[
                                            { v: 'fresher', label: 'Fresher' },
                                            { v: 'experienced', label: 'Has Experience' }
                                        ].map(o => (
                                            <button
                                                key={o.v}
                                                type="button"
                                                onClick={() => set('experience_level', o.v)}
                                                className={`flex-1 px-3 py-2 rounded-lg border-2 text-xs font-extrabold transition ${f.experience_level === o.v
                                                    ? 'border-amber-500 bg-white text-amber-700'
                                                    : 'border-gray-200 bg-white text-gray-600 hover:border-amber-300'
                                                    }`}
                                            >
                                                {o.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {f.experience_level === 'experienced' &&
                                    field('Years of experience', 'years_experience', {
                                        type: 'number',
                                        extra: { min: 0.5, max: 40, step: 0.5 },
                                        placeholder: 'e.g., 2'
                                    })}

                                {field('Student pays (₹)', 'session_fee', {
                                    type: 'number',
                                    placeholder: String(CONFIG.PLACEMENT_SESSION_FEE)
                                })}
                                {field('Senior earns (₹)', 'mentor_payout', {
                                    type: 'number',
                                    placeholder: String(CONFIG.PLACEMENT_MENTOR_PAYOUT)
                                })}
                            </div>
                            <p className="text-[10px] text-amber-700 mt-2">
                                Leave the fee boxes empty to use the standard ₹{CONFIG.PLACEMENT_SESSION_FEE} / ₹{CONFIG.PLACEMENT_MENTOR_PAYOUT}.
                                New prices apply to new bookings only.
                            </p>
                        </div>
                    )}

                    {/* Junior mentor fields */}
                    {!isPlacement && (
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4">
                            <div className="text-[10px] font-extrabold text-indigo-600 mb-3">🎓 Exams & Ranks</div>
                            <div className="grid grid-cols-2 gap-3">
                                {field('Exam profile', 'exam_profile', { full: true, placeholder: 'e.g., JEE Main, KCET' })}
                                {field('JEE Main AIR', 'jee_rank', { type: 'number' })}
                                {field('JEE Advanced AIR', 'jee_adv_rank', { type: 'number' })}
                                {field('NEET AIR', 'neet_rank', { type: 'number' })}
                                {field('NEET Marks /720', 'neet_marks', { type: 'number', extra: { min: 0, max: 720 } })}
                                {field('KCET Rank', 'kcet_rank', { type: 'number' })}
                                {field('COMEDK Rank', 'comedk_rank', { type: 'number' })}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-3">
                        <div>
                            <label className={labelCls}>Can help with (optional)</label>
                            <textarea
                                value={f.can_help_with}
                                onChange={e => set('can_help_with', e.target.value)}
                                className={`${inputCls} min-h-[64px]`}
                            />
                        </div>
                        <div>
                            <label className={labelCls}>About / background (optional)</label>
                            <textarea
                                value={f.background}
                                onChange={e => set('background', e.target.value)}
                                className={`${inputCls} min-h-[64px]`}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="flex-1 py-2.5 border-2 border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={save}
                        disabled={saving}
                        className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-sm font-bold shadow hover:shadow-lg transition disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Save changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}