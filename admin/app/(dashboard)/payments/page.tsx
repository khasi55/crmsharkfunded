"use server";

import { PaymentReportsClient } from "@/components/payments/PaymentReportsClient";

export default async function PaymentReportsPage() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Payment Reports</h1>
                    <p className="text-sm text-gray-500 mt-1">View all payment transactions and their details</p>
                </div>
            </div>

            <PaymentReportsClient />
        </div>
    );
}
