import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export default function CounsellingModal({ onClose, onSelectPdf }) {
    const [pdfs, setPdfs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;

        async function loadPdfs() {
            setLoading(true);
            setError(null);
            const { data, error } = await supabase
                .from('pdfs')
                .select('id, title, slug, price')
                .order('title', { ascending: true });

            if (cancelled) return;

            if (error) {
                setError('Could not load guides right now. Please try again.');
            } else {
                setPdfs(data || []);
            }
            setLoading(false);
        }

        loadPdfs();
        return () => { cancelled = true; };
    }, []);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl leading-none"
                    aria-label="Close"
                >
                    ✕
                </button>

                <h2 className="text-lg font-bold text-gray-900 mb-1">🔒 Priority Order Guides</h2>
                <p className="text-sm text-gray-500 mb-5">Pick a guide to unlock — ₹49 each.</p>

                {loading && (
                    <div className="text-sm text-gray-500 py-6 text-center">Loading guides…</div>
                )}

                {!loading && error && (
                    <div className="text-sm text-red-500 py-6 text-center">{error}</div>
                )}

                {!loading && !error && pdfs.length === 0 && (
                    <div className="text-sm text-gray-500 py-6 text-center">No guides available right now.</div>
                )}

                {!loading && !error && pdfs.length > 0 && (
                    <div className="flex flex-col gap-3">
                        {pdfs.map((pdf) => (
                            <button
                                key={pdf.id}
                                onClick={() => onSelectPdf(pdf.slug)}
                                className="w-full inline-flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 text-sm font-bold hover:bg-indigo-100 transition text-left"
                            >
                                <span>🔒 {pdf.title}</span>
                                <span className="whitespace-nowrap">₹{pdf.price}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}