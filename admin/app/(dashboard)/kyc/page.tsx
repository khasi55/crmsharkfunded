import { fetchWithAuth } from "@/utils/fetch-with-auth";
import { KYCTable } from "@/components/admin/kyc/KYCTable";

export default async function AdminKYCPage() {
    let requests = [];
    try {
        const response = await fetchWithAuth(`/api/kyc/admin`, {
            cache: 'no-store'
        });

        if (response.ok) {
            const data = await response.json();
            requests = data.sessions || []; // Backend returns { sessions: [...] }
        } else {
            console.error('Failed to fetch KYC requests from backend:', response.statusText);
        }
    } catch (e) {
        console.error('Error in AdminKYCPage fetch:', e);
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Pending KYC Requests</h1>
            <KYCTable requests={requests} />
        </div>
    );
}
