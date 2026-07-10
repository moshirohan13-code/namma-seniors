export default function AdminToast({ message }) {
  return (
    <div
      id="adToast"
      className="fixed bottom-6 right-6 z-[10000] bg-gray-900 text-white rounded-xl px-4 py-3 text-xs font-bold shadow-2xl max-w-sm animate-slideUp"
    >
      <span id="adToastMsg">{message}</span>
    </div>
  );
}