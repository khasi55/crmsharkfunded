"use client";

import React from 'react';

const PromoBanner = () => {
  return (
    <div className="relative w-full bg-blue-600 overflow-hidden h-9 flex items-center border-b border-blue-500/30">
      <div className="flex whitespace-nowrap animate-marquee">
        {/* Repeat the message to ensure continuous flow */}
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex items-center mx-8">
            <span className="text-white text-xs font-bold uppercase tracking-wider">
              🔥 Limited Time Offer: USE "RAMADAN" FOR 50% OFF<span className="bg-white/20 px-2 py-0.5 rounded text-white ml-1 border border-white/30">RAMADAN</span>
            </span>
            <span className="mx-8 text-blue-300/50">•</span>
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
