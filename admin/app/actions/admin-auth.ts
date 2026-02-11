"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'sharkfunded_admin_secret_2026_secure_key';

export async function loginAdmin(formData: FormData) {
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString().trim();

    if (!email || !password) {
        return { error: "Email and password are required" };
    }

    try {
        const supabase = createAdminClient();

        // Direct query to admin_users table (Service Role bypasses RLS)
        const { data: user, error } = await supabase
            .from("admin_users")
            .select("id, email, full_name, role, password, permissions")
            .eq("email", email)
            .maybeSingle();

        if (error) {
            console.error("Database error during login:", error);
            return { error: `DB Error: ${error.message}` };
        }

        if (!user) {
            return { error: "Invalid credentials" };
        }

        // Verify hashed password
        const isPasswordValid = await bcrypt.compare(password, user.password);

        // TEMPORARY: Also allow plain text comparison for legacy users until they reset or we migrate them
        // This is to prevent lockout immediately after this change.
        // Once all users are migrated, we should remove this fallback.
        const isPlainTextValid = password === user.password;

        if (!isPasswordValid && !isPlainTextValid) {
            return { error: "Invalid credentials" };
        }

        // Generate a secure JWT
        const token = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role || 'admin',
                permissions: user.permissions || []
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        // Set a secure session cookie
        const cookieStore = await cookies();
        cookieStore.set("admin_session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24, // 1 day
            path: "/",
            sameSite: "lax"
        });

        // Set admin email cookie for frontend headers (used by AuditLogger)
        cookieStore.set("admin_email", user.email, {
            httpOnly: false, // Accessible by client-side actions if needed, but safe
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24,
            path: "/",
            sameSite: "lax"
        });

        return { success: true };
    } catch (e: any) {
        console.error("CRITICAL LOGIN ERROR:", e);
        return { error: `Critical Error: ${e.message}` };
    }
}

export async function logoutAdmin() {
    const cookieStore = await cookies();
    cookieStore.delete("admin_session");
    cookieStore.delete("admin_email");
    redirect("/login");
}
