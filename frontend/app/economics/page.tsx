"use client";

import { useEffect, useRef } from 'react';
import { Globe } from "lucide-react";

export default function EconomicsPage() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Prevent duplicate scripts
        if (containerRef.current.querySelector('script')) return;

        const script = document.createElement('script');
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
        script.type = 'text/javascript';
        script.async = true;
        // The page version can have a slightly larger height
        script.innerHTML = JSON.stringify({
            "colorTheme": "dark",
            "isTransparent": true,
            "locale": "en",
            "countryFilter": "ar,au,br,ca,cn,fr,de,in,id,it,jp,kr,mx,ru,sa,za,tr,gb,us,eu",
            "importanceFilter": "-1,0,1",
            "width": "100%",
            "height": "100%"
        });

        containerRef.current.appendChild(script);
    }, []);

    return (
        <div className="min-h-screen bg-transparent text-slate-900 p-6 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8 flex flex-col h-[calc(100vh-100px)]">

                {/* HEADLINE */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-6 border-b border-white/5 shrink-0">
                    <div>
                        <h1 className="text-3xl font-black text-black flex items-center gap-3 tracking-tight mb-2">
                            <Globe className="text-blue-600 drop-shadow-[0_0_15px_rgba(37,99,235,0.2)]" size={32} />
                            Economic Calendar
                        </h1>
                        <p className="text-slate-500 font-medium">Track global market-moving events in real-time.</p>
                    </div>
                </div>

                {/* WIDGET CONTAINER */}
                <div className="flex-1 bg-[#0a0f1c] rounded-2xl overflow-hidden shadow-2xl border border-white/5 relative min-h-[600px]">
                    <div className="tradingview-widget-container w-full h-full" ref={containerRef}>
                        <div className="tradingview-widget-container__widget w-full h-full"></div>
                        <div className="tradingview-widget-copyright text-xs text-slate-500 mt-2 absolute bottom-2 left-2 hidden">
                            <a href="https://www.tradingview.com/economic-calendar/" rel="noopener nofollow" target="_blank">
                                <span className="blue-text">Economic Calendar</span>
                            </a>
                            <span className="trademark"> by TradingView</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
