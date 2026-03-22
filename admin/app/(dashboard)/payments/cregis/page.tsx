"use client";

import { CregisCheckClient } from "@/components/admin/payments/CregisCheckClient";
import { CreditCard } from "lucide-react";

export default function CregisCheckPage() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 text-blue-500 mb-1">
                        <CreditCard className="h-4 w-4" />
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Cregis Gateway</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Order Status Check</h1>
                    <p className="text-sm text-gray-500 mt-1">Directly query the Cregis API for real-time order information</p>
                </div>
            </div>

            <CregisCheckClient />
        </div>
    );
}
