import { cookies } from "next/headers";
import { createAdminClient } from "@/utils/supabase/admin";

export async function getAdminUser() {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get("admin_session")?.value;

    if (!sessionId) return null;

    const supabase = createAdminClient();

    const { data: user, error } = await supabase
        .from("admin_users")
        .select("id, email, full_name, role")
        .eq("id", sessionId)
        .single();

    if (error || !user) {
        return null;
    }

    return user;  
}
