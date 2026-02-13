import { getAdminUser } from "@/utils/get-admin-user";
import { redirect } from "next/navigation";
import AdminsClientPage from "./admins-client";

export const dynamic = 'force-dynamic';

export default async function AdminsPage() {
    const user = await getAdminUser();

    if (!user) {
        redirect("/admin/login");
    }

    if (user.role !== 'super_admin') {
        redirect("/admin/dashboard");
    }

    return <AdminsClientPage />;
}
