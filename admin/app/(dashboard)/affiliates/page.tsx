import { getAdminUser } from "@/utils/get-admin-user";
import { redirect } from "next/navigation";
import AdminAffiliatesClient from "./affiliates-client";

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['super_admin', 'payouts_admin', 'sub_admin'];

export default async function AffiliatesPage() {
    const user = await getAdminUser();

    if (!user) {
        redirect("/admin/login");
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
        redirect("/admin/dashboard");
    }

    return <AdminAffiliatesClient />;
}
