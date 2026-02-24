"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { verify } from "otplib";

const JWT_SECRET = process.env.JWT_SECRET || 'shark_admin_session_secure_2026_k8s_prod_v1';

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
            .select("id, email, full_name, role, password, permissions, is_two_factor_enabled, is_webauthn_enabled, two_factor_secret, webauthn_credentials")
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

        // Check if 2FA is enabled
        const is2FAEnabled = !!(user.is_two_factor_enabled || user.is_webauthn_enabled);

        // Generate a temporary short-lived token (5 mins) to verify 2FA or handle Setup
        const tempToken = jwt.sign(
            { id: user.id, purpose: '2fa_verification' },
            JWT_SECRET,
            { expiresIn: '5m' }
        );

        if (is2FAEnabled) {
            return {
                requires2FA: true,
                tempToken,
                methods: {
                    totp: !!user.is_two_factor_enabled,
                    webauthn: !!user.is_webauthn_enabled
                }
            };
        } else {
            // Force 2FA Setup
            return {
                requires2FASetup: true,
                tempToken,
                email: user.email // Pass email for TOTP label
            };
        }

        return { success: true };
    } catch (e: any) {
        console.error("CRITICAL LOGIN ERROR:", e);
        return { error: `Critical Error: ${e.message}` };
    }
}


export async function verifyTOTPLogin(tempToken: string, code: string) {
    try {
        const decoded = jwt.verify(tempToken, JWT_SECRET) as any;
        if (!decoded || decoded.purpose !== '2fa_verification') {
            return { error: "Invalid or expired session" };
        }

        const supabase = createAdminClient();
        const { data: user } = await supabase
            .from("admin_users")
            .select("id, email, full_name, role, permissions, two_factor_secret")
            .eq("id", decoded.id)
            .single();

        if (!user || !user.two_factor_secret) {
            return { error: "2FA not configured for this user" };
        }

        const isValid = await verify({
            token: code,
            secret: user.two_factor_secret
        }) as any;

        if (!isValid || !isValid.valid) {
            return { error: "Invalid 2FA code" };
        }

        return await establishAdminSession(user);
    } catch (e) {
        return { error: "Verification failed" };
    }
}

async function establishAdminSession(user: any) {
    const supabase = createAdminClient();

    // Fetch current tracking data to handle daily reset
    const { data: dbUser } = await supabase
        .from("admin_users")
        .select("daily_login_count, last_login_date")
        .eq("id", user.id)
        .single();

    const today = new Date().toISOString().split('T')[0];
    let newCount = 1;

    if (dbUser) {
        if (dbUser.last_login_date === today) {
            newCount = (dbUser.daily_login_count || 0) + 1;
        }
    }

    // Update tracking data
    await supabase
        .from("admin_users")
        .update({
            last_seen: new Date().toISOString(),
            daily_login_count: newCount,
            last_login_date: today
        })
        .eq("id", user.id);

    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role || 'admin',
            full_name: user.full_name,
            permissions: user.permissions || []
        },
        JWT_SECRET,
        { expiresIn: '90m' }
    );

    const cookieStore = await cookies();
    cookieStore.set("admin_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 90, // 90 minutes
        path: "/",
        sameSite: "lax"
    });

    cookieStore.set("admin_email", user.email, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 90, // 90 minutes
        path: "/",
        sameSite: "lax"
    });

    return { success: true };
}

export async function logoutAdmin() {
    const cookieStore = await cookies();
    cookieStore.delete("admin_session");
    cookieStore.delete("admin_email");
    redirect("/login"); // Updated to match relative path in middleware
}
