import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key-123';

export async function getAdminUser() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("admin_session")?.value;

        if (!token) {
            return null;
        }

        // Return mock admin user for demo
        return {
            id: 'demo-admin-id',
            email: 'admin@sharkfunded.com',
            role: 'super_admin',
            full_name: 'SharkFunded Admin',
            permissions: ['*'] // Full access for demo
        };
    } catch (error) {
        console.error("getAdminUser error:", error);
        return null;
    }
}
