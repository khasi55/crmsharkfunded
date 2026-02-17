import { getAdminUser } from "@/utils/get-admin-user";
import { redirect } from "next/navigation";
import AffiliateSalesClient from "./sales-client";

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['super_admin', 'payouts_admin', 'sub_admin'];

export default async function SalesPage() {
    const user = await getAdminUser();

    if (!user) {
        redirect("/login");
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
        redirect("/dashboard");
    }

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Affiliate Sales</h1>
                    <p className="text-sm text-gray-500 mt-1">View all sales generated through affiliate coupons and referrals</p>
                </div>
            </div>

            <AffiliateSalesClient />
        </div>
    );
}
