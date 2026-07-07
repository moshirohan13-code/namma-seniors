export default function Banner({ onRegisterClick }) {
  return (
    <div className="banner-section px-6 -mt-7 relative z-20">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap bg-gradient-to-r from-indigo-950 to-purple-950 text-white rounded-2xl px-6 py-5 shadow-xl">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔥</span>
          <span className="text-sm text-white/90">
            Are you a college senior? Earn <strong className="text-white">₹66</strong> per 1:1 guidance session!
          </span>
        </div>
        <button
          onClick={onRegisterClick}
          className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition whitespace-nowrap"
        >
          Register as Senior Mentor ›
        </button>
      </div>
    </div>
  );
}