import { useEffect, useState, useRef } from 'react';
import { supabase, sbUpload } from '../../lib/supabase';

async function stampWatermark(signedUrl, watermarkText) {
    const existingPdfBytes = await fetch(signedUrl).then(res => res.arrayBuffer());
    const { PDFDocument, rgb, degrees } = window.PDFLib;
    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();

    pages.forEach(page => {
        const { width, height } = page.getSize();
        for (let i = 1; i <= 4; i++) {
            page.drawText(watermarkText, {
                x: width / 2 - 160,
                y: (height / 5) * i,
                size: 11,
                color: rgb(0.55, 0.55, 0.55),
                rotate: degrees(-30),
                opacity: 0.35
            });
        }
    });

    const stampedBytes = await pdfDoc.save();
    const blob = new Blob([stampedBytes], { type: 'application/pdf' });
    return URL.createObjectURL(blob);
}

async function renderPdfToCanvases(blobUrl, container) {
    container.innerHTML = '';
    const loadingTask = window.pdfjsLib.getDocument(blobUrl);
    const pdf = await loadingTask.promise;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = '100%';
        canvas.style.height = 'auto';
        canvas.style.display = 'block';
        canvas.style.marginBottom = '12px';
        canvas.style.border = '1px solid #e5e7eb';
        canvas.style.borderRadius = '8px';
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        container.appendChild(canvas);
    }
}

