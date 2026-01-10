import { createAdminClient } from "@/utils/supabase/admin";
import AccountAssignmentForm from "@/components/admin/AccountAssignmentForm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function AssignAccountPage() {
    // We now use server-side search in the form component
    const users: any[] = [];

    return (
        <div className="space-y-6">
            <Link
                href="/admin/mt5"
                className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
            >
                <ArrowLeft className="h-4 w-4" />
                Back to MT5 Accounts
            </Link>

            <div>
                <h1 className="text-2xl font-semibold text-gray-900">Assign New MT5 Account</h1>
                <p className="text-sm text-gray-600 mt-1">Create and assign a new trading account to a user</p>
            </div>

            <AccountAssignmentForm users={users || []} />
        </div>
    );
}
