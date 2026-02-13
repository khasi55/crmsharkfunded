import { getAdminUser } from "@/utils/get-admin-user";
import { redirect } from "next/navigation";
import AdminPayoutsClient from "./payouts-client";

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['super_admin', 'sub_admin', 'payouts_admin'];

export default async function PayoutsPage() {
    const user = await getAdminUser();

    if (!user) {
        redirect("/admin/login");
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
        redirect("/admin/dashboard");
    }

    return <AdminPayoutsClient />;
}