export default function PriorityOrderModal({ pdfSlug, studentSession, onClose, showToast }) {
    const [stage, setStage] = useState('checking'); // 'checking' | 'form' | 'submitting' | 'submitted' | 'viewer' | 'error'
    const [pdfInfo, setPdfInfo] = useState(null); // { id, title, price }
    const [signedUrl, setSignedUrl] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [proofFile, setProofFile] = useState(null);
    const [proofFileName, setProofFileName] = useState('');
    const [uploading, setUploading] = useState(false);
    const iframeWrapRef = useRef(null);
    const canvasContainerRef = useRef(null);

    const [studentName, setStudentName] = useState((studentSession?.email || '').split('@')[0] || '');
    const [studentPhone, setStudentPhone] = useState(studentSession?.phone || '');
    const studentEmail = studentSession?.email || '';

    useEffect(() => {
        async function checkExistingAccess() {
            try {
                const { data, error } = await supabase.functions.invoke('check-pdf-access', {
                    body: { pdf_slug: pdfSlug, student_email: studentEmail }
                });

                if (!error && data?.purchased && data?.signed_url) {
                    const watermarkText = `${studentName} · ${studentEmail} · ${studentPhone}`;
                    const stampedUrl = await stampWatermark(data.signed_url, watermarkText);
                    setSignedUrl(stampedUrl);
                    setPdfInfo(prev => ({ ...prev, title: data.pdf_title || '' }));
                    setStage('viewer');
                    return;
                }
            } catch (e) {
                console.error('[PriorityOrderModal] checkExistingAccess', e);
            }

            const { data: pdf, error: pdfError } = await supabase
                .from('pdfs')
                .select('id, title, price')
                .eq('slug', pdfSlug)
                .single();

            if (pdfError || !pdf) {
                setErrorMsg('Could not load this guide. Please try again later.');
                setStage('error');
                return;
            }

            setPdfInfo(pdf);
            setStage('form');
        }
        checkExistingAccess();
    }, [pdfSlug, studentEmail]);

    useEffect(() => {
        if (stage === 'viewer' && signedUrl && canvasContainerRef.current) {
            renderPdfToCanvases(signedUrl, canvasContainerRef.current);
        }
    }, [stage, signedUrl]);

    function handleFileChange(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            if (showToast) showToast('⚠️ Max 10MB.');
            e.target.value = '';
            return;
        }
        setProofFile(file);
        setProofFileName(file.name);
    }

    async function handleSubmit() {
        if (!proofFile) {
            if (showToast) showToast('⚠️ Please upload your payment screenshot first.');
            return;
        }
        if (!studentName.trim() || !studentPhone.trim()) {
            if (showToast) showToast('⚠️ Please fill in your name and WhatsApp number.');
            return;
        }

        setUploading(true);
        setStage('submitting');

        try {
            const safePhone = studentPhone.replace(/\D/g, '');
            const ext = proofFile.name.split('.').pop().toLowerCase() || 'jpg';
            const proofUrl = await sbUpload(
                'booking-proofs',
                `pdf-proofs/${safePhone}_${pdfSlug}_${Date.now()}.${ext}`,
                proofFile
            );

            const { error: insertError } = await supabase.from('pdf_purchases').insert({
                pdf_id: pdfInfo.id,
                student_name: studentName.trim(),
                student_email: studentEmail,
                student_phone: safePhone,
                amount: pdfInfo.price,
                status: 'pending',
                payment_proof_url: proofUrl
            });

            if (insertError) throw insertError;

            setStage('submitted');
            if (showToast) showToast('✅ Screenshot submitted! We\'ll verify and send your guide via WhatsApp shortly.');
        } catch (e) {
            console.error('[PriorityOrderModal] handleSubmit', e);
            setErrorMsg(e.message || 'Something went wrong submitting your payment. Please try again.');
            setStage('error');
        } finally {
            setUploading(false);
        }
    }

    useEffect(() => {
        function blockContextMenu(e) {
            e.preventDefault();
        }
        const node = iframeWrapRef.current;
        if (node) node.addEventListener('contextmenu', blockContextMenu);
        return () => {
            if (node) node.removeEventListener('contextmenu', blockContextMenu);
        };
    }, [stage]);

    useEffect(() => {
        const scrollY = window.scrollY;
        const originalStyle = {
            position: document.body.style.position,
            top: document.body.style.top,
            width: document.body.style.width,
            overflow: document.body.style.overflow
        };

        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.position = originalStyle.position;
            document.body.style.top = originalStyle.top;
            document.body.style.width = originalStyle.width;
            document.body.style.overflow = originalStyle.overflow;
            window.scrollTo(0, scrollY);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/60 backdrop-blur-sm px-4 pt-20 pb-12 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col relative overflow-hidden">
                <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                    <h2 className="text-base font-bold text-gray-900">
                        {stage === 'viewer' ? '🔓' : '🔒'} {pdfInfo?.title || 'Priority Order Guide'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-700 text-xl leading-none"
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <div className={`flex-1 p-6 ${stage === 'viewer' ? 'overflow-hidden' : 'overflow-auto'}`}>
                    {stage === 'checking' && (
                        <div className="text-center py-16">
                            <div className="text-sm text-gray-500">Checking your access…</div>
                        </div>
                    )}

                    {stage === 'form' && (
                        <div>
                            <div className="text-center p-4 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 mb-4">
                                <div className="flex justify-center mb-2">
                                    <img
                                        src={pdfInfo?.price === 159 ? '/qr-pdf-159.png' : '/qr-pdf-49.png'}
                                        alt="UPI QR"
                                        width="220"
                                        height="220"
                                        className="w-56 h-56 rounded-lg object-contain"
                                        onError={e => (e.target.style.display = 'none')}
                                    />
                                </div>
                                <div className="text-sm font-bold my-0.5">
                                    Amount: ₹{pdfInfo?.price ?? 49}
                                </div>
                                <div className="text-gray-500 text-[11px]">Scan with any UPI app to pay</div>
                            </div>

                            <div className="mb-3">
                                <label className="block mb-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    Your Name
                                </label>
                                <input
                                    type="text"
                                    value={studentName}
                                    onChange={e => setStudentName(e.target.value)}
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-600"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block mb-1 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    WhatsApp Number
                                </label>
                                <input
                                    type="tel"
                                    value={studentPhone}
                                    onChange={e => setStudentPhone(e.target.value)}
                                    placeholder="10-digit number"
                                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-600"
                                />
                            </div>

                            <div className="mb-4">
                                <label className="block mb-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                                    Upload Payment Screenshot <span className="text-red-500">*</span>
                                </label>
                                <label
                                    htmlFor="pdfProofFile"
                                    className={`w-full px-3 py-3 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer transition ${proofFileName
                                        ? 'border-green-300 bg-green-50 text-green-700'
                                        : 'border-gray-300 bg-white hover:border-indigo-400 text-gray-500'
                                        }`}
                                >
                                    <span className="text-sm">📎</span>
                                    <span>{proofFileName || 'Click to upload screenshot (JPG/PNG)'}</span>
                                </label>
                                <input
                                    type="file"
                                    id="pdfProofFile"
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </div>

                            <button
                                onClick={handleSubmit}
                                disabled={uploading}
                                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 transition"
                            >
                                {uploading ? 'Submitting…' : 'Submit Payment Proof'}
                            </button>
                        </div>
                    )}

                    {stage === 'submitting' && (
                        <div className="text-center py-16">
                            <div className="text-sm text-gray-500">Submitting… please don't close this window.</div>
                        </div>
                    )}

                    {stage === 'submitted' && (
                        <div className="text-center py-10">
                            <div className="text-4xl mb-3">✅</div>
                            <p className="text-sm font-bold text-gray-900 mb-1">Payment proof submitted!</p>
                            <p className="text-xs text-gray-500 mb-6">
                                We'll verify your payment and send the guide to your WhatsApp shortly.
                            </p>
                            <button
                                onClick={onClose}
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition"
                            >
                                Close
                            </button>
                        </div>
                    )}

                    {stage === 'error' && (
                        <div className="text-center py-10">
                            <div className="text-3xl mb-3">⚠️</div>
                            <p className="text-sm text-red-600 mb-6">{errorMsg}</p>
                            <button
                                onClick={() => setStage('form')}
                                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {stage === 'viewer' && signedUrl && (
                        <div
                            ref={iframeWrapRef}
                            className="relative w-full overflow-y-auto"
                            style={{ maxHeight: 'calc(100vh - 220px)', userSelect: 'none' }}
                        >
                            <div ref={canvasContainerRef} className="w-full flex flex-col items-center" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}