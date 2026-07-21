import { supabase } from '../../lib/supabase';

export default function PdfPurchasesPanel({ purchases, onRefresh }) {
    const statusStyles = {
        completed: 'bg-green-100 text-green-800',
        pending: 'bg-yellow-100 text-yellow-800',
        failed: 'bg-red-100 text-red-800'
    };

    async function markVerified(id) {
        const { error } = await supabase.from('pdf_purchases').update({ status: 'completed' }).eq('id', id);
        if (!error) onRefresh();
    }

    return (
        <div className="pdf-purchases-panel bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mt-5">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900">📄 PDF Purchases</h3>
                <button
                    onClick={onRefresh}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                >
                    🔄 Refresh
                </button>
            </div>

            {purchases.length === 0 ? (
                <div className="text-sm text-gray-500 text-center py-10">No purchases yet.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="text-gray-400 text-xs uppercase tracking-wide border-b border-gray-100">
                                <th className="py-2 pr-4">Guide</th>
                                <th className="py-2 pr-4">Email</th>
                                <th className="py-2 pr-4">Phone</th>
                                <th className="py-2 pr-4">Amount</th>
                                <th className="py-2 pr-4">Proof</th>
                                <th className="py-2 pr-4">Status</th>
                                <th className="py-2 pr-4">Purchased</th>
                            </tr>
                        </thead>
                        <tbody>
                            {purchases.map(p => (
                                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                                    <td className="py-3 pr-4 font-semibold text-gray-800">
                                        {p.pdfs?.title || p.pdf_id}
                                    </td>
                                    <td className="py-3 pr-4">{p.student_email || '—'}</td>
                                    <td className="py-3 pr-4">
                                        <div className="flex items-center gap-2">
                                            <span>{p.student_phone || '—'}</span>
                                            {p.student_phone && (
                                                <a
                                                    href={`https://wa.me/91${p.student_phone}?text=${encodeURIComponent(`Hi ${p.student_name || 'there'}, thank you for buying the "${p.pdfs?.title || 'guide'}" from Namma Seniors! 🎓📚 I'll be sharing your PDF with you shortly. Thank you for your patience!`)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="Message on WhatsApp"
                                                    className="text-green-600 hover:text-green-800 transition"
                                                >
                                                    💬
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 pr-4">₹{p.amount ?? p.pdfs?.price ?? '—'}</td>
                                    <td className="py-3 pr-4">
                                        {p.payment_proof_url ? (
                                            <a
                                                href={p.payment_proof_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs underline"
                                            >
                                                View
                                            </a>
                                        ) : '—'}
                                    </td>
                                    <td className="py-3 pr-4">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-black ${statusStyles[p.status] || 'bg-gray-100 text-gray-600'
                                                    }`}
                                            >
                                                {p.status || 'unknown'}
                                            </span>
                                            {p.status === 'pending' && (
                                                <button
                                                    onClick={() => markVerified(p.id)}
                                                    className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5 hover:bg-green-100 transition"
                                                >
                                                    ✅ Verify
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="py-3 pr-4 text-gray-500">
                                        {p.created_at ? new Date(p.created_at).toLocaleString() : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}