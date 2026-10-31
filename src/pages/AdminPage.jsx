import { useState, useEffect } from 'react';
import { supabase, sbFetch } from '../lib/supabase';
import { CONFIG } from '../lib/config';

// Import Admin Components
import AdminLogin from '../components/admin/AdminLogin';
import AdminNav from '../components/admin/AdminNav';
import AdminTabs from '../components/admin/AdminTabs';
import AdminStats from '../components/admin/AdminStats';
import BookingsPanel from '../components/admin/BookingsPanel';
import FreeRequestsPanel from '../components/admin/FreeRequestsPanel';
import MentorsPanel from '../components/admin/MentorsPanel';
import ApprovalsPanel from '../components/admin/ApprovalsPanel';
import PlacementPanel from '../components/admin/PlacementPanel';
import StudentsPanel from '../components/admin/StudentsPanel';
import PdfPurchasesPanel from '../components/admin/PdfPurchasesPanel';
import AdminToast from '../components/admin/AdminToast';
import RTNotification from '../components/admin/RTNotification';
import Lightbox from '../components/admin/Lightbox';
import DetailModal from '../components/admin/DetailModal';

export default function AdminPage() {
  console.log('✅ AdminPage rendering');

  // ══════════════════════════════════════════════════════════
  // ALL HOOKS FIRST (BEFORE ANY CONDITIONAL LOGIC)
  // ══════════════════════════════════════════════════════════

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Data state
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookings, setBookings] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [applications, setApplications] = useState([]);
  const [students, setStudents] = useState([]);
  const [pdfPurchases, setPdfPurchases] = useState([]);

  // Toast & Notifications
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [rtMessage, setRtMessage] = useState('');
  const [showRT, setShowRT] = useState(false);

  // Modals
  const [lightboxImage, setLightboxImage] = useState('');
  const [detailData, setDetailData] = useState(null);
  const [detailType, setDetailType] = useState('');

  // Error tracking
  const [renderError, setRenderError] = useState(null);

  // Constants (safe to declare after hooks)
  const SESSION_FEE = CONFIG.SESSION_FEE;
  const MENTOR_PAYOUT = CONFIG.MENTOR_PAYOUT;

  // ══════════════════════════════════════════════════════════
  // EFFECT 1: AUTH CHECK (runs on mount)
  // ══════════════════════════════════════════════════════════

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        setIsAuthenticated(false);
        return;
      }
      const { data: adminRow } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle();
      setIsAuthenticated(!!adminRow);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) setIsAuthenticated(false);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // ══════════════════════════════════════════════════════════
  // EFFECT 2: DATA LOADING (only runs when authenticated)
  // ══════════════════════════════════════════════════════════

  useEffect(() => {
    // Guard clause INSIDE effect, not outside component
    if (!isAuthenticated) {
      console.log('⏸️ Skipping data load - not authenticated');
      return;
    }

    console.log('✅ Admin authenticated, loading dashboard data...');

    loadAll();
    setupRealtimeAdmin();

    const interval = setInterval(loadAll, 60000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // ══════════════════════════════════════════════════════════
  // CONDITIONAL RENDER (AFTER ALL HOOKS)
  // ══════════════════════════════════════════════════════════

  if (!isAuthenticated) {
    console.log('🔒 Showing admin login screen');
    return <AdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  // ══════════════════════════════════════════════════════════
  // HELPER FUNCTIONS (defined after hooks, before final render)
  // ══════════════════════════════════════════════════════════
  async function fetchMentors() {
    try {
      const { data, error } = await supabase
        .from('mentors')
        .select('*')
        .eq('status', 'approved')
        .order('priority', { ascending: true, nullsFirst: false });
      if (error) throw error;
      setMentors(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('[Mentors]', e);
      setMentors([]);
    }
  }
  async function loadAll() {
    await Promise.allSettled([
      fetchBookings(),
      fetchMentors(),
      fetchApplications(),
      fetchStudents(),
      fetchPdfPurchases()
    ]);

  }

  async function fetchBookings() {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setBookings(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('[Bookings]', e);
      setBookings([]);
      showToastMessage('❌ Could not load bookings.');
    }
  }


  async function fetchApplications() {
    try {
      const { data, error } = await supabase
        .from('mentor_applications')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setApplications(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('[Applications]', e);
      setApplications([]);
    }
  }
  async function fetchStudents() {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('last_seen', { ascending: false, nullsFirst: false });
      if (error) throw error;
      setStudents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('[Students]', e);
      setStudents([]);
    }
  }

  async function fetchPdfPurchases() {
    try {
      const { data, error } = await supabase
        .from('pdf_purchases')
        .select('*, pdfs(title, slug, price)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPdfPurchases(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('[PdfPurchases]', e);
      setPdfPurchases([]);
    }
  }

  function setupRealtimeAdmin() {
    // Bookings realtime
    supabase
      .channel('admin-bookings-rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        payload => {
          const { eventType, new: newRow, old: oldRow } = payload;

          if (eventType === 'INSERT') {
            setBookings(prev => [newRow, ...prev]);
            showRTMessage(
              `🆕 New booking from ${newRow.student_name || 'student'} → ${newRow.mentor_name || 'mentor'
              }`
            );
          } else if (eventType === 'UPDATE') {
            setBookings(prev => {
              const idx = prev.findIndex(b => String(b.id) === String(newRow.id));
              if (idx >= 0) {
                const updated = [...prev];
                updated[idx] = newRow;
                return updated;
              }
              return [newRow, ...prev];
            });
            const statusLabel = {
              verified: '✅ Verified',
              sent: '🔗 Meet Sent',
              completed: '🎓 Completed',
              cancelled: '❌ Cancelled'
            }[newRow.status] || newRow.status;
            showRTMessage(`Booking ${newRow.student_name || ''} → ${statusLabel}`);
          } else if (eventType === 'DELETE') {
            setBookings(prev => prev.filter(b => String(b.id) !== String(oldRow.id)));
            showRTMessage('A booking was deleted.');
          }
        }
      )
      .subscribe();

    // Mentors realtime
    supabase
      .channel('admin-mentors-rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mentors' },
        payload => {
          const { eventType, new: newRow, old: oldRow } = payload;

          if (eventType === 'INSERT' && newRow.status === 'approved') {
            setMentors(prev => [...prev, newRow]);
            showRTMessage(`🆕 Mentor approved: ${newRow.full_name}`);
          } else if (eventType === 'UPDATE') {
            if (newRow.status === 'approved') {
              setMentors(prev => {
                const idx = prev.findIndex(m => String(m.id) === String(newRow.id));
                if (idx >= 0) {
                  const updated = [...prev];
                  updated[idx] = newRow;
                  return updated;
                }
                return [...prev, newRow];
              });
            } else {
              setMentors(prev => prev.filter(m => String(m.id) !== String(newRow.id)));
            }
            showRTMessage(`Mentor ${newRow.full_name} updated → ${newRow.status}`);
          } else if (eventType === 'DELETE') {
            setMentors(prev => prev.filter(m => String(m.id) !== String(oldRow.id)));
            showRTMessage('A mentor was removed.');
          }
        }
      )
      .subscribe();

    // Applications realtime
    supabase
      .channel('admin-apps-rt')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mentor_applications' },
        payload => {
          const { eventType, new: newRow } = payload;

          if (eventType === 'INSERT' && newRow.status === 'pending') {
            setApplications(prev => [newRow, ...prev]);
            showRTMessage(
              newRow.category === 'placement'
                ? `💼 New placed senior registration: ${newRow.full_name}`
                : `📋 New mentor application: ${newRow.full_name}`
            );
          } else if (eventType === 'UPDATE') {
            if (newRow.status !== 'pending') {
              setApplications(prev =>
                prev.filter(a => String(a.id) !== String(newRow.id))
              );
              if (newRow.status === 'approved') {
                showRTMessage(`✅ ${newRow.full_name} approved as mentor!`);
              } else {
                showRTMessage(`${newRow.full_name}'s application ${newRow.status}.`);
              }
            }
          }
        }
      )
      .subscribe();
  }

  function showToastMessage(msg) {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  }

  function showRTMessage(msg) {
    setRtMessage(msg);
    setShowRT(true);
    setTimeout(() => setShowRT(false), 5000);
  }

  function isFreeRequest(b) {
    return (
      Number(b?.session_fee || 0) === 0 ||
      String(b?.mentor_name || '').toLowerCase() === 'free session request'
    );
  }

  function getPaidBookings() {
    return bookings.filter(b => !isFreeRequest(b));
  }

  function getFreeRequests() {
    return bookings.filter(b => isFreeRequest(b));
  }

  // ══════════════════════════════════════════════════════════
  // COMPUTED VALUES (safe after hooks)
  // ══════════════════════════════════════════════════════════

  // Split everything into ENTRANCE seniors and PLACED seniors
  const isPlacementMentor = m => m?.category === 'placement';
  const placementMentors = mentors.filter(isPlacementMentor);
  const entranceMentors = mentors.filter(m => !isPlacementMentor(m));
  const placementMentorIds = new Set(placementMentors.map(m => String(m.id)));

  const placementApps = applications.filter(a => a.category === 'placement');
  const entranceApps = applications.filter(a => a.category !== 'placement');

  const paidBookings = getPaidBookings();
  const isPlacementBooking = b =>
    placementMentorIds.has(String(b.mentor_id)) ||
    Number(b.session_fee) === Number(CONFIG.PLACEMENT_SESSION_FEE);
  const placementBookings = paidBookings.filter(isPlacementBooking);
  const entranceBookings = paidBookings.filter(b => !isPlacementBooking(b));

  function calcMoney(list, defFee, defPayout) {
    const valid = list.filter(b => (b.status || 'pending') !== 'cancelled');
    return {
      revenue: valid.reduce((s, b) => s + Number(b.session_fee || defFee), 0),
      payouts: valid.reduce((s, b) => s + Number(b.mentor_payout || defPayout), 0)
    };
  }

  const entranceMoney = calcMoney(entranceBookings, SESSION_FEE, MENTOR_PAYOUT);
  const placementMoney = calcMoney(
    placementBookings,
    CONFIG.PLACEMENT_SESSION_FEE,
    CONFIG.PLACEMENT_MENTOR_PAYOUT
  );

  const showPlacementStats = activeTab === 'placement';

  const tabCounts = {
    bookings: entranceBookings.length,
    free: getFreeRequests().length,
    mentors: entranceMentors.length,
    approvals: entranceApps.length,
    placement: placementApps.length,
    students: (() => {
      const map = {};
      bookings.forEach(b => {
        const key = b.student_email || b.student_phone;
        if (key) map[key] = true;
      });
      students.forEach(s => {
        const key = s.email || s.phone;
        if (key) map[key] = true;
      });
      return Object.keys(map).length;
    })(),
    pdfs: pdfPurchases.length
  };

  // ══════════════════════════════════════════════════════════
  // FINAL RENDER (authenticated dashboard)
  // ══════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav
        onSignOut={async () => {
          await supabase.auth.signOut();
          setIsAuthenticated(false);
          window.location.href = '/';
        }}
      />

      <AdminTabs activeTab={activeTab} onTabChange={setActiveTab} counts={tabCounts} />

      <div className="adm-content px-7 py-5">
        <AdminStats
          totalBookings={showPlacementStats ? placementBookings.length : entranceBookings.length}
          activeMentors={showPlacementStats ? placementMentors.length : entranceMentors.length}
          revenue={showPlacementStats ? placementMoney.revenue : entranceMoney.revenue}
          payouts={showPlacementStats ? placementMoney.payouts : entranceMoney.payouts}
        />

        {activeTab === 'bookings' && (
          <BookingsPanel
            bookings={entranceBookings}
            mentors={entranceMentors}
            onRefresh={loadAll}
            onViewBooking={b => {
              setDetailData(b);
              setDetailType('booking');
            }}
            onOpenLightbox={setLightboxImage}
            showToast={showToastMessage}
          />
        )}

        {activeTab === 'free' && (
          <FreeRequestsPanel
            freeRequests={getFreeRequests()}
            onRefresh={loadAll}
            showToast={showToastMessage}
          />
        )}

        {activeTab === 'mentors' && (
          <MentorsPanel
            mentors={entranceMentors}
            onRefresh={loadAll}
            onViewMentor={m => {
              setDetailData(m);
              setDetailType('mentor');
            }}
            showToast={showToastMessage}
          />
        )}

        {activeTab === 'approvals' && (
          <ApprovalsPanel
            applications={entranceApps}
            onRefresh={loadAll}
            onViewApp={a => {
              setDetailData(a);
              setDetailType('app');
            }}
            showToast={showToastMessage}
          />
        )}

        {activeTab === 'placement' && (
          <PlacementPanel
            applications={placementApps}
            mentors={placementMentors}
            bookings={placementBookings}
            onRefresh={loadAll}
            onViewApp={a => {
              setDetailData(a);
              setDetailType('app');
            }}
            onViewMentor={m => {
              setDetailData(m);
              setDetailType('mentor');
            }}
            onViewBooking={b => {
              setDetailData(b);
              setDetailType('booking');
            }}
            onOpenLightbox={setLightboxImage}
            showToast={showToastMessage}
          />
        )}

        {activeTab === 'students' && (
          <StudentsPanel bookings={bookings} students={students} onRefresh={loadAll} />
        )}

        {activeTab === 'pdfs' && (
          <PdfPurchasesPanel purchases={pdfPurchases} onRefresh={loadAll} />
        )}
      </div>

      {lightboxImage && (
        <Lightbox imageSrc={lightboxImage} onClose={() => setLightboxImage('')} />
      )}

      {detailData && (
        <DetailModal
          data={detailData}
          type={detailType}
          mentors={mentors}
          onClose={() => {
            setDetailData(null);
            setDetailType('');
          }}
        />
      )}

      {showToast && <AdminToast message={toastMessage} />}
      {showRT && <RTNotification message={rtMessage} />}

      {renderError && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'white',
          padding: '40px',
          borderRadius: '12px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          zIndex: 99999,
          maxWidth: '500px'
        }}>
          <h2 style={{ color: 'red', marginBottom: '20px' }}>❌ Admin Panel Error</h2>
          <pre style={{
            background: '#f5f5f5',
            padding: '15px',
            borderRadius: '8px',
            fontSize: '12px',
            overflow: 'auto',
            maxHeight: '300px'
          }}>
            {renderError.toString()}
          </pre>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            ← Back to Home
          </button>
        </div>
      )}
    </div>
  );
}