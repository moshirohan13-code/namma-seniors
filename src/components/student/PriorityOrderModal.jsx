import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';

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
    const [stage, setStage] = useState('checking'); // 'checking' | 'form' | 'paying' | 'viewer' | 'error'
    const [pdfInfo, setPdfInfo] = useState(null);
    const [signedUrl, setSignedUrl] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [paying, setPaying] = useState(false);
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

    async function handlePay() {
        if (!studentName.trim() || !studentPhone.trim()) {
            if (showToast) showToast('⚠️ Please fill in your name and WhatsApp number.');
            return;
        }
        if (!window.Razorpay) {
            if (showToast) showToast('⚠️ Payment system still loading, please try again in a moment.');
            return;
        }

        setPaying(true);
        setStage('paying');

        try {
            const { data: orderData, error: orderError } = await supabase.functions.invoke('create-pdf-order', {
                body: { pdf_slug: pdfSlug }
            });

            if (orderError || !orderData?.order_id) {
                throw new Error(orderData?.error || orderError?.message || 'Could not start payment.');
            }

            const rzp = new window.Razorpay({
                key: orderData.key_id,
                amount: orderData.amount,
                currency: 'INR',
                name: 'Namma Seniors',
                description: orderData.pdf_title || pdfInfo?.title || 'Priority Order Guide',
                order_id: orderData.order_id,
                prefill: {
                    name: studentName,
                    email: studentEmail,
                    contact: studentPhone
                },
                theme: { color: '#4f46e5' },
                handler: async function (response) {
                    try {
                        const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-pdf-payment', {
                            body: {
                                pdf_slug: pdfSlug,
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                student_name: studentName.trim(),
                                student_email: studentEmail,
                                student_phone: studentPhone.replace(/\D/g, '')
                            }
                        });
                        console.log('[PriorityOrderModal] verifyData:', verifyData);
                        console.log('[PriorityOrderModal] verifyError:', verifyError);

                        if (verifyError || !verifyData?.signed_url) {
                            throw new Error(verifyData?.error || verifyError?.message || 'Payment verification failed.');
                        }

                        const watermarkText = `${studentName} · ${studentEmail} · ${studentPhone}`;
                        const stampedUrl = await stampWatermark(verifyData.signed_url, watermarkText);
                        setSignedUrl(stampedUrl);
                        setPdfInfo(prev => ({ ...prev, title: verifyData.pdf_title || prev?.title }));
                        setStage('viewer');
                        if (showToast) showToast('✅ Payment verified! Enjoy your guide.');
                    } catch (e) {
                        console.error('[PriorityOrderModal] verify', e);
                        setErrorMsg(e.message || 'Payment succeeded but verification failed. Contact support.');
                        setStage('error');
                    } finally {
                        setPaying(false);
                    }
                },
                modal: {
                    ondismiss: function () {
                        setPaying(false);
                        setStage('form');
                    }
                }
            });

            rzp.on('payment.failed', function () {
                setPaying(false);
                setErrorMsg('Payment failed or was cancelled. Please try again.');
                setStage('error');
            });

            rzp.open();
        } catch (e) {
            console.error('[PriorityOrderModal] handlePay', e);
            setErrorMsg(e.message || 'Something went wrong starting payment.');
            setStage('error');
            setPaying(false);
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
                                <div className="text-sm font-bold my-0.5">
                                    Amount: ₹{pdfInfo?.price ?? 49}
                                </div>
                                <div className="text-gray-500 text-[11px]">Secure payment via Razorpay</div>
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

                            <button
                                onClick={handlePay}
                                disabled={paying}
                                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 transition"
                            >
                                {paying ? 'Please wait…' : `Pay ₹${pdfInfo?.price ?? 49} →`}
                            </button>
                        </div>
                    )}

                    {stage === 'paying' && (
                        <div className="text-center py-16">
                            <div className="text-sm text-gray-500">Opening payment window…</div>
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