"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
    targetDate: string;
    onFinish?: () => void;
    className?: string;
}

export default function CountdownTimer({ targetDate, onFinish, className = "" }: CountdownTimerProps) {
    const [timeLeft, setTimeLeft] = useState("Calculating...");

    useEffect(() => {
        if (!targetDate) return;

        const interval = setInterval(() => {
            const now = Date.now();
            const target = new Date(targetDate).getTime();
            
            if (isNaN(target)) {
                setTimeLeft("Invalid Date");
                clearInterval(interval);
                return;
            }

            const diff = target - now;

            if (diff <= 0) {
                setTimeLeft("READY");
                clearInterval(interval);
                onFinish?.();
                return;
            }

            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);

            // Return formatted string
            const hDisplay = h > 0 ? `${h}h ` : "";
            const mDisplay = m > 0 ? `${m}m ` : "";
            const sDisplay = `${s}s`;

            setTimeLeft(`${hDisplay}${mDisplay}${sDisplay}`);
        }, 1000);

        return () => clearInterval(interval);
    }, [targetDate, onFinish]);

    return <span className={className}>{timeLeft}</span>;
}
