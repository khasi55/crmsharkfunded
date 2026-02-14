"use client";

import React from 'react';

const PromoBanner = () => {
  return (
    <div className="relative w-full bg-red-600 overflow-hidden h-9 flex items-center border-b border-red-500/30">
      <div className="flex whitespace-nowrap animate-marquee">
        {/* Repeat the message to ensure continuous flow */}
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex items-center mx-8">
            <span className="text-white text-xs font-bold uppercase tracking-wider">
              🔥 Limited Time Offer: USE "SINGLE" FOR BOGO<span className="bg-white/20 px-2 py-0.5 rounded text-white ml-1 border border-white/30">SINGLE</span>
            </span>
            <span className="mx-8 text-red-300/50">•</span>
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
