import { SecuritySettingsClient } from "./SecuritySettingsClient";
import { getAdminUser } from "@/utils/get-admin-user";
import { createAdminClient } from "@/utils/supabase/admin";
import { redirect } from "next/navigation";

export default async function SecuritySettingsPage() {
    const user = await getAdminUser();

    if (!user) {
        redirect('/login');
    }

    const supabase = createAdminClient();
    const { data } = await supabase
        .from("admin_users")
        .select("is_two_factor_enabled, is_webauthn_enabled")
        .eq("id", user.id)
        .single();

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-500">Manage your account security and authentication methods.</p>
            </div>
            <SecuritySettingsClient
                initial2FAEnabled={!!data?.is_two_factor_enabled}
                initialWebAuthnEnabled={!!data?.is_webauthn_enabled}
            />
        </div>
    );
}
