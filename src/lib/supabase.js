import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config';

// Validate environment variables before creating client
if (!CONFIG.SUPABASE_URL || !CONFIG.SUPABASE_ANON) {
  console.error('❌ MISSING SUPABASE CREDENTIALS');
  console.error('SUPABASE_URL:', CONFIG.SUPABASE_URL ? '✅ SET' : '❌ MISSING');
  console.error('SUPABASE_ANON:', CONFIG.SUPABASE_ANON ? '✅ SET' : '❌ MISSING');
  throw new Error('Supabase URL and Anon Key are required. Check your .env file.');
}

// Singleton Supabase client
export const supabase = createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON
);

console.log('✅ Supabase client initialized:', CONFIG.SUPABASE_URL);

// Helper: Direct REST API call (legacy compatibility)
export async function sbFetch(path, opts = {}) {
  const res = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/${path}`, {
    method: opts.method || 'GET',
    headers: {
      apikey: CONFIG.SUPABASE_ANON,
      Authorization: `Bearer ${CONFIG.SUPABASE_ANON}`,
      'Content-Type': 'application/json',
      Prefer: opts.prefer || 'return=representation',
      ...(opts.headers || {})
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });

  if (!res.ok) {
    let msg = res.statusText;
    try {
      const j = await res.clone().json();
      msg = j.message || j.error || j.hint || msg;
    } catch (_) { }
    throw new Error(msg);
  }

  if (res.status === 204) return null;
  return res.json();
}

// Helper: Upload file to Supabase Storage
export async function sbUpload(bucket, filePath, file) {
  const extMap = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    pdf: 'application/pdf'
  };

  const ext = filePath.split('.').pop().toLowerCase();
  const mimeType = extMap[ext] || file.type || 'image/jpeg';
  const url = `${CONFIG.SUPABASE_URL}/storage/v1/object/${bucket}/${filePath}`;

  for (const method of ['POST', 'PUT']) {
    const res = await fetch(url, {
      method,
      headers: {
        apikey: CONFIG.SUPABASE_ANON,
        Authorization: `Bearer ${CONFIG.SUPABASE_ANON}`,
        'Content-Type': mimeType,
        'x-upsert': 'true',
        'Cache-Control': '3600'
      },
      body: file
    });

    if (res.ok) {
      return `${CONFIG.SUPABASE_URL}/storage/v1/object/public/${bucket}/${filePath}`;
    }

    const errText = await res.text().catch(() => '');
    if (method === 'PUT') {
      throw new Error(`Upload failed (${res.status}): ${errText}`);
    }
    if (res.status !== 409 && res.status !== 400) {
      throw new Error(`Upload failed (${res.status}): ${errText}`);
    }
  }
}