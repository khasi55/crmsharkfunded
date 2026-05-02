"use server";

import { createAdminClient } from "@/utils/supabase/admin";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { verify } from "otplib";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error("CRITICAL: JWT_SECRET environment variable is missing!");
}

export async function loginAdmin(formData: FormData) {
    const email = formData.get("email")?.toString().trim();
    console.log(`[MOCK LOGIN] Admin attempt: ${email}`);

    const cookieStore = await cookies();
    const token = "mock-admin-token";
    
    cookieStore.set("admin_session", token, {
        httpOnly: true,
        secure: false,
        maxAge: 60 * 90,
        path: "/",
        sameSite: "lax"
    });

    cookieStore.set("admin_email", email || "admin@sharkfunded.com", {
        httpOnly: false,
        secure: false,
        maxAge: 60 * 90,
        path: "/",
        sameSite: "lax"
    });

    return { success: true };
}

export async function verifyTOTPLogin(tempToken: string, code: string) {
    return { success: true };
}

async function establishAdminSession(user: any) {
    return { success: true };
}

export async function logoutAdmin() {
    const cookieStore = await cookies();
    cookieStore.delete("admin_session");
    cookieStore.delete("admin_email");
    redirect("/login"); // Updated to match relative path in middleware
}
