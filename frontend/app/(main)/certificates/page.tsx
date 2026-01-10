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

    // 3. Fetch processed payouts
    const { data: payouts } = await supabase
        .from("payout_requests")
        .select("*")
        .eq("status", "processed")
        .order("processed_at", { ascending: false });

    return (
        <div className="space-y-12 max-w-6xl mx-auto p-6 min-h-screen font-sans">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-gray-200 pb-8">
                <div>
                    <h1 className="text-4xl font-black text-black flex items-center gap-3 tracking-tight mb-2">
                        <Award className="text-[#00E5FF] drop-shadow-[0_0_15px_rgba(0,229,255,0.5)]" size={36} />
                        Certificates
                    </h1>
                    <p className="text-black font-medium">Your official proof of payouts and trading achievements.</p>
                </div>
            </div>

            {/* Interactive Grid with Popups */}
            <CertificatesGrid
                payouts={payouts || []}
                profile={profile}
            />
        </div>
    );
}
