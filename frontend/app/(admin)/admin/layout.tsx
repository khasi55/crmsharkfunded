import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// This is a server component by default
export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const cookieStore = await cookies();
    const adminSession = cookieStore.get("admin_session");

    if (!adminSession) {
        redirect("/admin-login");
    }

    return (
        <div className="flex h-screen w-full bg-white">
            <AdminSidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <AdminHeader />
                <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
