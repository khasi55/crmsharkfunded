import { DeveloperSettingsClient } from "./DeveloperSettingsClient";

export default function DeveloperSettingsPage() {
    return (
        <div className="p-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Developer Settings</h1>
                <p className="text-gray-500">Manage internal API configurations and environment variables.</p>
            </div>
            <DeveloperSettingsClient />
        </div>
    );
}
