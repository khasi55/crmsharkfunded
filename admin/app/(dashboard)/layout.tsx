import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAdminUser } from "@/utils/get-admin-user";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";

// This is a server component by default
export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getAdminUser();

    if (!user) {
        redirect("/login");
    }

    return <AdminLayoutClient user={user}>{children}</AdminLayoutClient>;
}
