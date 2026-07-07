import { useState, useEffect, useRef } from 'react';
import { supabase, sbFetch, sbUpload } from '../lib/supabase';
import { CONFIG } from '../lib/config';
import {
  pickPalette,
  getInitials,
  esc,
  fmtDate,
  fmtTime,
  examTagClass,
  parseExams,
  sanitizeMentorData
} from '../utils/helpers';
import { isValidEmail, isValidPhone, sanitizePhone } from '../utils/validators';

// Import components
import Navbar from '../components/student/Navbar';
import Hero from '../components/student/Hero';
import FilterBar from '../components/student/FilterBar';
import MentorGrid from '../components/student/MentorGrid';
import Footer from '../components/student/Footer';
import LoginGate from '../components/student/LoginGate';
import ProfileModal from '../components/student/ProfileModal';
import CheckoutModal from '../components/student/CheckoutModal';
import MyBookingsModal from '../components/student/MyBookingsModal';
import OnboardingModal from '../components/student/OnboardingModal';
import FreeSessionModal from '../components/student/FreeSessionModal';
import Toast from '../components/common/Toast';
import LiveUpdateToast from '../components/common/LiveUpdateToast';

export default function StudentPage() {
  // ══════════════════════════════════════════════════════════
  // ALL STATE DECLARATIONS (MUST BE AT TOP)
  // ══════════════════════════════════════════════════════════

  // ── SESSION ──
  const [studentSession, setStudentSession] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ── MENTORS ──
  const [allMentors, setAllMentors] = useState([]);
  const [filteredMentors, setFilteredMentors] = useState([]);
  const [showAllMentors, setShowAllMentors] = useState(false);

  // ── BOOKINGS ──
  const [myBookingsCache, setMyBookingsCache] = useState([]);

  // ── CURRENT SELECTION ──
  const [currentMentor, setCurrentMentor] = useState(null);
  const [paymentProofUrl, setPaymentProofUrl] = useState('');

  // ── FILTERS (CRITICAL - MUST EXIST) ──
  const [searchQuery, setSearchQuery] = useState('');
  const [examFilter, setExamFilter] = useState('All');
  const [rankFilter, setRankFilter] = useState('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // ── MODALS ──
  const [showLoginGate, setShowLoginGate] = useState(false);
  const [loginGateMandatory, setLoginGateMandatory] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showMyBookings, setShowMyBookings] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showFreeSession, setShowFreeSession] = useState(false);

  // ── CHECKOUT STATE ──
  const [checkoutStep, setCheckoutStep] = useState('payment'); // 'payment' | 'success'

  // ── TOAST ──
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [liveUpdateMessage, setLiveUpdateMessage] = useState('');
  const [showLiveUpdate, setShowLiveUpdate] = useState(false);

  // ── PENDING ACTION (after login) ──
  const [pendingPostLoginAction, setPendingPostLoginAction] = useState(null);

  // ══════════════════════════════════════════════════════════
  // EFFECTS (AFTER ALL STATE)
  // ══════════════════════════════════════════════════════════

  // ── LOAD SESSION ON MOUNT ──
  useEffect(() => {
    const saved = loadSession();
    if (saved?.email && saved?.phone) {
      setStudentSession(saved);
      setIsLoggedIn(true);
    }
  }, []);

  // ── LOAD MENTORS ON MOUNT ──
  useEffect(() => {
    loadMentors();
  }, []);

  // ── SETUP REALTIME SUBSCRIPTIONS ──
  useEffect(() => {
    if (!isLoggedIn) return;

    setupRealtimeSubscriptions();
    fetchStudentBookings();

    return () => teardownRealtime();
  }, [isLoggedIn]);

  // ── APPLY FILTERS WHEN INPUTS CHANGE ──
  useEffect(() => {
    applyFiltersAndRender();
  }, [searchQuery, examFilter, rankFilter, allMentors]);

  // ══════════════════════════════════════════════════════════
  // SESSION MANAGEMENT
  // ══════════════════════════════════════════════════════════

  function loadSession() {
    try {
      const raw = localStorage.getItem(CONFIG.SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function saveSession(data) {
    ['ns_student_session', 'ns_student_v2', 'ns_student_v3'].forEach(k =>
      localStorage.removeItem(k)
    );
    localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify(data));
    setStudentSession(data);
    setIsLoggedIn(true);
  }

  function clearSession() {
    ['ns_student_session', 'ns_student_v2', 'ns_student_v3', CONFIG.SESSION_KEY].forEach(k =>
      localStorage.removeItem(k)
    );
    setStudentSession(null);
    setIsLoggedIn(false);
  }

  // ══════════════════════════════════════════════════════════
  // REALTIME SUBSCRIPTIONS
  // ══════════════════════════════════════════════════════════

  const bookingChannelRef = useRef(null);
  const mentorChannelRef = useRef(null);
  function setupRealtimeSubscriptions() {
    teardownRealtime();

    mentorChannelRef.current = supabase
      .channel('student-mentors-rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mentors' },
        payload => {
          const { eventType, new: newRow } = payload;
          if (eventType === 'INSERT' && newRow?.status === 'approved') {
            showLiveUpdateMessage(`🆕 New mentor joined: ${newRow.full_name}`);
          }
          if (eventType === 'UPDATE' && newRow?.status === 'approved') {
            showLiveUpdateMessage(`✅ ${newRow.full_name} is now available!`);
          }
          loadMentors();
        }
      )
      .subscribe();

    bookingChannelRef.current = supabase
      .channel('student-bookings-rt')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'bookings' },
        payload => {
          const updated = payload.new;
          if (!updated || !isLoggedIn) return;

          const email = studentSession?.email || '';
          if ((updated.student_email || '').toLowerCase() === email.toLowerCase()) {
            const statusLabels = {
              pending: '⏳ Pending',
              verified: '✅ Verified by Admin',
              sent: '🔗 Meet Link Added',
              completed: '🎓 Session Completed',
              cancelled: '❌ Cancelled'
            };
            showLiveUpdateMessage(
              `Booking updated: ${updated.mentor_name || 'Session'} → ${statusLabels[updated.status] || updated.status
              }`
            );
            fetchStudentBookings();
          }
        }
      )
      .subscribe();
  }

  function teardownRealtime() {
    if (bookingChannelRef.current) {
      supabase.removeChannel(bookingChannelRef.current);
      bookingChannelRef.current = null;
    }
    if (mentorChannelRef.current) {
      supabase.removeChannel(mentorChannelRef.current);
      mentorChannelRef.current = null;
    }
  }

  function showLiveUpdateMessage(msg) {
    setLiveUpdateMessage(msg);
    setShowLiveUpdate(true);
    setTimeout(() => setShowLiveUpdate(false), 5000);
  }

  // ══════════════════════════════════════════════════════════
  // MENTORS
  // ══════════════════════════════════════════════════════════

  async function loadMentors() {
    try {
      const { data, error } = await supabase
        .from('mentors')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Mentors error]', error);
        throw error;
      }

      console.log('[Mentors loaded]', data?.length || 0, 'mentors');
      setAllMentors(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('[Mentors fetch failed]', e);
      setAllMentors([]);
      showToastMessage('⚠️ Could not load mentors: ' + (e.message || 'Unknown error'));
    }
  }

  function applyFiltersAndRender() {
    const search = searchQuery.toLowerCase();
    const examCat = examFilter;
    const rankRng = rankFilter;

    const filtered = allMentors.filter(m => {
      const blob = `${m.full_name || ''} ${m.college || ''} ${m.branch || ''}`.toLowerCase();
      const prof = (m.exam_profile || '').toLowerCase();

      if (search && !blob.includes(search)) return false;

      if (examCat !== 'All') {
        const map = { JEE: 'jee', NEET: 'neet', KCET: 'kcet', COMEDK: 'comedk' };
        if (!prof.includes(map[examCat] || '')) return false;
      }

      if (rankRng) {
        const [lo, hi] = rankRng.split('-').map(Number);
        const rank =
          parseInt(m.kcet_rank || 0) ||
          parseInt(m.jee_rank || 0) ||
          parseInt(m.neet_rank || 0) ||
          parseInt(m.comedk_rank || 0) ||
          999999;
        if (rank < lo || rank > hi) return false;
      }

      return true;
    });

    setFilteredMentors(filtered);
    setShowAllMentors(false);
  }

  // ══════════════════════════════════════════════════════════
  // BOOKINGS
  // ══════════════════════════════════════════════════════════

  async function fetchStudentBookings() {
    if (!isLoggedIn || !studentSession?.email) return;

    try {
      const data = await sbFetch(
        `bookings?select=*&student_email=eq.${encodeURIComponent(
          studentSession.email
        )}&order=created_at.desc`
      );
      setMyBookingsCache(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('[fetchStudentBookings]', e);
    }
  }

  // ══════════════════════════════════════════════════════════
  // AUTH HELPERS
  // ══════════════════════════════════════════════════════════

  function requireLogin(action, message = '⚠️ Please log in to continue.') {
    if (isLoggedIn) {
      action();
      return;
    }
    setPendingPostLoginAction(() => action);
    setLoginGateMandatory(true);
    setShowLoginGate(true);
    showToastMessage(message);
  }

  function afterLoginSuccess() {
    setShowLoginGate(false);

    const action = pendingPostLoginAction;
    setPendingPostLoginAction(null);
    if (typeof action === 'function') action();
  }

  // ══════════════════════════════════════════════════════════
  // TOAST
  // ══════════════════════════════════════════════════════════

  function showToastMessage(msg) {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4200);
  }

  // ══════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <Navbar
        isLoggedIn={isLoggedIn}
        studentSession={studentSession}
        onLogout={() => {
          clearSession();
          teardownRealtime();
          setMyBookingsCache([]);
          showToastMessage('👋 Signed out successfully.');
        }}
        onMyBookingsClick={() => {
          requireLogin(() => {
            setShowMyBookings(true);
          }, '⚠️ Please log in to view your bookings.');
        }}
        onMyProfileClick={() => {
          requireLogin(() => {
            showToastMessage(
              `👤 ${studentSession?.email || 'Guest'} · 📞 ${studentSession?.phone || '—'}`
            );
          }, '⚠️ Please log in to view your profile.');
        }}
      />

      {/* Hero */}
      <Hero
        onFreeSessionClick={() => {
          requireLogin(() => {
            setShowFreeSession(true);
          }, '⚠️ Please log in to book a free session.');
        }}
        onRegisterClick={() => {
          requireLogin(() => {
            setShowOnboarding(true);
          }, '⚠️ Please log in to register as a mentor.');
        }}
      />

      {/* Banner removed - Register as Senior moved to Hero */}

      {/* Filter Bar */}
      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        examFilter={examFilter}
        onExamChange={setExamFilter}
        rankFilter={rankFilter}
        onRankChange={setRankFilter}
        onClearFilters={() => {
          setSearchQuery('');
          setExamFilter('All');
          setRankFilter('');
        }}
        showFilterDrawer={showFilterDrawer}
        onToggleDrawer={() => setShowFilterDrawer(!showFilterDrawer)}
        onCloseDrawer={() => setShowFilterDrawer(false)}
        mentorCount={filteredMentors.length}
      />

      {/* Mentor Grid */}
      <MentorGrid
        mentors={filteredMentors}
        showAll={showAllMentors}
        onViewAll={() => setShowAllMentors(true)}
        onBookSession={mentor => {
          setCurrentMentor(mentor);
          setShowProfileModal(true);
        }}
      />

      {/* What is Namma Seniors Section */}
      <section className="what-section max-w-6xl mx-auto text-center px-6 py-16">
        <div className="section-tag inline-flex px-4 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 text-xs font-bold tracking-wide mb-4">
          ✨ The Platform
        </div>
        <h2 className="section-title text-4xl font-extrabold mb-4 tracking-tight">What is Namma Seniors?</h2>
        <p className="section-sub max-w-2xl mx-auto text-sm text-gray-600 leading-relaxed mb-10">
          Namma Seniors is a student-built mentorship platform connecting aspirants directly with seniors
          from top engineering and medical colleges. Skip the noise of YouTube and forums — get
          <strong> honest, first-hand advice</strong> from someone who recently cracked the same exam
          you're preparing for.
        </p>
        <div className="what-features grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="wf-item bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition">
            <div className="wf-icon w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-700 to-purple-700 text-white flex items-center justify-center text-xl mb-4 shadow-md">
              🎯
            </div>
            <h4 className="text-base font-bold mb-2">Targeted Guidance</h4>
            <p className="text-sm text-gray-600 leading-relaxed">Talk to mentors from the exact college, branch, and exam you're targeting.</p>
          </div>
          <div className="wf-item bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition">
            <div className="wf-icon w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-700 text-white flex items-center justify-center text-xl mb-4 shadow-md">
              🤝
            </div>
            <h4 className="text-base font-bold mb-2">1:1 Live Sessions</h4>
            <p className="text-sm text-gray-600 leading-relaxed">30-minute private Google Meet calls — your questions, their experience.</p>
          </div>
          <div className="wf-item bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition">
            <div className="wf-icon w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center text-xl mb-4 shadow-md">
              💼
            </div>
            <h4 className="text-base font-bold mb-2">Career Mentorship</h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              Go beyond exams with internship, resume, interview, and placement guidance from seniors who've
              done it themselves.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section max-w-6xl mx-auto text-center px-6 py-16">
        <div className="section-tag inline-flex px-4 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 text-xs font-bold tracking-wide mb-4">
          💎 Why Join
        </div>
        <h2 className="section-title text-4xl font-extrabold mb-4 tracking-tight">Built for Both Sides of the Journey</h2>
        <p className="section-sub max-w-2xl mx-auto text-sm text-gray-600 leading-relaxed mb-10">Whether you're aspiring or already there — Namma Seniors works for you.</p>
        <div className="benefits-grid grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          <div className="benefit-card bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition">
            <div className="benefit-header flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
              <div className="benefit-icon w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-700 to-purple-700 text-white flex items-center justify-center text-xl shadow-md">
                🎓
              </div>
              <div>
                <div className="benefit-eyebrow text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">For Aspirants</div>
                <h3 className="text-lg font-bold">Juniors Get Clarity</h3>
              </div>
            </div>
            <ul className="benefit-list list-none space-y-3 mb-5" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li className="flex items-start gap-2 text-sm text-gray-600" style={{ position: 'relative' }}>
                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ marginTop: '2px' }}>✓</span>
                <span style={{ flex: 1, lineHeight: '1.6' }}>Skip generic YouTube videos and get personalised advice from real seniors.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600" style={{ position: 'relative' }}>
                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ marginTop: '2px' }}>✓</span>
                <span style={{ flex: 1, lineHeight: '1.6' }}>Understand the <strong>real college culture</strong>, branch life, and placement reality.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600" style={{ position: 'relative' }}>
                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ marginTop: '2px' }}>✓</span>
                <span style={{ flex: 1, lineHeight: '1.6' }}>Get counseling help during KCET, COMEDK, JEE &amp; NEET mock allotments.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600" style={{ position: 'relative' }}>
                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ marginTop: '2px' }}>✓</span>
                <span style={{ flex: 1, lineHeight: '1.6' }}>Make confident college choices — backed by people who've been there.</span>
              </li>
            </ul>
            <div className="benefit-cta text-center text-xs text-gray-500 font-semibold pt-3 border-t border-dashed border-gray-200">Browse mentors above ↑</div>
          </div>
          <div className="benefit-card bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition">
            <div className="benefit-header flex items-center gap-3 mb-4 pb-4 border-b border-gray-100">
              <div className="benefit-icon w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 text-white flex items-center justify-center text-xl shadow-md">
                💼
              </div>
              <div>
                <div className="benefit-eyebrow text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">For Mentors</div>
                <h3 className="text-lg font-bold">Seniors Earn &amp; Grow</h3>
              </div>
            </div>
            <ul className="benefit-list list-none space-y-3 mb-5" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <li className="flex items-start gap-2 text-sm text-gray-600" style={{ position: 'relative' }}>
                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ marginTop: '2px' }}>✓</span>
                <span style={{ flex: 1, lineHeight: '1.6' }}>Earn <strong>₹66 per session</strong> — flexible, work from your hostel room.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600" style={{ position: 'relative' }}>
                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ marginTop: '2px' }}>✓</span>
                <span style={{ flex: 1, lineHeight: '1.6' }}>Build <strong>communication &amp; mentoring skills</strong> that boost your resume.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600" style={{ position: 'relative' }}>
                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ marginTop: '2px' }}>✓</span>
                <span style={{ flex: 1, lineHeight: '1.6' }}>Give back to your junior community across India.</span>
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600" style={{ position: 'relative' }}>
                <span className="w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ marginTop: '2px' }}>✓</span>
                <span style={{ flex: 1, lineHeight: '1.6' }}>Zero setup — we handle bookings, payments &amp; scheduling.</span>
              </li>
            </ul>
            <button
              className="benefit-cta-btn w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold shadow-lg hover:shadow-xl transition"
              onClick={() => {
                requireLogin(() => {
                  setShowOnboarding(true);
                }, '⚠️ Please log in to register as a mentor.');
              }}
            >
              Register as Mentor →
            </button>
          </div>
        </div>
      </section>
      {/* Footer */}
      <Footer />

      {/* Modals */}
      {showLoginGate && (
        <LoginGate
          mandatory={loginGateMandatory}
          onClose={() => {
            if (!loginGateMandatory) setShowLoginGate(false);
          }}
          onSuccess={data => {
            saveSession(data);
            afterLoginSuccess();
            showToastMessage('✅ Logged in successfully!');
          }}
          showToast={showToastMessage}
        />
      )}

      {showProfileModal && currentMentor && (
        <ProfileModal
          mentor={currentMentor}
          onClose={() => setShowProfileModal(false)}
          onBookSession={() => {
            setShowProfileModal(false);
            requireLogin(() => {
              setPaymentProofUrl('');
              setCheckoutStep('payment');
              setShowCheckoutModal(true);
            }, '⚠️ Please log in to book a session.');
          }}
        />
      )}

      {showCheckoutModal && currentMentor && (
        <CheckoutModal
          mentor={currentMentor}
          studentSession={studentSession}
          step={checkoutStep}
          paymentProofUrl={paymentProofUrl}
          onPaymentProofUpload={setPaymentProofUrl}
          onConfirm={async () => {
            if (!paymentProofUrl) {
              showToastMessage('⚠️ Upload payment screenshot first.');
              return;
            }

            const studentName = (studentSession.email || '').split('@')[0] || 'Student';
            const studentPhone = studentSession.phone || '—';
            const studentEmail = studentSession.email || '—';

            try {
              await sbFetch('bookings', {
                method: 'POST',
                body: {
                  mentor_id: currentMentor.id,
                  mentor_name: currentMentor.full_name,
                  student_name: studentName,
                  student_phone: studentPhone,
                  student_email: studentEmail,
                  payment_proof_url: paymentProofUrl,
                  session_fee: CONFIG.SESSION_FEE,
                  mentor_payout: CONFIG.MENTOR_PAYOUT,
                  platform_fee: CONFIG.PLATFORM_FEE,
                  status: 'pending',
                  created_at: new Date().toISOString()
                }
              });

              setCheckoutStep('success');
              showToastMessage('✅ Booking confirmed!');
              fetchStudentBookings();
            } catch (e) {
              console.error('[Paid Booking]', e);
              showToastMessage('❌ Booking failed: ' + e.message);
            }
          }}
          onClose={() => setShowCheckoutModal(false)}
          showToast={showToastMessage}
        />
      )}

      {showMyBookings && (
        <MyBookingsModal
          bookings={myBookingsCache}
          onClose={() => setShowMyBookings(false)}
        />
      )}

      {showOnboarding && (
        <OnboardingModal
          studentSession={studentSession}
          onClose={() => setShowOnboarding(false)}
          showToast={showToastMessage}
        />
      )}

      {showFreeSession && (
        <FreeSessionModal
          studentSession={studentSession}
          onClose={() => setShowFreeSession(false)}
          onSuccess={() => {
            fetchStudentBookings();
            showToastMessage('✅ Free session request submitted!');
          }}
          showToast={showToastMessage}
        />
      )}

      {/* Toasts */}
      {showToast && <Toast message={toastMessage} />}
      {showLiveUpdate && <LiveUpdateToast message={liveUpdateMessage} />}
    </div>
  );
}