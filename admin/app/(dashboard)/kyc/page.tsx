import { createAdminClient } from "@/utils/supabase/admin";
import { KYCTable } from "@/components/admin/kyc/KYCTable";

export default async function AdminKYCPage() {
    const supabase = createAdminClient();

    const { data: requests, error } = await supabase
        .from('kyc_sessions')
        .select(`
            *,
            profiles:user_id(full_name, email)
        `)
        .eq('status', 'requires_review')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching KYC requests:", error);
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Pending KYC Requests</h1>
            <KYCTable requests={requests || []} />
        </div>
    );
}
