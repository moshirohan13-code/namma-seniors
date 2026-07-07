// All credentials pulled from environment variables
// NEVER hardcode secrets in source code

// Debug: Log what environment variables are available
console.log('🔍 Environment check:', {
  hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
  hasSupabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
  hasAdminEmail: !!import.meta.env.VITE_ADMIN_EMAIL,
  supabaseUrlPreview: import.meta.env.VITE_SUPABASE_URL?.slice(0, 30) + '...',
});

export const CONFIG = {
  // Supabase
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON: import.meta.env.VITE_SUPABASE_ANON_KEY,

  // Admin (server-side validation recommended in production)
  ADMIN_EMAIL: import.meta.env.VITE_ADMIN_EMAIL,
  ADMIN_PASSWORD: import.meta.env.VITE_ADMIN_PASSWORD,
  ADMIN_PHONE: import.meta.env.VITE_ADMIN_PHONE,

  // Business
  UPI_ID: import.meta.env.VITE_UPI_ID,
  WHATSAPP_SUPPORT: import.meta.env.VITE_WHATSAPP_SUPPORT,

  // App Settings (MUST MATCH YOUR SQL DEFAULTS)
  SESSION_FEE: 79,
  MENTOR_PAYOUT: 65,
  PLATFORM_FEE: 14,
  INITIAL_MENTOR_COUNT: 6,
  SESSION_KEY: 'ns_student_v4',
  FREE_REQUEST_MENTOR: 'Free Session Request'
};

// Validate required env vars on app load
const required = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_ADMIN_EMAIL',
  'VITE_ADMIN_PASSWORD',
  'VITE_UPI_ID'
];

required.forEach(key => {
  if (!import.meta.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    console.error(`💡 Check your .env file in the project root`);
  }
});