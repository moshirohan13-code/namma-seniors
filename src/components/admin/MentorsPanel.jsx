import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function MentorsPanel({ mentors, onRefresh, onViewMentor, showToast }) {
  const [search, setSearch] = useState('');

  const filtered = mentors.filter(m => {
    const s = search.toLowerCase();
    if (!s) return true;
    return [m.full_name, m.college, m.branch, m.phone].join(' ').toLowerCase().includes(s);
  });

  async function removeMentor(id) {
    const m = mentors.find(x => String(x.id) === String(id));
    if (!m || !window.confirm(`Remove ${m.full_name}?`)) return;

    try {
      const { error } = await supabase.from('mentors').delete().eq('id', id);
      if (error) throw error;
      showToast(`✅ ${m.full_name} removed`);
      onRefresh();
    } catch (e) {
      console.error('[Remove]', e);
      showToast('❌ Failed.');
    }
  }

  return (
    <div className="tbl-card bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-5">
      <div className="tbl-head p-5 border-b border-gray-100 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-[15px] font-black text-gray-900">👤 Mentor Directory</h3>
          <p className="text-[11.5px] text-gray-500 mt-0.5">All approved mentors</p>
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
            placeholder="Search mentors…"
            className="tbl-search px-3 py-2 border-2 border-gray-200 rounded-lg text-xs outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-100 min-w-[200px]"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-indigo-50/50">
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">#</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Name</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">College</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Degree & Branch</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Year</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Exam Ranks</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">WhatsApp</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Featured</th>
              <th className="px-3 py-2 text-left text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">Actions</th>
            </tr>
          </thead>
          <tbody>
            {!filtered.length ? (
              <tr>
                <td colSpan="9" className="text-center text-gray-400 py-10 text-sm">No mentors.</td>
              </tr>
            ) : (
              filtered.map((m, i) => (
                <tr key={m.id} className="hover:bg-indigo-50/30 border-b border-gray-100 transition">
                  <td className="px-3 py-2 text-xs text-gray-700">{i + 1}</td>
                  <td className="px-3 py-2 text-xs font-bold text-gray-900">{m.full_name}</td>
                  <td className="px-3 py-2 text-[11px] text-gray-600 max-w-[120px] truncate">{m.college || '—'}</td>
                  <td className="px-3 py-2 text-xs">
                    <div className="font-bold text-gray-900">{m.degree || '—'}</div>
                    <div className="text-[10px] text-gray-400">{m.branch || ''}</div>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700">{m.year || '—'}</td>
                  <td className="px-3 py-2 text-xs">
                    <RankPills mentor={m} />
                  </td>
                  <td className="px-3 py-2 text-xs font-bold text-gray-700 whitespace-nowrap">
                    {m.phone || '—'}
                    {m.phone && <WhatsAppLink phone={m.phone} />}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {m.featured ? (
                      <span className="rank-pill rp-neet px-2 py-1 rounded-full text-[10px] font-extrabold bg-green-100 text-green-800">⭐ Yes</span>
                    ) : (
                      <span className="text-gray-400 italic text-[11px]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <div className="flex gap-1 flex-wrap">
                      <button
                        onClick={() => onViewMentor(m)}
                        className="act-btn px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-[11px] font-black hover:bg-indigo-100 transition"
                      >
                        👁
                      </button>
                      <button
                        onClick={() => removeMentor(m.id)}
                        className="act-btn px-2 py-1 bg-red-50 text-red-700 border border-red-200 rounded-lg text-[11px] font-black hover:bg-red-100 transition"
                      >
                        Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RankPills({ mentor }) {
  const pills = [];
  if (mentor.jee_rank) pills.push({ label: 'JEE', value: mentor.jee_rank, class: 'rp-jee' });
  if (mentor.jee_adv_rank) pills.push({ label: 'Adv', value: mentor.jee_adv_rank, class: 'rp-jeeadv' });
  if (mentor.neet_rank) pills.push({ label: 'NEET', value: mentor.neet_rank, class: 'rp-neet' });
  if (mentor.neet_marks) pills.push({ label: `${mentor.neet_marks}/720`, value: '', class: 'rp-score' });
  if (mentor.kcet_rank) pills.push({ label: 'KCET', value: mentor.kcet_rank, class: 'rp-kcet' });
  if (mentor.comedk_rank) pills.push({ label: 'COMEDK', value: mentor.comedk_rank, class: 'rp-comedk' });

  if (!pills.length) return <span className="text-gray-400 italic text-[11px]">—</span>;

  return (
    <div className="rank-pills flex flex-wrap gap-1">
      {pills.map((p, i) => (
        <span key={i} className={`rank-pill ${p.class} px-2 py-1 rounded-full text-[10px] font-extrabold`}>
          {p.label} {p.value}
        </span>
      ))}
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