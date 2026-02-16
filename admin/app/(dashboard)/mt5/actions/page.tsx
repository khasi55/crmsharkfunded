import { getAdminUser } from "@/utils/get-admin-user";
import { redirect } from "next/navigation";
import MT5ActionsClient from "./ActionsClient";

export const dynamic = 'force-dynamic';

const ALLOWED_ROLES = ['super_admin', 'sub_admin', 'risk_admin'];

export default async function MT5ActionsPage() {
    const user = await getAdminUser();

    if (!user) {
        redirect("/login");
    }

    if (!ALLOWED_ROLES.includes(user.role)) {
        redirect("/dashboard");
    }

    return <MT5ActionsClient />;
}
