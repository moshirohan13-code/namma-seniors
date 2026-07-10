import React from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { fmtDateTime } from '../../utils/helpers';
import { CONFIG } from '../../lib/config';

export default function BookingsPanel({
  bookings,
  mentors,
  onRefresh,
  onViewBooking,
  onOpenLightbox,
  showToast
}) {
  const [search, setSearch] = useState('');
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  function toLocalInputValue(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function niceTime(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  const filtered = bookings.filter(b => {
    const s = search.toLowerCase();
    if (!s) return true;
    return [
      b.student_name,
      b.student_email,
      b.student_phone,
      b.mentor_name,
      b.mentor_phone,
      b.status
    ]
      .join(' ')
      .toLowerCase()
      .includes(s);
  });

  async function updateStatus(id, status) {
    try {
      const { error } = await supabase.from('bookings').update({ status }).eq('id', id);
      if (error) throw error;
      showToast(`✅ Status → ${status}`);
      onRefresh();
    } catch (e) {
      console.error('[Status update]', e);
      showToast('❌ Status update failed.');
    }
  }

  async function deleteBooking(id) {
    if (!window.confirm('Delete this booking permanently? This cannot be undone.')) return;
    try {
      const { data, error } = await supabase.from('bookings').delete().eq('id', id).select();
      if (error) throw error;
      if (!data || data.length === 0) {
        showToast('⚠️ Delete blocked — check Supabase RLS policy for DELETE on bookings.');
        return;
      }
      showToast('🗑️ Booking deleted.');
      onRefresh();
    } catch (e) {
      console.error('[Delete booking]', e);
      showToast('❌ Delete failed: ' + e.message);
    }
  }

  async function saveMeetLink(id) {
    const input = document.getElementById(`meet-${id}`);
    const link = input?.value.trim();
    if (!link) return showToast('⚠️ Enter a Meet link first.');

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ meet_link: link, status: 'sent' })
        .eq('id', id);
      if (error) throw error;
      showToast('✅ Meet link saved!');
      onRefresh();
    } catch (e) {
      console.error('[Meet link]', e);
      showToast('❌ Could not save.');
    }
  }

  async function saveScheduledTime(id) {
    const input = document.getElementById(`sched-${id}`);
    const val = input?.value;
    if (!val) return showToast('⚠️ Pick a date and time first.');

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ scheduled_at: new Date(val).toISOString() })
        .eq('id', id);
      if (error) throw error;
      showToast('✅ Session time saved!');
      onRefresh();
    } catch (e) {
      console.error('[Scheduled time]', e);
      showToast('❌ Could not save.');
    }
  }

  return (
    <div className="tbl-card bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-5">
      <div className="tbl-head p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-[15px] font-black text-gray-900">📅 Live Bookings</h3>
          <p className="text-[11.5px] text-gray-500 mt-0.5">
            Real-time booking management — updates arrive instantly
          </p>
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
            placeholder="Search bookings…"
            className="tbl-search px-3 py-2 border-2 border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 min-w-[200px]"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-indigo-50/50">
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">#</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Student</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Requirement</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Mentor</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Student Ph.</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Mentor WhatsApp</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Session Time</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Fee</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Proof</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Status</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Meet Link</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Log-in Time</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!filtered.length ? (
              <tr>
                <td colSpan="13" className="text-center text-gray-400 py-10 text-sm">No paid bookings yet.</td>
              </tr>
            ) : (
              filtered.map((b, i) => {
                const cur = b.status || 'pending';
                const proofUrl = b.payment_proof_url || b.screenshot_url || '';
                const mentorPhone =
                  b.mentor_phone || mentors.find(m => String(m.id) === String(b.mentor_id))?.phone || '—';
                const studentPhone = b.student_phone || '—';
                const loginStamp = b.student_login_at || b.login_at || b.created_at;

                return (
                  <tr key={b.id} className="hover:bg-indigo-50/30 border-b border-gray-100 transition">
                    <td className="px-3 py-2 text-xs text-gray-700">{i + 1}</td>
                    <td className="px-3 py-2 text-xs">
                      <div className="font-bold text-gray-900">{b.student_name || '—'}</div>
                      <div className="text-[10px] text-gray-400">{b.student_email || ''}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-700 max-w-[180px]">
                      {b.requirement_message ? (
                        <span title={b.requirement_message} className="line-clamp-2">{b.requirement_message}</span>
                      ) : (
                        <span className="text-gray-400 italic">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs font-bold text-gray-900">{b.mentor_name || '—'}</td>
                    <td className="px-3 py-2 text-xs font-bold text-gray-700 whitespace-nowrap">
                      {studentPhone}
                      {studentPhone !== '—' && (
                        <WhatsAppLink
                          phone={studentPhone}
                          prefillText={`Hi ${b.student_name || 'there'}, this is Namma Seniors! \u{1F393}\n\nWe've received your booking and shared your details with your mentor. We'll let you know the session time shortly. Thank you for your patience!`}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs font-bold text-gray-700 whitespace-nowrap">
                      {mentorPhone}
                      {mentorPhone !== '—' && (
                        <WhatsAppLink
                          phone={mentorPhone}
                          prefillText={`Hi, this is Namma Seniors! \u{1F393}\n\nYou have a new session booking from ${b.student_name || 'a student'}.\n\n${b.requirement_message || 'No details shared.'}\n\nCould you let us know your available time slots for this session? We'll pass it on to the student and share the Meet link.`}
                        />
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs" style={{ minWidth: '220px' }}>
                      {cur === 'completed' ? (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 text-gray-500 font-semibold">
                            <span>🕐</span>
                            <span>{b.scheduled_at ? niceTime(b.scheduled_at) : '—'}</span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {studentPhone !== '—' && (
                              <WhatsAppLink
                                phone={studentPhone}
                                label="Thank junior"
                                color="blue"
                                prefillText={`Thank you so much for joining the session \u{1F60A}\nHope all your doubts were cleared \u{2705}\nAll the best for your future \u{1F44D}`}
                              />
                            )}
                            {mentorPhone !== '—' && (
                              <WhatsAppLink
                                phone={mentorPhone}
                                label="Thank senior"
                                color="purple"
                                prefillText={`Thank you so much for your time today \u{1F64F}\nReally appreciate it \u{1F60A}\nHave a great day ahead \u{1F44D}`}
                              />
                            )}
                          </div>
                        </div>
                      ) : (
                        (() => {
                          const isReminderWindow =
                            b.scheduled_at &&
                            new Date(b.scheduled_at).getTime() - nowTick <= 15 * 60 * 1000 &&
                            new Date(b.scheduled_at).getTime() - nowTick > -30 * 60 * 1000;

                          return (
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center gap-1">
                                <ScheduledTimePicker id={b.id} defaultValue={toLocalInputValue(b.scheduled_at)} />
                                <button
                                  onClick={() => saveScheduledTime(b.id)}
                                  className="save-btn px-2 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-[11px] font-black whitespace-nowrap hover:-translate-y-0.5 transition"
                                >
                                  Save
                                </button>
                              </div>

                              {b.scheduled_at && (
                                <div className="flex flex-wrap gap-1">
                                  {studentPhone !== '—' && (
                                    <WhatsAppLink
                                      phone={studentPhone}
                                      label="To junior"
                                      color="blue"
                                      prefillText={`Hi ${b.student_name || 'there'} \u{1F44B}, this is Namma Seniors! \u{1F393}\u{2728}\n\nGreat news — your session with ${b.mentor_name || 'your mentor'} is confirmed for *${niceTime(b.scheduled_at)}* \u{1F4C5}${b.meet_link ? `\n\n\u{1F517} Google Meet link: ${b.meet_link}` : ''}\n\nSee you then, and all the best! \u{1F31F}`}
                                    />
                                  )}
                                  {mentorPhone !== '—' && (
                                    <WhatsAppLink
                                      phone={mentorPhone}
                                      label="To senior"
                                      color="purple"
                                      prefillText={`Hi \u{1F44B}, this is Namma Seniors! \u{1F393}\u{2728}\n\nYour session with ${b.student_name || 'the student'} is confirmed for *${niceTime(b.scheduled_at)}* \u{1F4C5}${b.meet_link ? `\n\n\u{1F517} Google Meet link: ${b.meet_link}` : ''}\n\nPlease join on time — thank you so much for mentoring! \u{1F64F}`}
                                    />
                                  )}
                                </div>
                              )}
                              {isReminderWindow && (
                                <div className="flex flex-col gap-1 bg-amber-50 border border-amber-200 rounded-lg p-1.5">
                                  <span className="text-[10px] font-black text-amber-700">⏰ Reminder ready</span>
                                  <div className="flex flex-wrap gap-1">
                                    {studentPhone !== '—' && (
                                      <WhatsAppLink
                                        phone={studentPhone}
                                        label="Remind junior"
                                        prefillText={`\u{23F0} Reminder: your session starts at ${niceTime(b.scheduled_at)}. Please join on time! \u{1F642}`}
                                      />
                                    )}
                                    {mentorPhone !== '—' && (
                                      <WhatsAppLink
                                        phone={mentorPhone}
                                        label="Remind senior"
                                        prefillText={`\u{23F0} Reminder: your session with ${b.student_name || 'the student'} starts at ${niceTime(b.scheduled_at)}. \u{1F642}`}
                                      />
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs font-black text-indigo-600">₹{b.session_fee || CONFIG.SESSION_FEE}</td>
                    <td className="px-3 py-2 text-xs">
                      {proofUrl ? (
                        /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(proofUrl) ? (
                          <img
                            src={proofUrl}
                            alt="Proof"
                            onClick={() => onOpenLightbox(proofUrl)}
                            className="w-9 h-9 object-cover rounded-lg border border-gray-200 cursor-pointer hover:scale-110 transition"
                          />
                        ) : (
                          <ProofLink url={proofUrl} />
                        )
                      ) : (
                        <span className="text-gray-400 italic text-[11px]">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <select
                        value={cur}
                        onChange={e => updateStatus(b.id, e.target.value)}
                        className={`status-select ${cur} px-2 py-1 rounded-full border-2 text-[11px] font-extrabold cursor-pointer outline-none`}
                      >
                        <option value="pending">Pending</option>
                        <option value="verified">Approved</option>
                        <option value="sent">Meet Sent</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div className="meet-wrap flex items-center gap-1">
                        <input
                          id={`meet-${b.id}`}
                          type="text"
                          defaultValue={b.meet_link || ''}
                          placeholder="Google Meet link…"
                          className="meet-input w-36 px-2 py-1 border-2 border-gray-200 rounded-lg text-[11px] outline-none focus:border-indigo-600"
                        />
                        <button
                          onClick={() => saveMeetLink(b.id)}
                          className="save-btn px-2 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-[11px] font-black whitespace-nowrap hover:-translate-y-0.5 transition"
                        >
                          Save
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs font-bold text-gray-600 whitespace-nowrap">
                      {fmtDateTime(loginStamp)}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div className="flex gap-1 flex-wrap">
                        <button
                          onClick={() => onViewBooking(b)}
                          className="act-btn btn-view px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-black hover:bg-indigo-100 transition"
                        >
                          👁 View
                        </button>
                        {cur !== 'completed' && (
                          <button
                            onClick={() => updateStatus(b.id, 'completed')}
                            className="act-btn btn-complete px-2 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[11px] font-black hover:bg-blue-100 transition"
                          >
                            ✓ Done
                          </button>
                        )}
                        <button
                          onClick={() => deleteBooking(b.id)}
                          className="act-btn btn-delete px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-[11px] font-black hover:bg-red-100 transition"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProofLink({ url }) {
  return React.createElement(
    'a',
    {
      href: url,
      target: '_blank',
      rel: 'noopener noreferrer',
      className: 'text-indigo-600 font-bold text-[11px] bg-indigo-50 px-2 py-1 rounded border border-indigo-200 no-underline'
    },
    '📎 View'
  );
}

function WhatsAppLink({ phone, prefillText, label, color }) {
  const clean = String(phone).replace(/\D/g, '');
  const num = clean.startsWith('91') ? clean : '91' + clean;
  const href = prefillText
    ? `https://wa.me/${num}?text=${encodeURIComponent(prefillText)}`
    : `https://wa.me/${num}`;

  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
    green: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
  };
  const chosen = colorClasses[color] || colorClasses.green;

  if (label) {
    return React.createElement(
      'a',
      {
        href: href,
        target: '_blank',
        rel: 'noopener noreferrer',
        className: `inline-flex items-center gap-1 px-2 py-1 ${chosen} border rounded-lg text-[10.5px] font-black transition no-underline whitespace-nowrap`
      },
      '📤 ' + label
    );
  }

  return React.createElement(
    'a',
    {
      href: href,
      target: '_blank',
      rel: 'noopener noreferrer',
      className: 'inline-flex items-center justify-center w-6 h-6 bg-green-500 text-white rounded-full text-[11px] ml-1 hover:scale-110 transition',
      title: `WhatsApp ${phone}`
    },
    React.createElement(
      'svg',
      { className: 'w-3 h-3 fill-white', viewBox: '0 0 24 24' },
      React.createElement('path', {
        d: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z'
      })
    )
  );
}

function ScheduledTimePicker({ id, defaultValue }) {
  const parseInitial = () => {
    if (defaultValue) {
      const [d, t] = defaultValue.split('T');
      const [h, m] = (t || '00:00').split(':').map(Number);
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const ap = h >= 12 ? 'PM' : 'AM';
      return { date: d, hour12: h12, minute: String(m).padStart(2, '0'), ampm: ap };
    }
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return {
      date: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
      hour12: 9,
      minute: '00',
      ampm: 'AM'
    };
  };

  const init = parseInitial();
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(init.date);
  const [hour12, setHour12] = useState(init.hour12);
  const [minute, setMinute] = useState(init.minute);
  const [ampm, setAmpm] = useState(init.ampm);

  const hour24 = (() => {
    let h = hour12 % 12;
    if (ampm === 'PM') h += 12;
    return String(h).padStart(2, '0');
  })();

  const hiddenValue = date ? `${date}T${hour24}:${minute}` : '';

  const displayLabel = date
    ? `${new Date(date + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${hour12}:${minute} ${ampm}`
    : 'Pick date & time';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="px-2 py-1 border-2 border-gray-200 rounded-lg text-[11px] font-semibold text-gray-700 hover:border-indigo-600 transition whitespace-nowrap"
      >
        🕐 {displayLabel}
      </button>
      <input type="hidden" id={`sched-${id}`} value={hiddenValue} readOnly />

      {open && (
        <div className="absolute z-20 top-full left-0 mt-1 bg-white border-2 border-gray-200 rounded-xl shadow-xl p-3 w-64">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="w-full px-2 py-1.5 border-2 border-gray-200 rounded-lg text-[11px] mb-2 outline-none focus:border-indigo-600"
          />

          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Hour</div>
          <div className="grid grid-cols-6 gap-1 mb-2">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
              <button
                key={h}
                type="button"
                onClick={() => setHour12(h)}
                className={`py-1 rounded-lg text-[11px] font-bold transition ${hour12 === h ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-indigo-50'
                  }`}
              >
                {h}
              </button>
            ))}
          </div>

          <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide mb-1">Minute</div>
          <div className="grid grid-cols-6 gap-1 mb-2">
            {['00', '10', '20', '30', '40', '50'].map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMinute(m)}
                className={`py-1 rounded-lg text-[11px] font-bold transition ${minute === m ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-indigo-50'
                  }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex gap-1 mb-3">
            {['AM', 'PM'].map(ap => (
              <button
                key={ap}
                type="button"
                onClick={() => setAmpm(ap)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold transition ${ampm === ap ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-indigo-50'
                  }`}
              >
                {ap}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-[11px] font-black"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}