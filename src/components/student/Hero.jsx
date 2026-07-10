import { CONFIG } from '../../lib/config';

export default function Hero({ onFreeSessionClick, onRegisterClick }) {
  return (
    <section className="hero relative text-white text-center py-20 px-5 overflow-hidden" style={{
      background: 'radial-gradient(ellipse at top left, #818cf8 0%, #6366f1 30%, #7c3aed 70%, #a855f7 100%)',
      backgroundSize: '150% 150%',
      backgroundPosition: 'top left'
    }}>
      <div
        className="absolute w-[400px] h-[400px] -top-24 -left-20 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(147, 197, 253, 0.4) 0%, rgba(99, 102, 241, 0.2) 50%, transparent 100%)',
          filter: 'blur(80px)'
        }}
      />
      <div
        className="absolute w-[350px] h-[350px] -bottom-16 -right-16 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(168, 85, 247, 0.35) 0%, rgba(124, 58, 237, 0.15) 50%, transparent 100%)',
          filter: 'blur(70px)'
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto">
        <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/15 border border-white/20 text-xs font-semibold mb-6">
          ✦ Connect with Seniors from Your Dream College
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-4">
          Connect With Seniors<br />Who Cracked What<br />You're Targeting.
        </h1>

        <p className="max-w-xl mx-auto text-white/90 text-sm sm:text-base leading-relaxed mb-7">
          Direct 1:1 guidance for JEE, NEET, KCET, COMEDK, plus Internship &amp; Placement strategies from
          Seniors who have cracked top companies.
        </p>

        <div className="flex flex-row justify-center items-stretch gap-3 flex-wrap max-w-md mx-auto">
          <button
            onClick={onFreeSessionClick}
            className="flex-1 min-w-0 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition"
          >
            <span className="flex-shrink-0">📞</span>
            <span className="whitespace-nowrap">Book Free Session</span>
          </button>
          <button
            onClick={onRegisterClick}
            className="flex-1 min-w-0 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition"
          >
            <span className="flex-shrink-0">🎓</span>
            <span className="whitespace-nowrap">Register as Senior</span>
          </button>
        </div>
      </div>
    </section>
  );
}