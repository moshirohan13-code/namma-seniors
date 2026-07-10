// Avatar color palette
const AVATAR_PALETTE = [
  ['#6366f1', '#8b5cf6'],
  ['#4f46e5', '#3b82f6'],
  ['#8b5cf6', '#7c3aed'],
  ['#2563eb', '#6366f1'],
  ['#4f46e5', '#8b5cf6'],
  ['#7c3aed', '#3b82f6'],
  ['#4338ca', '#8b5cf6'],
  ['#2563eb', '#7c3aed']
];

export function pickPalette(name) {
  let h = 0;
  for (const c of String(name || '')) {
    h = ((h << 5) - h) + c.charCodeAt(0);
  }
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

export function getInitials(name) {
  if (!name) return '?';
  const clean = String(name).split('(')[0].trim();
  if (!clean) return '?';
  return clean
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

export function fmtTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function examTagClass(exam) {
  const e = String(exam || '').toLowerCase();
  if (e.includes('advanced') || e.includes('adv')) return 'tag-jeea';
  if (e.includes('jee')) return 'tag-jee';
  if (e.includes('neet')) return 'tag-neet';
  if (e.includes('kcet')) return 'tag-kcet';
  if (e.includes('comedk')) return 'tag-comedk';
  return 'tag-default';
}

export function parseExams(profile) {
  if (!profile) return [];
  const t = [];
  if (/jee.?adv/i.test(profile)) t.push('JEE Adv');
  else if (/jee/i.test(profile)) t.push('JEE');
  if (/neet/i.test(profile)) t.push('NEET');
  if (/kcet/i.test(profile)) t.push('KCET');
  if (/comedk/i.test(profile)) t.push('COMEDK');
  return t.length ? t : [profile.trim().slice(0, 20)];
}

export function sanitizeMentorData(mentor) {
  if (!mentor) return null;
  const { phone, id_card_url, status, payout_per_session, homepage_highlight, featured, ...safe } = mentor;
  return safe;
}