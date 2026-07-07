export default function Toast({ message }) {
  return (
    <div
      id="toast"
      className="fixed bottom-5 right-5 z-[9999] flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl shadow-2xl shadow-indigo-900/30 px-4 py-3.5 max-w-sm border border-white/10 animate-slideUp"
    >
      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-base">
        🔔
      </span>
      <span className="text-[13px] font-semibold leading-snug break-words">{message}</span>
    </div>
  );
}