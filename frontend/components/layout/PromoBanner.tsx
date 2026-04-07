"use client";

import React from 'react';
import { Zap } from 'lucide-react';

const PromoBanner = () => {
  return (
    <div className="relative w-full bg-blue-600 overflow-hidden h-9 flex items-center border-b border-blue-500/30">
      <div className="flex whitespace-nowrap animate-marquee">
        {/* Repeat the message to ensure continuous flow */}
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex items-center mx-8 shrink-0">
            <span className="text-white text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-blue-100">
                 <Zap className="w-3 h-3 fill-blue-100" /> SHARKFUNDED BOLT IS NOW LIVE - DIRECT FUNDED!
              </span>
              <span className="text-blue-400">|</span>
              <span className="flex items-center gap-2">
                🔥 USE <span className="bg-white/20 px-2 py-0.5 rounded text-white border border-white/30 font-mono tracking-tighter mx-1">SHARK30</span> FOR 30% OFF ALL CHALLENGES
              </span>
            </span>
          </div>
        ))}
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          display: flex;
          width: fit-content;
          animation: marquee 70s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default PromoBanner;
