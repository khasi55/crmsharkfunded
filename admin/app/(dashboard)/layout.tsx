import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getAdminUser } from "@/utils/get-admin-user";

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

    return (
        <div className="flex h-screen w-full bg-white">
            <AdminSidebar user={user} />
            <div className="flex flex-1 flex-col overflow-hidden">
                <AdminHeader />
                <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
