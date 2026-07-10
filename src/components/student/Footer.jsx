import { CONFIG } from '../../lib/config';

export default function Footer() {
  return (
    <footer className="ns-footer bg-gradient-to-br from-gray-900 to-indigo-950 text-gray-300">
      <div className="footer-inner max-w-6xl mx-auto">
        {/* Top */}
        <div className="footer-top flex items-center justify-between flex-wrap gap-5 px-6 py-8 border-b border-white/10">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3 no-underline">
            <img
              src="/logo.png"
              alt="Namma Seniors"
              className="w-11 h-11 rounded-xl object-contain"
              onError={e => {
                e.target.style.display = 'none';
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
            <div
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-lg hidden"
            >
              🎓
            </div>
            <div>
              <strong className="block text-sm text-white font-bold">Namma Seniors</strong>
              <span className="block text-[11px] text-gray-400 mt-0.5">
                Built by NITK Students • For Students Across India
              </span>
            </div>
          </a>

          {/* Contact */}
          <div className="footer-contact flex items-center gap-4 flex-wrap">
            <div className="footer-contact-item flex items-center gap-2">
              <span className="footer-contact-icon w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-base">
                📞
              </span>
              <div>
                <div className="footer-contact-label text-[9px] text-gray-400 uppercase tracking-wider">
                  Customer Care
                </div>
                <a
                  href={`tel:+${CONFIG.WHATSAPP_SUPPORT}`}
                  className="footer-contact-value text-sm font-semibold text-white no-underline hover:text-indigo-300"
                >
                  +{CONFIG.WHATSAPP_SUPPORT.slice(2)}
                </a>
              </div>
            </div>
            <button
              onClick={() => {
                const msg = 'Hey! I have some feedback for Namma Seniors: ';
                window.open(
                  `https://wa.me/${CONFIG.WHATSAPP_SUPPORT}?text=${encodeURIComponent(msg)}`,
                  '_blank'
                );
              }}
              className="footer-feedback-btn px-4 py-2 rounded-xl border border-white/15 bg-indigo-600/20 text-indigo-200 text-xs font-bold whitespace-nowrap hover:bg-indigo-600/30 transition"
            >
              💬 Give Feedback
            </button>
          </div>
        </div>

        {/* Bottom */}
        <div className="footer-bottom flex items-center justify-between flex-wrap gap-3 px-6 py-4">
          <p className="footer-copy text-[11px] text-gray-400">
            © 2026 Namma Seniors. Made with ❤️ in Surathkal.
          </p>
          <div className="footer-links flex gap-4">
            <a
              href="#"
              onClick={e => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="footer-link text-[11px] text-gray-400 no-underline font-medium hover:text-white"
            >
              Back to Top ↑
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}