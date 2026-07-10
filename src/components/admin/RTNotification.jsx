export default function RTNotification({ message }) {
  return (
    <div className="rt-notification fixed top-[76px] right-6 z-[200] flex items-center gap-3 bg-gradient-to-r from-indigo-900 to-purple-900 text-white rounded-xl px-5 py-3 shadow-2xl max-w-sm animate-slideDown border border-indigo-300/20">
      <span className="rt-notification-icon text-lg">⚡</span>
      <span className="text-sm font-semibold">{message}</span>
    </div>
  );
}