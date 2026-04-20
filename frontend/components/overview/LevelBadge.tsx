"use client";

import { motion } from "framer-motion";

const imgMedal = "https://raw.githubusercontent.com/Shubham-S-Tiwari/Sharkfunded-Assets/main/medal_bronze.png";

export default function LevelBadge() {
    return (
        <div className="bg-[#06000a] border-[0.5px] border-[#e5e5e580] rounded-3xl overflow-hidden relative flex items-center justify-between p-4 min-h-[140px] group">
            {/* Background Decorative Glows */}
            <div className="absolute top-[-100px] left-[50px] w-[150px] h-[150px] bg-[#eab55308] rounded-full blur-[80px] pointer-events-none" />
            
            {/* Left Content Column */}
            <div className="relative z-10 flex flex-col gap-3 items-start w-[240px]">
                {/* Header: Next Tier & Tier Name */}
                <div className="flex gap-4 items-end w-full">
                    <div className="flex flex-col gap-1">
                        <div className="bg-[#e2a546] px-1.5 py-0.5 rounded-[4px] shadow-[0px_0px_5px_#e9b452] w-fit">
                            <span className="text-[#1a1a1a] text-[9px] font-bold uppercase whitespace-nowrap">Current Tier</span>
                        </div>
                        <h2 className="text-[28px] font-extrabold tracking-[-0.8px] bg-clip-text text-transparent bg-gradient-to-br from-[#eab553] to-[#cd7a22] leading-none mt-1">
                            Bronze
                        </h2>
                    </div>
                    <div className="flex items-center gap-1 pb-1">
                        <span className="text-[#e5e5e5] text-[11px] font-bold">75%</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="relative w-full h-[4px] bg-[#1a1a1a] rounded-[15px] overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "75%" }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-[#4e2671] to-[#a044f2] relative rounded-full"
                    />
                </div>

                {/* Stats Row */}
                <div className="flex gap-[12px] items-center w-full">
                    {/* Total Reward */}
                    <div className="flex flex-col gap-[2px] whitespace-nowrap">
                        <span className="text-[#808080] text-[9px] font-medium tracking-tight uppercase">Total Reward</span>
                        <span className="text-[#e5e5e5] text-[13px] font-bold tracking-tight">$320.00</span>
                    </div>

                    <div className="h-[18px] w-[1px] bg-[#e5e5e533] rotate-12" />

                    {/* Highest Reward */}
                    <div className="flex flex-col gap-[2px] whitespace-nowrap">
                        <span className="text-[#808080] text-[9px] font-medium tracking-tight uppercase">Highest PnL</span>
                        <span className="text-[#e5e5e5] text-[13px] font-bold tracking-tight">$180.00</span>
                    </div>

                    <div className="h-[18px] w-[1px] bg-[#e5e5e533] rotate-12" />

                    {/* Count */}
                    <div className="flex flex-col gap-[2px] whitespace-nowrap">
                        <span className="text-[#808080] text-[9px] font-medium tracking-tight uppercase">Count</span>
                        <span className="text-[#e5e5e5] text-[13px] font-bold tracking-tight">24</span>
                    </div>
                </div>
            </div>

            {/* Right Side: Medal Graphic Placeholder */}
            <div className="relative z-10 w-[80px] h-[80px] flex items-center justify-center">
                {/* Image asset with glow */}
                <motion.div
                    animate={{ y: [-3, 3, -3] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="relative w-full h-full"
                >
                    <img 
                        src={imgMedal} 
                        alt="3D Bronze Medal" 
                        className="w-full h-full object-contain relative z-10 drop-shadow-[0_10px_30px_rgba(234,181,83,0.3)]"
                    />
                    {/* Secondary glow behind medal */}
                    <div className="absolute inset-0 bg-amber-500/10 rounded-full blur-[40px] scale-75 z-0" />
                </motion.div>
            </div>
        </div>
    );
}
