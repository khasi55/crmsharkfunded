"use client";

import { useEffect, useRef, memo } from 'react';
import { CalendarDays } from "lucide-react";

function EconomicCalendarWidget() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Prevent duplicate scripts
        if (containerRef.current.querySelector('script')) return;

        const script = document.createElement('script');
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-events.js";
        script.type = 'text/javascript';
        script.async = true;
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
        <div className="w-full flex flex-col h-[500px]">
            <div className="flex items-center justify-between mb-4 px-1 shrink-0">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <CalendarDays className="text-blue-500" size={18} />
                    Economic Calendar
                </h2>
            </div>

            <div className="flex-1 bg-[#050923] border border-white/10 rounded-xl overflow-hidden relative">
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
    );
}

export default memo(EconomicCalendarWidget);
