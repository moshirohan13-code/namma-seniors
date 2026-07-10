export default function LiveUpdateToast({ message }) {
  return (
    <div className="fixed top-[72px] right-4 z-[9999] flex items-center gap-2 max-w-sm bg-gradient-to-r from-indigo-900 to-purple-900 text-white rounded-xl shadow-2xl px-4 py-3 animate-slideDown">
      <span className="text-lg">⚡</span>
      <span className="text-sm font-semibold">{message}</span>
    </div>
  );
}