import { createClient } from "@/utils/supabase/server";
import { Award } from "lucide-react";
import CertificatesGrid from "@/components/certificates/CertificatesGrid";

export default async function CertificatesPage() {
    const supabase = await createClient();

    // 1. Get Current User
    const { data: { user } } = await supabase.auth.getUser();

    // 2. Fetch User Profile (for display name)
    let profile = null;
    if (user) {
        const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
        profile = profileData;
    }

    // 3. Fetch approved or processed payouts
    const { data: payouts } = await supabase
        .from("payout_requests")
        .select("*")
        .in("status", ["approved", "processed"])
        .order("created_at", { ascending: false });

    return (
        <div className="space-y-12 max-w-6xl mx-auto p-6 min-h-screen font-sans">

            {/* Header Removed - managed by CertificatesGrid */}

            {/* Interactive Grid with Popups */}
            <CertificatesGrid
                payouts={payouts || []}
                profile={profile}
            />
        </div>
    );
}
