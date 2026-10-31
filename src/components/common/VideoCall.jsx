import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

function loadDailyScript() {
    return new Promise((resolve, reject) => {
        if (window.DailyIframe) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/@daily-co/daily-js/dist/daily-iframe.js';
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

export default function VideoCall({ bookingId, displayName, onClose }) {
    const containerRef = useRef(null);
    const callFrameRef = useRef(null);
    const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        let cancelled = false;

        async function startCall() {
            try {
                setStatus('loading');

                // Ask our Edge Function for (or to create) the Daily room tied
                // to this booking. The Daily API key stays server-side inside
                // the Edge Function and never reaches the browser.
                const { data, error } = await supabase.functions.invoke('create-video-room', {
                    body: { booking_id: bookingId }
                });

                if (error || !data?.room_url) {
                    throw new Error(data?.error || error?.message || 'Could not start the video room.');
                }

                await loadDailyScript();
                if (cancelled || !containerRef.current) return;

                callFrameRef.current = window.DailyIframe.createFrame(containerRef.current, {
                    url: data.room_url,
                    showLeaveButton: true,
                    iframeStyle: {
                        width: '100%',
                        height: '100%',
                        border: '0'
                    }
                });

                callFrameRef.current.setUserName(displayName || 'Namma Seniors User');
                await callFrameRef.current.join();

                callFrameRef.current.on('left-meeting', () => {
                    if (onClose) onClose();
                });

                if (!cancelled) setStatus('ready');
            } catch (e) {
                console.error('[VideoCall]', e);
                if (!cancelled) {
                    setErrorMsg(e.message || 'Something went wrong starting the call.');
                    setStatus('error');
                }
            }
        }

        startCall();

        return () => {
            cancelled = true;
            if (callFrameRef.current) {
                callFrameRef.current.destroy();
                callFrameRef.current = null;
            }
        };
    }, [bookingId, displayName]);

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
                <span className="text-sm font-bold">📹 Live Session — Namma Seniors</span>
                <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white text-sm font-bold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition"
                >
                    ✕ End Call
                </button>
            </div>

            <div className="flex-1 w-full relative">
                {status === 'loading' && (
                    <div className="absolute inset-0 flex items-center justify-center text-white text-sm">
                        Connecting to your session…
                    </div>
                )}
                {status === 'error' && (
                    <div className="absolute inset-0 flex items-center justify-center text-center px-6">
                        <div>
                            <div className="text-3xl mb-3">⚠️</div>
                            <p className="text-sm text-red-400">{errorMsg}</p>
                        </div>
                    </div>
                )}
                <div ref={containerRef} className="w-full h-full" />
            </div>
        </div>
    );
}