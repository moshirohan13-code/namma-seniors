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
                .order('price', { ascending: false });

            if (cancelled) return;

            if (error) {
                setError('Could not load guides right now. Please try again.');
            } else {
                setPdfs(data || []);
            }

            setLoading(false);
        }

        loadPdfs();

        return () => {
            cancelled = true;
        };
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

                <h2 className="text-lg font-bold text-gray-900 mb-1">
                    🔒 Priority Order Guides
                </h2>

                <p className="text-sm text-gray-500 mb-5">
                    Pick a guide to unlock.
                </p>

                {loading && (
                    <div className="text-sm text-gray-500 py-6 text-center">
                        Loading guides…
                    </div>
                )}

                {!loading && error && (
                    <div className="text-sm text-red-500 py-6 text-center">
                        {error}
                    </div>
                )}

                {!loading && !error && pdfs.length === 0 && (
                    <div className="text-sm text-gray-500 py-6 text-center">
                        No guides available right now.
                    </div>
                )}

                {!loading && !error && pdfs.length > 0 && (
                    <div className="flex flex-col gap-3">

                        {pdfs.map((pdf) => (

                            <div
                                key={pdf.id}
                                className="w-full flex items-center gap-2"
                            >

                                <button
                                    onClick={() => onSelectPdf(pdf.slug)}
                                    className="flex-1 inline-flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-900 text-sm font-bold hover:bg-indigo-100 transition text-left"
                                >
                                    <span>🔒 {pdf.title}</span>

                                    <span className="whitespace-nowrap">
                                        ₹{pdf.price}
                                    </span>
                                </button>

                                {!pdf.title.includes("Cutoff Analysis") && (

                                    <a
                                        href="https://youtu.be/rpgYp1yEUec?si=lxGUcOFj3GDEVDRy"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        title="Watch preview video"
                                        className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 hover:bg-gray-50 transition"
                                    >

                                        <svg
                                            viewBox="0 0 24 24"
                                            className="w-5 h-5"
                                            fill="#FF0000"
                                        >
                                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                        </svg>

                                    </a>

                                )}

                            </div>

                        ))}

                    </div>
                )}

            </div>
        </div>
    );
}