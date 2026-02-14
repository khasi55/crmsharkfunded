import { SecuritySettingsClient } from "./SecuritySettingsClient";

export default function SecuritySettingsPage() {
    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Security Settings</h1>
                <p className="text-gray-500">Manage your account security and two-factor authentication.</p>
            </div>
            <SecuritySettingsClient />
        </div>
    );
}
