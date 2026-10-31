// All credentials pulled from environment variables
// NEVER hardcode secrets in source code

// Debug: Log what environment variables are available
console.log('🔍 Environment check:', {
  hasSupabaseUrl: !!import.meta.env.VITE_SUPABASE_URL,
  hasSupabaseKey: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
});

export const CONFIG = {
  // Supabase
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON: import.meta.env.VITE_SUPABASE_ANON_KEY,

  // Admin phone (used for support contact display — not a secret)
  ADMIN_PHONE: import.meta.env.VITE_ADMIN_PHONE,

  // Business
  UPI_ID: import.meta.env.VITE_UPI_ID,
  WHATSAPP_SUPPORT: import.meta.env.VITE_WHATSAPP_SUPPORT,

  // App Settings (MUST MATCH YOUR SQL DEFAULTS)
  // Entrance-exam seniors
  SESSION_FEE: 99,
  MENTOR_PAYOUT: 75,
  PLATFORM_FEE: 24,

  // Placed seniors (NEW)
  PLACEMENT_SESSION_FEE: 199,
  PLACEMENT_MENTOR_PAYOUT: 159,

  INITIAL_MENTOR_COUNT: 6,
  SESSION_KEY: 'ns_student_v4',
  FREE_REQUEST_MENTOR: 'Free Session Request'
};

/**
 * Price for ONE mentor.
 * 1) If the mentor row has session_fee / mentor_payout set in Supabase, use those.
 * 2) Otherwise placed seniors get 199 / 159 and everyone else gets 99 / 75.
 */
export function getMentorPricing(mentor) {
  const isPlacement = mentor?.category === 'placement';
  const defaultFee = isPlacement ? CONFIG.PLACEMENT_SESSION_FEE : CONFIG.SESSION_FEE;
  const defaultPayout = isPlacement ? CONFIG.PLACEMENT_MENTOR_PAYOUT : CONFIG.MENTOR_PAYOUT;

  const fee = Number(mentor?.session_fee) || defaultFee;
  const payout = Number(mentor?.mentor_payout) || defaultPayout;

  return { fee, payout, platform: fee - payout };
}

// Validate required env vars on app load
const required = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
  'VITE_UPI_ID'
];

required.forEach(key => {
  if (!import.meta.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    console.error(`💡 Check your .env file in the project root`);
  }
});