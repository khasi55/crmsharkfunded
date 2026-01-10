import Link from "next/link";
import CouponsClient from "./CouponsClient";

export default function CouponsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Coupons</h1>
                    <p className="text-sm text-gray-600 mt-1">Manage discount coupons and promotions</p>
                </div>
            </div>

            <CouponsClient />
        </div>
    );
}
