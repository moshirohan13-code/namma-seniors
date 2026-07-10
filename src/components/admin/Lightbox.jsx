export default function Lightbox({ imageSrc, onClose }) {
  return (
    <div
      id="lightbox"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-5 bg-gray-900/85 backdrop-blur-md"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="lb-close absolute top-5 right-5 w-9 h-9 rounded-full bg-white/15 border-none text-white text-base cursor-pointer flex items-center justify-center hover:bg-white/25 transition"
      >
        ✕
      </button>
      <img
        id="lightboxImg"
        src={imageSrc}
        alt="Proof"
        className="max-w-[90vw] max-h-[88vh] rounded-xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      />
    </div>
  );
}