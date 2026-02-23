"use server";

import { PaymentSettingsClient } from "./PaymentSettingsClient";

export default async function PaymentSettingsPage() {
    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-500">Manage your system settings and configurations.</p>
            </div>
            <PaymentSettingsClient />
        </div>
    );
}
