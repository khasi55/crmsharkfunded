import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'sharkfunded_admin_secret_2026_secure_key';

export async function getAdminUser() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("admin_session")?.value;

        if (!token) {
            return null;
        }

        // Verify and decode JWT
        const decoded = jwt.verify(token, JWT_SECRET) as any;

        if (!decoded || !decoded.id) {
            return null;
        }

        // Return user info from token (avoids unnecessary DB hit)
        return {
            id: decoded.id,
            email: decoded.email,
            role: decoded.role || 'admin',
            full_name: decoded.full_name || decoded.email?.split('@')[0] || 'Admin',
            permissions: decoded.permissions || []
        };
    } catch (error) {
        console.error("getAdminUser error:", error);
        return null;
    }
}
